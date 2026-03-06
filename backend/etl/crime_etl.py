# backend/etl/crime_etl.py
import asyncio
import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from api.core.database import SessionLocal
from api.core.redis import redis_client
from .arcgis_client import fetch_arcgis_dataset

class CrimeETL:
    def __init__(self):
        self.redis_key = "crime_data_cache"
        self.cache_ttl = 3600  # 1 hour

    async def run_etl(self):
        """Run the complete ETL process for crime data"""
        try:
            print("🔄 Starting crime data ETL process...")
            
            # Extract data from ArcGIS
            raw_data = await self.extract_crime_data()
            
            # Transform data
            transformed_data = self.transform_crime_data(raw_data)
            
            # Load data (cache in Redis for now, could load to database)
            await self.load_crime_data(transformed_data)
            
            print("✅ Crime data ETL completed successfully")
            
        except Exception as e:
            print(f"❌ Crime ETL failed: {e}")
            raise

    async def extract_crime_data(self) -> pd.DataFrame:
        """Extract crime data from ArcGIS"""
        print("📥 Extracting crime data from ArcGIS...")
        
        # Get data from last 30 days
        thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        where_clause = f"incidentdate >= '{thirty_days_ago}'"
        
        df = await fetch_arcgis_dataset(
            dataset="crime_mapping",
            where=where_clause,
            result_record_count=5000
        )
        
        print(f"📊 Extracted {len(df)} crime records")
        return df

    def transform_crime_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform raw crime data into standardized format"""
        print("🔄 Transforming crime data...")
        
        # Standardize column names
        column_mapping = {
            'objectid': 'id',
            'crimetype': 'type',
            'incidentdate': 'timestamp',
            'neighborhood': 'neighborhood',
            'latitude': 'latitude',
            'longitude': 'longitude',
            'status': 'status',
            'description': 'description'
        }
        
        # Select and rename columns
        available_columns = {k: v for k, v in column_mapping.items() if k in df.columns}
        transformed_df = df[available_columns.keys()].rename(columns=available_columns)
        
        # Clean and standardize data
        transformed_df = self._clean_crime_data(transformed_df)
        
        print(f"📊 Transformed {len(transformed_df)} crime records")
        return transformed_df

    def _clean_crime_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and standardize crime data"""
        # Ensure required fields exist
        required_fields = ['id', 'type', 'latitude', 'longitude', 'timestamp', 'status']
        for field in required_fields:
            if field not in df.columns:
                df[field] = None
        
        # Standardize crime types
        type_mapping = {
            'burglary': 'property',
            'theft': 'property',
            'larceny': 'property',
            'assault': 'violent',
            'homicide': 'violent',
            'robbery': 'violent',
            'drug': 'drug',
            'narcotics': 'drug',
            'possession': 'drug'
        }
        
        df['type'] = df['type'].str.lower().map(type_mapping).fillna('other')
        
        # Standardize status
        df['status'] = df['status'].str.lower().map({
            'closed': 'closed',
            'resolved': 'closed',
            'completed': 'closed',
            'open': 'open',
            'active': 'open',
            'investigating': 'investigating',
            'pending': 'investigating'
        }).fillna('open')
        
        # Clean coordinates
        df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
        df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
        
        # Remove records with invalid coordinates
        df = df.dropna(subset=['latitude', 'longitude'])
        df = df[(df['latitude'].between(32.0, 33.0)) & (df['longitude'].between(-87.0, -85.0))]
        
        # Clean neighborhood names
        df['neighborhood'] = df['neighborhood'].str.title().fillna('Unknown')
        
        # Parse timestamps
        df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce').fillna(datetime.now())
        
        return df

    async def load_crime_data(self, df: pd.DataFrame):
        """Load transformed data to cache and database"""
        print("💾 Loading crime data to database and cache...")
        
        try:
            # 1. Store in Database
            db = SessionLocal()
            try:
                from api.models.crime import CrimeIncident
                
                records_added = 0
                records_updated = 0
                
                for _, row in df.iterrows():
                    existing = db.query(CrimeIncident).filter(CrimeIncident.objectid == int(row['id'])).first()
                    
                    if existing:
                        existing.status = row['status']
                        existing.description = str(row['description']) if pd.notna(row['description']) else None
                        records_updated += 1
                    else:
                        incident = CrimeIncident(
                            objectid=int(row['id']),
                            crimetype=row['type'],
                            latitude=float(row['latitude']),
                            longitude=float(row['longitude']),
                            neighborhood=str(row['neighborhood']) if pd.notna(row['neighborhood']) else None,
                            incidentdate=row['timestamp'],
                            status=row['status'],
                            description=str(row['description']) if pd.notna(row['description']) else None,
                            geom=f"SRID=4326;POINT({row['longitude']} {row['latitude']})"
                        )
                        db.add(incident)
                        records_added += 1
                
                db.commit()
                print(f"💾 DB: Added {records_added}, Updated {records_updated} crime records")
            except Exception as db_e:
                print(f"❌ DB Error: {db_e}")
                db.rollback()
            finally:
                db.close()

            # 2. Redis logic below
            # Convert to JSON for Redis storage
            data_json = df.to_json(orient='records', date_format='iso')
            
            # Store in Redis with TTL
            await redis_client.setex(
                self.redis_key,
                self.cache_ttl,
                data_json
            )
            
            # Also store metadata
            metadata = {
                'last_updated': datetime.now().isoformat(),
                'record_count': len(df),
                'source': 'arcgis'
            }
            await redis_client.setex(
                f"{self.redis_key}_metadata",
                self.cache_ttl,
                str(metadata)
            )
            
            print(f"💾 Cached {len(df)} crime records")
            
        except Exception as e:
            print(f"❌ Failed to cache/save crime data: {e}")
            raise

    async def get_cached_crime_data(self) -> pd.DataFrame:
        """Get cached crime data from Redis"""
        try:
            cached_data = await redis_client.get(self.redis_key)
            if cached_data:
                return pd.read_json(cached_data)
            return None
        except Exception as e:
            print(f"❌ Failed to get cached crime data: {e}")
            return None

# ETL runner function
async def run_crime_etl():
    """Run the crime ETL process"""
    etl = CrimeETL()
    await etl.run_etl()
