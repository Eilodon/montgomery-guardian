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
    
    # Handle different timestamp column names
    if 'incidentdate' in df.columns:
        df['timestamp'] = pd.to_datetime(df['incidentdate'])
    elif 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
    else:
        raise ValueError("No timestamp column found (expected 'incidentdate' or 'timestamp')")
    
    df['hour'] = df['timestamp'].dt.hour

    # === CRIME TYPE FEATURES ===
    logger.info("Creating crime type features...")
    
    # Handle different crime type column names
    if 'crimetype' in df.columns:
        crime_type_col = 'crimetype'
    elif 'type' in df.columns:
        crime_type_col = 'type'
    else:
        raise ValueError("No crime type column found (expected 'crimetype' or 'type')")
    
    # Map crime types to categories
    def categorize_crime(crime_type):
        if pd.isna(crime_type):
            return 'other'
        crime_type = str(crime_type).lower()
        if any(word in crime_type for word in ['assault', 'robbery', 'homicide', 'violent']):
            return 'violent'
        elif any(word in crime_type for word in ['burglary', 'theft', 'larceny', 'property']):
            return 'property'
        elif any(word in crime_type for word in ['drug', 'narcotic', 'possession']):
            return 'drug'
        else:
            return 'other'
    
    df['crime_category'] = df[crime_type_col].apply(categorize_crime)
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
    
    # Pre-calculate rolling counts using a more robust method
    def get_rolling_count(group, window):
        # set_index with drop=False ensures 'timestamp' stays as a column if needed,
        # but for rolling(window) we need it as the index.
        return group.set_index('timestamp').rolling(window).count()['grid_id'].fillna(0).values

    # 7-day rolling count per grid cell
    df['crime_count_7d'] = df.groupby('grid_id', group_keys=False).apply(
        lambda x: x.set_index('timestamp').rolling('7D').count()['latitude'].fillna(0)
    ).values

    # 30-day rolling count per grid cell
    df['crime_count_30d'] = df.groupby('grid_id', group_keys=False).apply(
        lambda x: x.set_index('timestamp').rolling('30D').count()['latitude'].fillna(0)
    ).values
    
    # Crime type distribution per grid cell (Rolling 7D)
    crime_type_dummies = pd.get_dummies(df[crime_type_col], prefix='crime_type')
    dummy_cols = crime_type_dummies.columns
    df = pd.concat([df, crime_type_dummies], axis=1)
    
    for col in dummy_cols:
        df[col + '_7d'] = df.groupby('grid_id', group_keys=False).apply(
            lambda x: x.set_index('timestamp')[col].rolling('7D').sum().fillna(0)
        ).values

    # === 311 DENSITY FEATURE ===
    logger.info("Creating 311 density features...")
    if requests_df is not None and len(requests_df) > 0:
        requests_df = requests_df.copy()
        requests_df['grid_lat'] = (requests_df['latitude'] / grid_size).round() * grid_size
        requests_df['grid_lng'] = (requests_df['longitude'] / grid_size).round() * grid_size
        requests_df['grid_id'] = requests_df['grid_lat'].astype(str) + '_' + requests_df['grid_lng'].astype(str)
        
        # Detect status column value
        status_col = 'status'
        open_status = 'open'
        
        # Open 311 requests per grid cell
        open_mask = requests_df[status_col].str.lower().str.contains('open', na=False)
        requests_density = requests_df[open_mask].groupby('grid_id').size().reset_index(name='open_311_count')
        df = df.merge(requests_density, on='grid_id', how='left')
        df['open_311_count'] = df['open_311_count'].fillna(0)
        
        # Detect date column (DB uses datecreated, mock uses createdAt)
        date_col = 'datecreated' if 'datecreated' in requests_df.columns else 'createdAt'
        requests_df[date_col] = pd.to_datetime(requests_df[date_col])
        recent_requests = requests_df[
            requests_df[date_col] >= (requests_df[date_col].max() - pd.Timedelta(days=30))
        ]
        total_requests_density = recent_requests.groupby('grid_id').size().reset_index(name='total_311_count_30d')
        df = df.merge(total_requests_density, on='grid_id', how='left')
        df['total_311_count_30d'] = df['total_311_count_30d'].fillna(0)
        
        # Detect service type column
        service_type_col = 'servicetype' if 'servicetype' in requests_df.columns else 'serviceType'
        service_type_dummies = pd.get_dummies(requests_df[service_type_col], prefix='service_type')
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
    """ THỢ RÈN: Vectorized Grid Prediction """
    from .train_xgboost import predict_batch # Sẽ viết ở dưới
    
    min_lat, max_lat, min_lng, max_lng = grid_bounds
    grid_size = 0.0045
    
    # 1. Tạo ma trận Grid bằng Numpy (Không dùng for loop)
    lats = np.arange(min_lat, max_lat, grid_size)
    lngs = np.arange(min_lng, max_lng, grid_size)
    grid_lats, grid_lngs = np.meshgrid(lats, lngs)
    
    df_grid = pd.DataFrame({
        'latitude': grid_lats.flatten(),
        'longitude': grid_lngs.flatten()
    })
    
    current_time = pd.Timestamp.now()
    
    # 2. Vectorized Feature Assignment
    df_grid['gridCellId'] = df_grid['latitude'].astype(str) + '_' + df_grid['longitude'].astype(str)
    df_grid['hour'] = current_time.hour
    df_grid['day_of_week'] = current_time.dayofweek
    df_grid['month'] = current_time.month
    df_grid['is_weekend'] = int(current_time.dayofweek in [5, 6])
    df_grid['is_night'] = int(current_time.hour in range(20, 24))
    df_grid['quarter'] = current_time.quarter
    df_grid['is_business_hours'] = int(current_time.hour in range(9, 18))
    df_grid['day_of_year'] = current_time.dayofyear
    df_grid['week_of_year'] = current_time.isocalendar().week
    
    # Tính khoảng cách Vectorized
    df_grid['distance_to_downtown'] = np.sqrt(
        (df_grid['latitude'] - 32.3617)**2 + (df_grid['longitude'] - -86.2792)**2
    )
    
    # Fill các cột missing bằng 0 (Vectorized)
    feature_cols = model_data['feature_cols']
    for col in feature_cols:
        if col not in df_grid.columns:
            df_grid[col] = 0

    # 3. Batch Prediction
    predictions_df = predict_batch(model_data, df_grid[feature_cols])
    
    # 4. Merge kết quả
    result_df = pd.concat([df_grid[['gridCellId', 'latitude', 'longitude']], predictions_df], axis=1)
    result_df['generatedAt'] = current_time.isoformat()
    
    return result_df

