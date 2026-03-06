# ml-engine/data/data_query.py
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from typing import Tuple, Dict, Any
import logging
from datetime import datetime, timedelta
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_database_url() -> str:
    """Get database URL from environment or default to PostgreSQL"""
    # Check if running from backend directory structure
    if os.path.exists('../../backend/api/core/config.py'):
        import sys
        sys.path.append('../../backend')
        from api.core.config import settings
        return settings.database_url
    else:
        # Default PostgreSQL connection
        return os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/montgomery_guardian')

def query_crime_data(engine) -> pd.DataFrame:
    """Query crime incidents from PostGIS database"""
    logger.info("Querying crime incidents data...")
    
    query = """
    SELECT 
        objectid,
        crimetype,
        latitude,
        longitude,
        neighborhood,
        incidentdate,
        status,
        description
    FROM crime_incidents 
    WHERE incidentdate >= CURRENT_DATE - INTERVAL '90 days'
    ORDER BY incidentdate DESC
    """
    
    try:
        df = pd.read_sql(query, engine)
        logger.info(f"✅ Retrieved {len(df)} crime records")
        
        # Convert timestamp columns
        df['incidentdate'] = pd.to_datetime(df['incidentdate'])
        
        # Add derived columns
        df['year'] = df['incidentdate'].dt.year
        df['month'] = df['incidentdate'].dt.month
        df['day'] = df['incidentdate'].dt.day
        df['hour'] = df['incidentdate'].dt.hour
        df['day_of_week'] = df['incidentdate'].dt.dayofweek
        
        return df
    except Exception as e:
        logger.error(f"❌ Failed to query crime data: {e}")
        return pd.DataFrame()

def query_311_data(engine) -> pd.DataFrame:
    """Query 311 service requests from PostGIS database"""
    logger.info("Querying 311 service requests data...")
    
    query = """
    SELECT 
        objectid,
        servicetype,
        latitude,
        longitude,
        address,
        datecreated,
        datemodified,
        status,
        description,
        estimatedresolution
    FROM service_requests_311 
    WHERE datecreated >= CURRENT_DATE - INTERVAL '90 days'
    ORDER BY datecreated DESC
    """
    
    try:
        df = pd.read_sql(query, engine)
        logger.info(f"✅ Retrieved {len(df)} 311 service request records")
        
        # Convert timestamp columns
        df['datecreated'] = pd.to_datetime(df['datecreated'])
        if 'datemodified' in df.columns:
            df['datemodified'] = pd.to_datetime(df['datemodified'])
        
        # Add derived columns
        df['year'] = df['datecreated'].dt.year
        df['month'] = df['datecreated'].dt.month
        df['day'] = df['datecreated'].dt.day
        df['hour'] = df['datecreated'].dt.hour
        df['day_of_week'] = df['datecreated'].dt.dayofweek
        
        return df
    except Exception as e:
        logger.error(f"❌ Failed to query 311 data: {e}")
        return pd.DataFrame()

def validate_data(crime_df: pd.DataFrame, requests_df: pd.DataFrame) -> bool:
    """Validate loaded data"""
    logger.info("Validating data...")
    
    # Check minimum data requirements
    if len(crime_df) < 50:
        logger.warning(f"⚠️ Low crime data count: {len(crime_df)} records")
    
    if len(requests_df) < 50:
        logger.warning(f"⚠️ Low 311 data count: {len(requests_df)} records")
    
    # Check required columns
    required_crime_cols = ['crimetype', 'latitude', 'longitude', 'incidentdate']
    missing_crime_cols = [col for col in required_crime_cols if col not in crime_df.columns]
    if missing_crime_cols:
        logger.error(f"❌ Missing crime columns: {missing_crime_cols}")
        return False
    
    required_request_cols = ['servicetype', 'latitude', 'longitude', 'datecreated']
    missing_request_cols = [col for col in required_request_cols if col not in requests_df.columns]
    if missing_request_cols:
        logger.error(f"❌ Missing request columns: {missing_request_cols}")
        return False
    
    # Check for valid coordinates
    invalid_crime_coords = crime_df[(crime_df['latitude'].isna()) | (crime_df['longitude'].isna())]
    if len(invalid_crime_coords) > 0:
        logger.warning(f"⚠️ Found {len(invalid_crime_coords)} crime records with invalid coordinates")
    
    invalid_request_coords = requests_df[(requests_df['latitude'].isna()) | (requests_df['longitude'].isna())]
    if len(invalid_request_coords) > 0:
        logger.warning(f"⚠️ Found {len(invalid_request_coords)} request records with invalid coordinates")
    
    logger.info("✅ Data validation completed")
    return True

def get_real_data() -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Main function to get real data from PostGIS database
    Returns: (crime_df, requests_df)
    """
    logger.info("Starting real data extraction...")
    
    # Get database connection
    database_url = get_database_url()
    logger.info(f"Connecting to database: {database_url.split('@')[-1]}...")
    
    try:
        engine = create_engine(database_url)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info("✅ Database connection successful")
        
        # Query data
        crime_df = query_crime_data(engine)
        requests_df = query_311_data(engine)
        
        # Validate data
        if not validate_data(crime_df, requests_df):
            raise ValueError("Data validation failed")
        
        logger.info(f"✅ Successfully retrieved real data:")
        logger.info(f"   - Crime incidents: {len(crime_df)} records")
        logger.info(f"   - 311 requests: {len(requests_df)} records")
        logger.info(f"   - Date range: {crime_df['incidentdate'].min()} to {crime_df['incidentdate'].max()}")
        
        return crime_df, requests_df
        
    except Exception as e:
        logger.error(f"❌ Failed to get real data: {e}")
        raise

def get_data_summary(crime_df: pd.DataFrame, requests_df: pd.DataFrame) -> Dict[str, Any]:
    """Generate data summary statistics"""
    summary = {
        'crime_data': {
            'total_records': len(crime_df),
            'date_range': {
                'start': crime_df['incidentdate'].min().isoformat() if len(crime_df) > 0 else None,
                'end': crime_df['incidentdate'].max().isoformat() if len(crime_df) > 0 else None
            },
            'crime_types': crime_df['crimetype'].value_counts().to_dict() if len(crime_df) > 0 else {},
            'neighborhoods': crime_df['neighborhood'].value_counts().head(10).to_dict() if len(crime_df) > 0 else {}
        },
        'requests_data': {
            'total_records': len(requests_df),
            'date_range': {
                'start': requests_df['datecreated'].min().isoformat() if len(requests_df) > 0 else None,
                'end': requests_df['datecreated'].max().isoformat() if len(requests_df) > 0 else None
            },
            'service_types': requests_df['servicetype'].value_counts().to_dict() if len(requests_df) > 0 else {}
        }
    }
    
    return summary

if __name__ == "__main__":
    # Test data retrieval
    try:
        crime_df, requests_df = get_real_data()
        summary = get_data_summary(crime_df, requests_df)
        
        print("\n📊 Data Summary:")
        print(f"Crime incidents: {summary['crime_data']['total_records']} records")
        print(f"311 requests: {summary['requests_data']['total_records']} records")
        print(f"Crime types: {list(summary['crime_data']['crime_types'].keys())[:5]}...")
        print(f"Service types: {list(summary['requests_data']['service_types'].keys())[:5]}...")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure PostgreSQL is running and contains data.")
