# backend/etl/crime_etl.py
import asyncio
import pandas as pd
import orjson
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy.dialects.postgresql import insert

from api.core.database import SessionLocal
from api.core.redis import redis_client
from api.models.crime import CrimeIncident
from .arcgis_client import fetch_arcgis_dataset

# Khởi tạo ThreadPool cho các tác vụ Blocking (SQL/Pandas)
cpu_pool = ThreadPoolExecutor(max_workers=4)
db_pool = ThreadPoolExecutor(max_workers=4)

class CrimeETL:
    def __init__(self):
        self.redis_key = "crime_data_cache"
        self.cache_ttl = 3600

    async def run_etl(self):
        try:
            print("🔄 [Crime ETL] Initializing Pipeline...")
            loop = asyncio.get_running_loop()
            
            # 1. Async I/O: Extract
            raw_data = await self.extract_crime_data()
            
            # 2. CPU Bound: Transform -> Đẩy vào ThreadPool
            transformed_df = await loop.run_in_executor(
                cpu_pool, self.transform_crime_data, raw_data
            )
            
            # Chuẩn bị records
            records = self._prepare_records_for_db(transformed_df)
            
            # 3. Blocking I/O: Load DB -> Đẩy vào ThreadPool
            if records:
                await loop.run_in_executor(db_pool, self._sync_db_upsert, records)
            
            # 4. Async I/O: Load Redis
            await self._async_redis_cache(records)
            
            print("✅ [Crime ETL] Pipeline Completed Successfully")
            
        except Exception as e:
            print(f"❌ [Crime ETL] FATAL ERROR: {e}")
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

    def _prepare_records_for_db(self, df: pd.DataFrame) -> list:
        """Hàm đồng bộ chạy trong CPU Pool"""
        records = []
        for _, row in df.iterrows():
            record = {
                "objectid": int(row['id']),
                "crimetype": row['type'],
                "latitude": float(row['latitude']),
                "longitude": float(row['longitude']),
                "neighborhood": str(row['neighborhood']) if pd.notna(row['neighborhood']) else None,
                "incidentdate": row['timestamp'],
                "status": row['status'],
                "description": str(row['description']) if pd.notna(row['description']) else None,
                "geom": f"SRID=4326;POINT({row['longitude']} {row['latitude']})"
            }
            records.append(record)
        return records

    def _sync_db_upsert(self, records: list):
        """Hàm đồng bộ chạy trong DB Pool (Chặn Thread, không chặn Event Loop)"""
        with SessionLocal() as db:
            try:
                stmt = insert(CrimeIncident).values(records)
                update_stmt = stmt.on_conflict_do_update(
                    index_elements=['objectid'],
                    set_={
                        "status": stmt.excluded.status,
                        "description": stmt.excluded.description,
                    }
                )
                db.execute(update_stmt)
                db.commit()
                print(f"💾 DB: Bulk UPSERT executed for {len(records)} records")
            except Exception as e:
                db.rollback()
                raise e

    async def _async_redis_cache(self, records: list):
        """Hàm thuần Async, chạy thẳng trên Event Loop"""
        data_json = orjson.dumps(records).decode('utf-8')
        await redis_client.setex(self.redis_key, self.cache_ttl, data_json)
        
        metadata = {
            'last_updated': datetime.now().isoformat(),
            'record_count': len(records),
            'source': 'arcgis'
        }
        await redis_client.setex(
            f"{self.redis_key}_metadata", 
            self.cache_ttl, 
            orjson.dumps(metadata).decode('utf-8')
        )

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
