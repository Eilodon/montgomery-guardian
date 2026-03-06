# ml-engine/features/feature_engineer.py
import pandas as pd
import numpy as np
import geopandas as gpd
from shapely.geometry import Point
from typing import Optional, Tuple
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def engineer_features(crime_df: pd.DataFrame, requests_df: Optional[pd.DataFrame] = None) -> pd.DataFrame:
    """
    Tạo feature matrix cho ML model.
    Input: raw crime + 311 dataframes từ ArcGIS
    Output: feature matrix sẵn sàng train
    """
    logger.info("Starting feature engineering...")
    
    # Make a copy to avoid modifying original data
    df = crime_df.copy()
    logger.info(f"Processing {len(df)} crime records")

    # === TEMPORAL FEATURES ===
    logger.info("Creating temporal features...")
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek  # 0=Mon, 6=Sun
    df['month'] = df['timestamp'].dt.month
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    df['is_night'] = df['hour'].isin(range(20, 24)).astype(int)
    df['quarter'] = df['timestamp'].dt.quarter
    
    # Additional temporal features
    df['is_business_hours'] = df['hour'].isin(range(9, 18)).astype(int)
    df['day_of_year'] = df['timestamp'].dt.dayofyear
    df['week_of_year'] = df['timestamp'].dt.isocalendar().week

    # === SPATIAL FEATURES ===
    logger.info("Creating spatial features...")
    # Grid cell assignment (500m x 500m approximately)
    # 1 degree latitude ≈ 111 km, 1 degree longitude ≈ 111 km * cos(latitude)
    # For Montgomery (lat ≈ 32.36°), 0.0045° ≈ 500m
    grid_size = 0.0045
    
    df['grid_lat'] = (df['latitude'] / grid_size).round() * grid_size
    df['grid_lng'] = (df['longitude'] / grid_size).round() * grid_size
    df['grid_id'] = df['grid_lat'].astype(str) + '_' + df['grid_lng'].astype(str)
    
    # Distance from downtown Montgomery (approximate center)
    downtown_lat, downtown_lng = 32.3617, -86.2792
    df['distance_to_downtown'] = np.sqrt(
        (df['latitude'] - downtown_lat)**2 + 
        (df['longitude'] - downtown_lng)**2
    )

    # === ROLLING CRIME HISTORY ===
    logger.info("Creating rolling crime history features...")
    df = df.sort_values('timestamp')
    
    # 7-day rolling count per grid cell
    df['crime_count_7d'] = (
        df.groupby('grid_id')
        .apply(lambda group: group.set_index('timestamp')['timestamp']
               .rolling('7D')
               .count()
               .fillna(0)
               .values)
        .reset_index(level=0, drop=True)
    )
    
    # 30-day rolling count per grid cell
    df['crime_count_30d'] = (
        df.groupby('grid_id')
        .apply(lambda group: group.set_index('timestamp')['timestamp']
               .rolling('30D')
               .count()
               .fillna(0)
               .values)
        .reset_index(level=0, drop=True)
    )
    
    # Crime type distribution per grid cell
    crime_type_dummies = pd.get_dummies(df['type'], prefix='crime_type')
    for col in crime_type_dummies.columns:
        df[col + '_7d'] = (
            df.groupby('grid_id')
            .apply(lambda group: (group.set_index('timestamp')[col]
                   .rolling('7D')
                   .sum()
                   .fillna(0)
                   .values))
            .reset_index(level=0, drop=True)
        )

    # === 311 DENSITY FEATURE ===
    logger.info("Creating 311 density features...")
    if requests_df is not None and len(requests_df) > 0:
        requests_df['grid_lat'] = (requests_df['latitude'] / grid_size).round() * grid_size
        requests_df['grid_lng'] = (requests_df['longitude'] / grid_size).round() * grid_size
        requests_df['grid_id'] = requests_df['grid_lat'].astype(str) + '_' + requests_df['grid_lng'].astype(str)
        
        # Open 311 requests per grid cell
        requests_density = requests_df[requests_df['status'] == 'open'].groupby('grid_id').size().reset_index(name='open_311_count')
        df = df.merge(requests_density, on='grid_id', how='left')
        df['open_311_count'] = df['open_311_count'].fillna(0)
        
        # Total 311 requests per grid cell (last 30 days)
        requests_df['createdAt'] = pd.to_datetime(requests_df['createdAt'])
        recent_requests = requests_df[
            requests_df['createdAt'] >= (requests_df['createdAt'].max() - pd.Timedelta(days=30))
        ]
        total_requests_density = recent_requests.groupby('grid_id').size().reset_index(name='total_311_count_30d')
        df = df.merge(total_requests_density, on='grid_id', how='left')
        df['total_311_count_30d'] = df['total_311_count_30d'].fillna(0)
        
        # Service type distribution
        service_type_dummies = pd.get_dummies(requests_df['serviceType'], prefix='service_type')
        for col in service_type_dummies.columns:
            service_density = service_type_dummies.groupby(requests_df['grid_id'])[col].sum().reset_index(name=col + '_count')
            df = df.merge(service_density, on='grid_id', how='left')
            df[col + '_count'] = df[col + '_count'].fillna(0)
    else:
        df['open_311_count'] = 0
        df['total_311_count_30d'] = 0
        # Add dummy service type columns with zeros
        for service_type in ['pothole', 'graffiti', 'trash', 'flooding', 'overgrown_grass', 'other']:
            df[f'service_type_{service_type}_count'] = 0

    # === TARGET VARIABLE ===
    logger.info("Creating target variable...")
    # Risk level per grid cell per day based on crime frequency
    grid_crime_counts = df.groupby('grid_id').size()
    df['risk_label'] = df['grid_id'].map(grid_crime_counts)
    
    # Create risk bins based on crime count distribution
    df['risk_label'] = pd.cut(
        df['risk_label'],
        bins=[0, 1, 3, 7, np.inf],
        labels=['low', 'medium', 'high', 'critical']
    )

    # === FEATURE SELECTION ===
    FEATURE_COLS = [
        # Temporal features
        'hour', 'day_of_week', 'month', 'is_weekend', 'is_night', 'quarter',
        'is_business_hours', 'day_of_year', 'week_of_year',
        
        # Spatial features
        'distance_to_downtown',
        
        # Crime history features
        'crime_count_7d', 'crime_count_30d',
        
        # 311 features
        'open_311_count', 'total_311_count_30d',
    ]
    
    # Add crime type features if they exist
    crime_type_cols = [col for col in df.columns if col.startswith('crime_type_') and col.endswith('_7d')]
    FEATURE_COLS.extend(crime_type_cols)
    
    # Add service type features if they exist
    service_type_cols = [col for col in df.columns if col.startswith('service_type_') and col.endswith('_count')]
    FEATURE_COLS.extend(service_type_cols)

    # Final dataset preparation
    result_df = df[FEATURE_COLS + ['grid_id', 'risk_label', 'latitude', 'longitude', 'timestamp']].copy()
    
    # Remove rows with missing values in critical columns
    result_df = result_df.dropna(subset=FEATURE_COLS)
    
    logger.info(f"Feature engineering completed. Final dataset shape: {result_df.shape}")
    logger.info(f"Risk distribution: {result_df['risk_label'].value_counts().to_dict()}")
    
    return result_df

