#!/usr/bin/env python3
"""
ML Engine Training Script
Trains XGBoost model with SHAP explainability for Montgomery Guardian
"""

import sys
import os
from pathlib import Path

# Add current directory to Python path
sys.path.append(str(Path(__file__).parent))

from features.feature_engineer import engineer_features, generate_mock_data
from models.train_xgboost import train_with_mock_data
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Main training function"""
    logger.info("🚀 Starting ML model training for Montgomery Guardian...")
    
    try:
        # Train model with mock data
        model_data = train_with_mock_data()
        
        logger.info("✅ Model training completed successfully!")
        logger.info(f"Model features: {model_data['feature_cols']}")
        logger.info(f"Model accuracy: {model_data['accuracy']:.4f}")
        logger.info(f"Cross-validation scores: {model_data['cv_scores']}")
        
        # Print feature importance
        logger.info("Top 5 Important Features:")
        for feature in model_data['feature_importance'][:5]:
            logger.info(f"  {feature['feature']}: {feature['importance']:.4f}")
        
        logger.info("🎯 Model saved to ml-engine/models/xgb_model.pkl")
        logger.info("📊 Feature importance plot saved to ml-engine/models/feature_importance.png")
        
    except Exception as e:
        logger.error(f"❌ Training failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