def create_grid_predictions_ensemble(ensemble_model) -> pd.DataFrame:
    """
    Create risk predictions for all grid cells using ensemble model
    """
    from datetime import datetime
    logger.info("Creating ensemble predictions for Montgomery grid...")
    
    # Define Montgomery area bounds
    min_lat, max_lat = 32.3000, 32.4000
    min_lng, max_lng = -86.3500, -86.2000
    
    # Grid resolution (approximately 500m)
    grid_size = 0.0045
    
    predictions = []
    current_time = datetime.now()
    
    # Generate grid points
    grid_lat = min_lat
    while grid_lat <= max_lat:
        grid_lng = min_lng
        while grid_lng <= max_lng:
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
                'crime_count_7d': np.random.randint(0, 20),  # Would need real-time data
                'crime_count_30d': np.random.randint(0, 100),  # Would need real-time data
                'open_311_count': np.random.randint(0, 15),  # Would need real-time data
                'total_311_count_30d': np.random.randint(0, 50),  # Would need real-time data
            }
            
            try:
                prediction = ensemble_model.ensemble_predict(features)
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
                logger.warning(f"Failed ensemble prediction for grid {grid_lat}_{grid_lng}: {e}")
                continue
            
            grid_lng += grid_size
        grid_lat += grid_size
    
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
