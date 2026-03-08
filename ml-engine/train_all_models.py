# ml-engine/train_all_models.py
import logging
from pathlib import Path
import sys

# Không cần sys.path nữa nếu đã có __init__.py
from data.data_query import get_real_data
from features.feature_engineer import engineer_features
from models.train_xgboost import train_with_real_data
from models.train_lstm import train_lstm_model, prepare_time_series_data
from models.ensemble_model import train_ensemble_model

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    logger.info("🚀 Starting comprehensive ML model training...")
    
    try:
        crime_df, requests_df = get_real_data()
        if len(crime_df) == 0:
            raise ValueError("No crime data! Run ETL first.")
        
        feature_df = engineer_features(crime_df, requests_df)
        
        # Train XGBoost
        train_with_real_data("models/xgb_model.pkl")
        
        # Train LSTM
        sequences, targets, scaler = prepare_time_series_data(crime_df)
        if len(sequences) > 0:
            train_lstm_model(sequences, targets, scaler, "models/lstm_weights.pt")
        
        # Train Ensemble
        train_ensemble_model(feature_df)
        
        logger.info("🎉 ALL MODELS TRAINED SUCCESSFULLY!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Training failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