def create_grid_predictions(model_data: dict, grid_bounds: Tuple[float, float, float, float] = (32.3, 32.4, -86.35, -86.2)) -> pd.DataFrame:
    """
    Create predictions for all grid cells in the specified bounds
    """
    from .train_xgboost import predict
    
    min_lat, max_lat, min_lng, max_lng = grid_bounds
    grid_size = 0.0045
    
    # Generate grid cells
    grid_lats = np.arange(min_lat, max_lat, grid_size)
    grid_lngs = np.arange(min_lng, max_lng, grid_size)
    
    predictions = []
    current_time = pd.Timestamp.now()
    
    for grid_lat in grid_lats:
        for grid_lng in grid_lngs:
            # Create features for this grid cell
            features = {
                'hour': current_time.hour,
                'day_of_week': current_time.dayofweek,
                'month': current_time.month,
                'is_weekend': int(current_time.dayofweek in [5, 6]),
                'is_night': int(current_time.hour in range(20, 24)),
                'quarter': current_time.quarter,
                'is_business_hours': int(current_time.hour in range(9, 18)),
                'day_of_year': current_time.dayofyear,
                'week_of_year': current_time.isocalendar().week,
                'distance_to_downtown': np.sqrt(
                    (grid_lat - 32.3617)**2 + (grid_lng - -86.2792)**2
                ),
                'crime_count_7d': 0,  # Would need real-time data
                'crime_count_30d': 0,  # Would need real-time data
                'open_311_count': 0,  # Would need real-time data
                'total_311_count_30d': 0,  # Would need real-time data
            }
            
            # Add crime type features (default to 0)
            for crime_type in ['violent', 'property', 'drug', 'other']:
                features[f'crime_type_{crime_type}_7d'] = 0
            
            # Add service type features (default to 0)
            for service_type in ['pothole', 'graffiti', 'trash', 'flooding', 'overgrown_grass', 'other']:
                features[f'service_type_{service_type}_count'] = 0
            
            try:
                prediction = predict(model_data, features)
                predictions.append({
                    'gridCellId': f"{grid_lat}_{grid_lng}",
                    'latitude': grid_lat,
                    'longitude': grid_lng,
                    'riskLevel': prediction['riskLevel'],
                    'confidenceScore': prediction['confidenceScore'],
                    'shapFeatures': prediction['shapFeatures'],
                    'generatedAt': current_time.isoformat()
                })
            except Exception as e:
                logger.warning(f"Failed to predict for grid {grid_lat}_{grid_lng}: {e}")
                continue
    
    return pd.DataFrame(predictions)

