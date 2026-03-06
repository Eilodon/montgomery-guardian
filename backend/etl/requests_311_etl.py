# backend/etl/requests_311_etl.py
import asyncio
import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from api.core.redis import redis_client
from .arcgis_client import fetch_arcgis_dataset

class Requests311ETL:
    def __init__(self):
        self.redis_key = "requests_311_data_cache"
        self.cache_ttl = 3600  # 1 hour

    async def run_etl(self):
        """Run the complete ETL process for 311 requests"""
        try:
            print("🔄 Starting 311 requests ETL process...")
            
            # Extract data from ArcGIS
            raw_data = await self.extract_requests_data()
            
            # Transform data
            transformed_data = self.transform_requests_data(raw_data)
            
            # Load data (cache in Redis for now, could load to database)
            await self.load_requests_data(transformed_data)
            
            print("✅ 311 requests ETL completed successfully")
            
        except Exception as e:
            print(f"❌ 311 requests ETL failed: {e}")
            raise

    async def extract_requests_data(self) -> pd.DataFrame:
        """Extract 311 requests data from ArcGIS"""
        print("📥 Extracting 311 requests from ArcGIS...")
        
        # Get data from last 30 days
        thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        where_clause = f"datecreated >= '{thirty_days_ago}'"
        
        df = await fetch_arcgis_dataset(
            dataset="requests_311",
            where=where_clause,
            result_record_count=5000
        )
        
        print(f"📊 Extracted {len(df)} 311 request records")
        return df

    def transform_requests_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform raw 311 requests data into standardized format"""
        print("🔄 Transforming 311 requests data...")
        
        # Standardize column names
        column_mapping = {
            'objectid': 'requestId',
            'servicetype': 'serviceType',
            'datecreated': 'createdAt',
            'datemodified': 'updatedAt',
            'address': 'address',
            'latitude': 'latitude',
            'longitude': 'longitude',
            'status': 'status',
            'description': 'description',
            'estimatedresolution': 'estimatedResolutionDays'
        }
        
        # Select and rename columns
        available_columns = {k: v for k, v in column_mapping.items() if k in df.columns}
        transformed_df = df[available_columns.keys()].rename(columns=available_columns)
        
        # Clean and standardize data
        transformed_df = self._clean_requests_data(transformed_df)
        
        print(f"📊 Transformed {len(transformed_df)} 311 request records")
        return transformed_df

    def _clean_requests_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and standardize 311 requests data"""
        # Ensure required fields exist
        required_fields = ['requestId', 'serviceType', 'latitude', 'longitude', 'createdAt', 'updatedAt', 'status']
        for field in required_fields:
            if field not in df.columns:
                df[field] = None
        
        # Standardize service types
        service_type_mapping = {
            'pothole': 'pothole',
            'street maintenance': 'pothole',
            'road repair': 'pothole',
            'graffiti': 'graffiti',
            'vandalism': 'graffiti',
            'tag removal': 'graffiti',
            'trash': 'trash',
            'garbage': 'trash',
            'waste': 'trash',
            'sanitation': 'trash',
            'flooding': 'flooding',
            'water': 'flooding',
            'drainage': 'flooding',
            'sewer': 'flooding',
            'overgrown grass': 'overgrown_grass',
            'vegetation': 'overgrown_grass',
            'lawn care': 'overgrown_grass',
            'weeds': 'overgrown_grass'
        }
        
        df['serviceType'] = df['serviceType'].str.lower().map(service_type_mapping).fillna('other')
        
        # Standardize status
        df['status'] = df['status'].str.lower().map({
            'closed': 'closed',
            'resolved': 'closed',
            'completed': 'closed',
            'open': 'open',
            'active': 'open',
            'received': 'open',
            'in progress': 'in_progress',
            'work in progress': 'in_progress',
            'assigned': 'in_progress',
            'investigating': 'in_progress'
        }).fillna('open')
        
        # Clean coordinates
        df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
        df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
        
        # Remove records with invalid coordinates
        df = df.dropna(subset=['latitude', 'longitude'])
        df = df[(df['latitude'].between(32.0, 33.0)) & (df['longitude'].between(-87.0, -85.0))]
        
        # Clean addresses
        df['address'] = df['address'].str.strip().fillna('Unknown Address')
        
        # Parse timestamps
        df['createdAt'] = pd.to_datetime(df['createdAt'], errors='coerce').fillna(datetime.now())
        df['updatedAt'] = pd.to_datetime(df['updatedAt'], errors='coerce').fillna(df['createdAt'])
        
        # Parse estimated resolution days
        df['estimatedResolutionDays'] = pd.to_numeric(
            df['estimatedResolutionDays'], 
            errors='coerce'
        ).fillna(3).astype(int)
        
        return df

    async def load_requests_data(self, df: pd.DataFrame):
        """Load transformed data to cache/database"""
        print("💾 Loading 311 requests data to cache...")
        
        try:
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
            
            print(f"💾 Cached {len(df)} 311 request records")
            
        except Exception as e:
            print(f"❌ Failed to cache 311 requests data: {e}")
            raise

    async def get_cached_requests_data(self) -> pd.DataFrame:
        """Get cached 311 requests data from Redis"""
        try:
            cached_data = await redis_client.get(self.redis_key)
            if cached_data:
                return pd.read_json(cached_data)
            return None
        except Exception as e:
            print(f"❌ Failed to get cached 311 requests data: {e}")
            return None

# ETL runner function
async def run_requests_311_etl():
    """Run the 311 requests ETL process"""
    etl = Requests311ETL()
    await etl.run_etl()
