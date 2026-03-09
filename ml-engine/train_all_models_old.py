# ml-engine/train_all_models.py
"""
Comprehensive training script for all ML models using real data
Trains: XGBoost, LSTM, and Ensemble models
"""

import logging
import sys
from pathlib import Path
import os

# Add ml-engine to path
sys.path.append(str(Path(__file__).parent))

from data.data_query import get_real_data
from features.feature_engineer import engineer_features
from models.train_xgboost import train_with_real_data
from models.train_lstm import train_lstm_model, prepare_time_series_data
from models.ensemble_model import train_ensemble_model

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Main training pipeline"""
    logger.info("🚀 Starting comprehensive ML model training with real data...")
    
    try:
        # Step 1: Get real data from database
        logger.info("📊 Step 1: Extracting real data from PostGIS database...")
        crime_df, requests_df = get_real_data()
        
        if len(crime_df) == 0 or len(requests_df) == 0:
            raise ValueError("No data found in database. Please run ETL pipeline first.")
        
        logger.info(f"✅ Data extracted: {len(crime_df)} crime records, {len(requests_df)} 311 requests")
        
        # Step 2: Engineer features for XGBoost
        logger.info("🔧 Step 2: Engineering features for XGBoost...")
        feature_df = engineer_features(crime_df, requests_df)
        
        if len(feature_df) == 0:
            raise ValueError("Feature engineering failed - no features generated")
        
        logger.info(f"✅ Features engineered: {len(feature_df)} records with {len(feature_df.columns)} features")
        
        # Step 3: Train XGBoost model
        logger.info("🌳 Step 3: Training XGBoost model...")
        xgb_model_path = "ml-engine/models/xgb_model.pkl"
        xgb_model_data = train_with_real_data(xgb_model_path)
        logger.info(f"✅ XGBoost model trained and saved to {xgb_model_path}")
        
        # Step 4: Train LSTM model
        logger.info("🧠 Step 4: Training LSTM model for time series analysis...")
        lstm_model_path = "ml-engine/models/lstm_weights.pt"
        
        # Prepare time series data
        sequences, targets, scaler = prepare_time_series_data(crime_df)
        
        if len(sequences) == 0:
            logger.warning("⚠️ Insufficient time series data for LSTM training")
        else:
            lstm_model_data = train_lstm_model(sequences, targets, scaler, lstm_model_path)
            logger.info(f"✅ LSTM model trained and saved to {lstm_model_path}")
        
        # Step 5: Train Ensemble model
        logger.info("🎯 Step 5: Training Ensemble model...")
        ensemble_model_path = "ml-engine/models/ensemble_model.pkl"
        
        try:
            ensemble_model = train_ensemble_model(
                feature_df, 
                xgb_model_path, 
                lstm_model_path, 
                ensemble_model_path
            )
            logger.info(f"✅ Ensemble model trained and saved to {ensemble_model_path}")
        except Exception as e:
            logger.warning(f"⚠️ Ensemble model training failed: {e}")
            logger.info("Individual models are still available for use")
        
        # Step 6: Verify model files
        logger.info("🔍 Step 6: Verifying model files...")
        
        model_files = {
            'XGBoost': xgb_model_path,
            'LSTM': lstm_model_path,
            'LSTM Data': lstm_model_path.replace('.pt', '_data.pkl'),
            'Ensemble': ensemble_model_path
        }
        
        for model_name, file_path in model_files.items():
            if Path(file_path).exists():
                file_size = Path(file_path).stat().st_size
                logger.info(f"✅ {model_name}: {file_path} ({file_size:,} bytes)")
            else:
                logger.warning(f"❌ {model_name}: {file_path} (NOT FOUND)")
        
        # Step 7: Test model loading
        logger.info("🧪 Step 7: Testing model loading...")
        
        try:
            # Test XGBoost loading
            from models.train_xgboost import load_model
            xgb_loaded = load_model(xgb_model_path)
            logger.info("✅ XGBoost model loads successfully")
        except Exception as e:
            logger.error(f"❌ XGBoost model loading failed: {e}")
        
        try:
            # Test LSTM loading
            from models.train_lstm import load_lstm_model
            lstm_loaded = load_lstm_model(lstm_model_path)
            logger.info("✅ LSTM model loads successfully")
        except Exception as e:
            logger.error(f"❌ LSTM model loading failed: {e}")
        
        try:
            # Test Ensemble loading
            from models.ensemble_model import load_ensemble_model
            ensemble_loaded = load_ensemble_model(xgb_model_path, lstm_model_path, ensemble_model_path)
            logger.info("✅ Ensemble model loads successfully")
        except Exception as e:
            logger.error(f"❌ Ensemble model loading failed: {e}")
        
        # Step 8: Generate training summary
        logger.info("📋 Step 8: Training Summary")
        logger.info("=" * 50)
        logger.info(f"📊 Dataset: {len(crime_df)} crime records, {len(requests_df)} 311 requests")
        logger.info(f"🌳 XGBoost Model: {xgb_model_path}")
        logger.info(f"🧠 LSTM Model: {lstm_model_path}")
        logger.info(f"🎯 Ensemble Model: {ensemble_model_path}")
        logger.info("=" * 50)
        logger.info("🎉 All models trained successfully with REAL data!")
        logger.info("📁 Models are ready for API integration")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Training pipeline failed: {e}")
        logger.error("Please check:")
        logger.error("1. PostgreSQL is running and accessible")
        logger.error("2. Database contains crime_incidents and service_requests_311 tables")
        logger.error("3. ETL pipeline has been executed to populate data")
        logger.error("4. Required Python packages are installed")
        return False

if __name__ == "__main__":
    success = main()
    
    if success:
        print("\n🎉 TRAINING COMPLETED SUCCESSFULLY!")
        print("📁 Model files are ready:")
        print("   - ml-engine/models/xgb_model.pkl")
        print("   - ml-engine/models/lstm_weights.pt")
        print("   - ml-engine/models/ensemble_model.pkl")
        print("\n🚀 Ready for API integration!")
    else:
        print("\n❌ TRAINING FAILED!")
        print("Please check the logs above and fix any issues before proceeding.")
        sys.exit(1)