def generate_mock_data(n_samples: int = 1000) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Generate mock crime and 311 data for testing
    """
    np.random.seed(42)
    
    # Generate crime data
    crime_data = {
        'id': [f'crime_{i}' for i in range(n_samples)],
        'type': np.random.choice(['violent', 'property', 'drug', 'other'], n_samples, p=[0.2, 0.5, 0.2, 0.1]),
        'latitude': np.random.uniform(32.30, 32.40, n_samples),
        'longitude': np.random.uniform(-86.35, -86.20, n_samples),
        'neighborhood': np.random.choice(['Downtown', 'Capitol Heights', 'Oak Park', 'Garden District'], n_samples),
        'timestamp': pd.date_range('2024-01-01', periods=n_samples, freq='H'),
        'status': np.random.choice(['open', 'closed', 'investigating'], n_samples),
        'description': [f'Crime incident {i}' for i in range(n_samples)]
    }
    
    crime_df = pd.DataFrame(crime_data)
    
    # Generate 311 data
    requests_data = {
        'requestId': [f'req_{i}' for i in range(n_samples // 2)],
        'serviceType': np.random.choice(['pothole', 'graffiti', 'trash', 'flooding', 'overgrown_grass', 'other'], n_samples // 2),
        'status': np.random.choice(['open', 'in_progress', 'closed'], n_samples // 2),
        'latitude': np.random.uniform(32.30, 32.40, n_samples // 2),
        'longitude': np.random.uniform(-86.35, -86.20, n_samples // 2),
        'address': [f'{123 + i} Main St, Montgomery, AL' for i in range(n_samples // 2)],
        'createdAt': pd.date_range('2024-01-01', periods=n_samples // 2, freq='2H'),
        'updatedAt': pd.date_range('2024-01-01', periods=n_samples // 2, freq='2H') + pd.Timedelta(days=1),
        'description': [f'311 request {i}' for i in range(n_samples // 2)],
        'estimatedResolutionDays': np.random.randint(1, 8, n_samples // 2)
    }
    
    requests_df = pd.DataFrame(requests_data)
    
    return crime_df, requests_df
