# ml-engine/tests/test_ml_engine.py
import pytest
import pandas as pd
import numpy as np
from pathlib import Path
import sys
import os

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from features.feature_engineer import engineer_features, generate_mock_data
from models.train_xgboost import train_and_save, predict, load_model

class TestFeatureEngineering:
    def test_generate_mock_data(self):
        """Test mock data generation"""
        crime_df, requests_df = generate_mock_data(n_samples=100)
        
        assert len(crime_df) == 100
        assert len(requests_df) == 50
        assert 'type' in crime_df.columns
        assert 'serviceType' in requests_df.columns
        assert 'timestamp' in crime_df.columns
        assert 'createdAt' in requests_df.columns

    def test_feature_engineering(self):
        """Test feature engineering pipeline"""
        # Generate test data
        crime_df, requests_df = generate_mock_data(n_samples=200)
        
        # Engineer features
        feature_df = engineer_features(crime_df, requests_df)
        
        # Check required columns exist
        required_cols = [
            'hour', 'day_of_week', 'month', 'is_weekend', 'is_night',
            'crime_count_7d', 'open_311_count', 'risk_label', 'grid_id'
        ]
        
        for col in required_cols:
            assert col in feature_df.columns, f"Missing column: {col}"
        
        # Check data types
        assert feature_df['hour'].dtype in [np.int64, np.int32]
        assert feature_df['risk_label'].dtype == 'category'
        
        # Check no missing values in feature columns
        feature_cols = [col for col in feature_df.columns if col not in ['risk_label', 'grid_id', 'latitude', 'longitude', 'timestamp']]
        for col in feature_cols:
            assert not feature_df[col].isnull().any(), f"Column {col} has missing values"

    def test_feature_engineering_without_requests(self):
        """Test feature engineering without 311 data"""
        crime_df, _ = generate_mock_data(n_samples=100)
        
        feature_df = engineer_features(crime_df, None)
        
        assert 'open_311_count' in feature_df.columns
        assert (feature_df['open_311_count'] == 0).all()

class TestXGBoostModel:
    def test_model_training(self):
        """Test model training with mock data"""
        # Generate test data
        crime_df, requests_df = generate_mock_data(n_samples=500)
        feature_df = engineer_features(crime_df, requests_df)
        
        # Train model
        model_path = "test_model.pkl"
        model, explainer = train_and_save(feature_df, model_path)
        
        # Check model was created
        assert model is not None
        assert explainer is not None
        assert Path(model_path).exists()
        
        # Clean up
        Path(model_path).unlink(missing_ok=True)

    def test_model_prediction(self):
        """Test model prediction"""
        # Generate and train model
        crime_df, requests_df = generate_mock_data(n_samples=300)
        feature_df = engineer_features(crime_df, requests_df)
        
        model_path = "test_model.pkl"
        model, explainer = train_and_save(feature_df, model_path)
        
        # Load model data
        model_data = load_model(model_path)
        
        # Test prediction
        test_features = {
            'hour': 14,
            'day_of_week': 2,
            'month': 6,
            'is_weekend': 0,
            'is_night': 0,
            'quarter': 2,
            'is_business_hours': 1,
            'day_of_year': 150,
            'week_of_year': 22,
            'distance_to_downtown': 0.05,
            'crime_count_7d': 2,
            'crime_count_30d': 5,
            'open_311_count': 1,
            'total_311_count_30d': 3
        }
        
        prediction = predict(model_data, test_features)
        
        # Check prediction format
        assert 'riskLevel' in prediction
        assert 'confidenceScore' in prediction
        assert 'shapFeatures' in prediction
        
        assert prediction['riskLevel'] in ['low', 'medium', 'high', 'critical']
        assert 0 <= prediction['confidenceScore'] <= 1
        
        # Check SHAP features
        shap_features = prediction['shapFeatures']
        assert isinstance(shap_features, dict)
        assert len(shap_features) > 0
        
        # SHAP values should sum to approximately 1.0
        shap_sum = sum(shap_features.values())
        assert abs(shap_sum - 1.0) < 0.01, f"SHAP values sum to {shap_sum}, expected 1.0"
        
        # Clean up
        Path(model_path).unlink(missing_ok=True)

    def test_model_prediction_fallback(self):
        """Test model prediction fallback when features are missing"""
        # Generate and train model
        crime_df, requests_df = generate_mock_data(n_samples=200)
        feature_df = engineer_features(crime_df, requests_df)
        
        model_path = "test_model.pkl"
        model, explainer = train_and_save(feature_df, model_path)
        
        # Load model data
        model_data = load_model(model_path)
        
        # Test prediction with missing features
        test_features = {
            'hour': 14,
            'day_of_week': 2,
            # Missing other features
        }
        
        prediction = predict(model_data, test_features)
        
        # Should still return a valid prediction
        assert 'riskLevel' in prediction
        assert 'confidenceScore' in prediction
        assert 'shapFeatures' in prediction
        
        # Clean up
        Path(model_path).unlink(missing_ok=True)

class TestQualityGates:
    def test_training_time_limit(self):
        """Test that training completes within time limit"""
        import time
        
        # Generate test data
        crime_df, requests_df = generate_mock_data(n_samples=1000)
        feature_df = engineer_features(crime_df, requests_df)
        
        # Time the training
        start_time = time.time()
        model_path = "test_model_timing.pkl"
        model, explainer = train_and_save(feature_df, model_path)
        end_time = time.time()
        
        training_time = end_time - start_time
        
        # Should complete within 5 minutes (300 seconds)
        assert training_time < 300, f"Training took {training_time:.2f} seconds, expected < 300"
        
        # Clean up
        Path(model_path).unlink(missing_ok=True)

    def test_prediction_format(self):
        """Test prediction format matches API requirements"""
        # Generate and train model
        crime_df, requests_df = generate_mock_data(n_samples=200)
        feature_df = engineer_features(crime_df, requests_df)
        
        model_path = "test_model_format.pkl"
        model, explainer = train_and_save(feature_df, model_path)
        
        # Load model data
        model_data = load_model(model_path)
        
        # Test prediction
        test_features = {
            'hour': 14,
            'day_of_week': 2,
            'month': 6,
            'is_weekend': 0,
            'is_night': 0,
            'quarter': 2,
            'is_business_hours': 1,
            'day_of_year': 150,
            'week_of_year': 22,
            'distance_to_downtown': 0.05,
            'crime_count_7d': 2,
            'crime_count_30d': 5,
            'open_311_count': 1,
            'total_311_count_30d': 3
        }
        
        prediction = predict(model_data, test_features)
        
        # Check required fields
        required_fields = ['riskLevel', 'confidenceScore', 'shapFeatures']
        for field in required_fields:
            assert field in prediction, f"Missing field: {field}"
        
        # Check data types
        assert isinstance(prediction['riskLevel'], str)
        assert isinstance(prediction['confidenceScore'], (int, float))
        assert isinstance(prediction['shapFeatures'], dict)
        
        # Check value ranges
        assert prediction['riskLevel'] in ['low', 'medium', 'high', 'critical']
        assert 0 <= prediction['confidenceScore'] <= 1
        
        # Clean up
        Path(model_path).unlink(missing_ok=True)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
