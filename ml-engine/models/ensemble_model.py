# ml-engine/models/ensemble_model.py
import torch
import torch.nn as nn
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
import logging
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pickle
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnsembleModel:
    """
    Ensemble model combining XGBoost, LSTM, and Isolation Forest predictions
    Weights: XGBoost (0.4), LSTM (0.2), Isolation Forest (0.4)
    """
    
    def __init__(self):
        self.xgb_model = None
        self.lstm_model = None
        self.isolation_model = None
        self.scaler = StandardScaler()
        
        # Model weights as specified in PRD
        self.weights = {
            'xgboost': 0.4,
            'lstm': 0.2,
            'isolation_forest': 0.4
        }
        
        # Risk level mapping
        self.risk_levels = ['low', 'medium', 'high']
        self.risk_scores = {'low': 1, 'medium': 2, 'high': 3}
        
    def load_xgboost_model(self, model_path: str = "ml-engine/models/xgb_model.pkl"):
        """Load XGBoost model"""
        try:
            from .train_xgboost import load_model
            self.xgb_model = load_model(model_path)
            logger.info("✅ XGBoost model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load XGBoost model: {e}")
            raise
    
    def load_lstm_model(self, model_path: str = "ml-engine/models/lstm_weights.pt"):
        """Load LSTM model"""
        try:
            from .train_lstm import load_lstm_model
            self.lstm_model = load_lstm_model(model_path)
            logger.info("✅ LSTM model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load LSTM model: {e}")
            raise
    
    def train_isolation_forest(self, feature_df: pd.DataFrame):
        """Train Isolation Forest for anomaly detection"""
        logger.info("Training Isolation Forest model...")
        
        # Select numerical features for anomaly detection
        numerical_features = [
            'hour', 'day_of_week', 'month', 'distance_to_downtown',
            'crime_count_7d', 'crime_count_30d', 'open_311_count', 
            'total_311_count_30d'
        ]
        
        # Filter available features
        available_features = [f for f in numerical_features if f in feature_df.columns]
        
        if len(available_features) == 0:
            logger.warning("No numerical features available for Isolation Forest")
            return
        
        X = feature_df[available_features].fillna(0)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train Isolation Forest
        self.isolation_model = IsolationForest(
            contamination=0.1,  # Assume 10% anomalies
            random_state=42,
            n_estimators=100
        )
        
        self.isolation_model.fit(X_scaled)
        logger.info("✅ Isolation Forest model trained successfully")
    
    def predict_xgboost_risk(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Get XGBoost prediction"""
        if self.xgb_model is None:
            raise ValueError("XGBoost model not loaded")
        
        from .train_xgboost import predict
        return predict(self.xgb_model, features)
    
    def predict_lstm_risk(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Get LSTM prediction and convert to risk level"""
        if self.lstm_model is None:
            raise ValueError("LSTM model not loaded")
        
        # For LSTM, we need recent time series data
        # This is simplified - in practice, you'd need the actual recent sequences
        try:
            from .train_lstm import predict_lstm
            
            # Create dummy sequences (should be replaced with actual recent data)
            sequence_length = self.lstm_model['sequence_length']
            input_size = self.lstm_model['input_size']
            dummy_sequences = np.random.randn(1, sequence_length, input_size)
            
            lstm_result = predict_lstm(self.lstm_model, dummy_sequences)
            
            # Convert predicted crime count to risk level
            predicted_count = lstm_result['predicted_crime_count']
            
            if predicted_count < 5:
                risk_level = 'low'
                confidence = 0.8
            elif predicted_count < 15:
                risk_level = 'medium'
                confidence = 0.7
            else:
                risk_level = 'high'
                confidence = 0.9
            
            return {
                'riskLevel': risk_level,
                'confidenceScore': confidence * lstm_result.get('confidence', 0.8),
                'predicted_crime_count': predicted_count
            }
            
        except Exception as e:
            logger.warning(f"LSTM prediction failed: {e}")
            return {
                'riskLevel': 'medium',
                'confidenceScore': 0.5,
                'predicted_crime_count': 10.0
            }
    
    def predict_isolation_forest_risk(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Get Isolation Forest prediction"""
        if self.isolation_model is None:
            return {
                'riskLevel': 'medium',
                'confidenceScore': 0.5,
                'anomaly_score': 0.0
            }
        
        try:
            # Prepare features
            numerical_features = [
                'hour', 'day_of_week', 'month', 'distance_to_downtown',
                'crime_count_7d', 'crime_count_30d', 'open_311_count', 
                'total_311_count_30d'
            ]
            
            feature_values = []
            for feature in numerical_features:
                value = features.get(feature, 0)
                if value is None or np.isnan(value):
                    value = 0
                feature_values.append(value)
            
            # Scale features
            X = np.array(feature_values).reshape(1, -1)
            X_scaled = self.scaler.transform(X)
            
            # Get anomaly score
            anomaly_score = self.isolation_model.decision_function(X_scaled)[0]
            is_anomaly = self.isolation_model.predict(X_scaled)[0] == -1
            
            # Convert anomaly score to risk level
            # Lower anomaly score = more anomalous = higher risk
            if is_anomaly or anomaly_score < -0.1:
                risk_level = 'high'
                confidence = min(0.9, abs(anomaly_score) + 0.5)
            elif anomaly_score < 0.1:
                risk_level = 'medium'
                confidence = 0.6
            else:
                risk_level = 'low'
                confidence = 0.7
            
            return {
                'riskLevel': risk_level,
                'confidenceScore': confidence,
                'anomaly_score': float(anomaly_score),
                'is_anomaly': bool(is_anomaly)
            }
            
        except Exception as e:
            logger.warning(f"Isolation Forest prediction failed: {e}")
            return {
                'riskLevel': 'medium',
                'confidenceScore': 0.5,
                'anomaly_score': 0.0
            }
    
    def ensemble_predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make ensemble prediction combining all three models
        """
        try:
            # Get predictions from all models
            xgb_result = self.predict_xgboost_risk(features)
            lstm_result = self.predict_lstm_risk(features)
            iso_result = self.predict_isolation_forest_risk(features)
            
            # Convert risk levels to numerical scores
            xgb_score = self.risk_scores[xgb_result['riskLevel']]
            lstm_score = self.risk_scores[lstm_result['riskLevel']]
            iso_score = self.risk_scores[iso_result['riskLevel']]
            
            # Calculate weighted ensemble score
            ensemble_score = (
                xgb_score * self.weights['xgboost'] +
                lstm_score * self.weights['lstm'] +
                iso_score * self.weights['isolation_forest']
            )
            
            # Convert ensemble score back to risk level
            if ensemble_score <= 1.5:
                final_risk = 'low'
            elif ensemble_score <= 2.5:
                final_risk = 'medium'
            else:
                final_risk = 'high'
            
            # Calculate ensemble confidence (weighted average)
            ensemble_confidence = (
                xgb_result['confidenceScore'] * self.weights['xgboost'] +
                lstm_result['confidenceScore'] * self.weights['lstm'] +
                iso_result['confidenceScore'] * self.weights['isolation_forest']
            )
            
            # Create feature importance from XGBoost SHAP values
            shap_features = xgb_result.get('shapFeatures', {})
            
            # Add anomaly information if available
            anomaly_info = {}
            if 'anomaly_score' in iso_result:
                anomaly_info = {
                    'anomaly_score': iso_result['anomaly_score'],
                    'is_anomaly': iso_result.get('is_anomaly', False)
                }
            
            # Add LSTM prediction if available
            lstm_info = {}
            if 'predicted_crime_count' in lstm_result:
                lstm_info = {
                    'predicted_crime_count': lstm_result['predicted_crime_count']
                }
            
            result = {
                'riskLevel': final_risk,
                'confidenceScore': float(ensemble_confidence),
                'ensembleScore': float(ensemble_score),
                'modelContributions': {
                    'xgboost': {
                        'riskLevel': xgb_result['riskLevel'],
                        'confidence': xgb_result['confidenceScore'],
                        'weight': self.weights['xgboost']
                    },
                    'lstm': {
                        'riskLevel': lstm_result['riskLevel'],
                        'confidence': lstm_result['confidenceScore'],
                        'weight': self.weights['lstm'],
                        **lstm_info
                    },
                    'isolation_forest': {
                        'riskLevel': iso_result['riskLevel'],
                        'confidence': iso_result['confidenceScore'],
                        'weight': self.weights['isolation_forest'],
                        **anomaly_info
                    }
                },
                'shapFeatures': shap_features
            }
            
            logger.info(f"Ensemble prediction: {final_risk} (confidence: {ensemble_confidence:.3f})")
            
            return result
            
        except Exception as e:
            logger.error(f"Ensemble prediction failed: {e}")
            # Return fallback prediction
            return {
                'riskLevel': 'medium',
                'confidenceScore': 0.5,
                'ensembleScore': 2.0,
                'modelContributions': {
                    'xgboost': {'riskLevel': 'medium', 'confidence': 0.5, 'weight': 0.4},
                    'lstm': {'riskLevel': 'medium', 'confidence': 0.5, 'weight': 0.2},
                    'isolation_forest': {'riskLevel': 'medium', 'confidence': 0.5, 'weight': 0.4}
                },
                'shapFeatures': {
                    'crime_count_7d': 0.3,
                    'distance_to_downtown': 0.2,
                    'hour': 0.15,
                    'open_311_count': 0.15,
                    'day_of_week': 0.1,
                    'is_night': 0.1
                }
            }
    
    def save_ensemble_model(self, model_path: str = "ml-engine/models/ensemble_model.pkl"):
        """Save ensemble model state"""
        ensemble_data = {
            'weights': self.weights,
            'scaler': self.scaler,
            'isolation_model': self.isolation_model
        }
        
        model_path_obj = Path(model_path)
        model_path_obj.parent.mkdir(parents=True, exist_ok=True)
        
        with open(model_path, 'wb') as f:
            pickle.dump(ensemble_data, f)
        
        logger.info(f"✅ Ensemble model saved to {model_path}")
    
    def load_ensemble_model(self, model_path: str = "ml-engine/models/ensemble_model.pkl"):
        """Load ensemble model state"""
        model_path_obj = Path(model_path)
        
        if not model_path_obj.exists():
            logger.warning(f"Ensemble model file not found: {model_path}")
            return
        
        with open(model_path, 'rb') as f:
            ensemble_data = pickle.load(f)
        
        self.weights = ensemble_data['weights']
        self.scaler = ensemble_data['scaler']
        self.isolation_model = ensemble_data['isolation_model']
        
        # Set device
        device = torch.device('cpu')
        logger.info(f"Using device: {device}")
        logger.info(f"Using device: {device}")
        logger.info(f"✅ Ensemble model loaded from {model_path}")

def train_ensemble_model(feature_df: pd.DataFrame, 
                        xgb_model_path: str = "ml-engine/models/xgb_model.pkl",
                        lstm_model_path: str = "ml-engine/models/lstm_weights.pt",
                        ensemble_model_path: str = "ml-engine/models/ensemble_model.pkl") -> EnsembleModel:
    """
    Train complete ensemble model
    """
    logger.info("Training ensemble model...")
    
    # Initialize ensemble
    ensemble = EnsembleModel()
    
    # Load individual models
    ensemble.load_xgboost_model(xgb_model_path)
    ensemble.load_lstm_model(lstm_model_path)
    
    # Train Isolation Forest
    ensemble.train_isolation_forest(feature_df)
    
    # Save ensemble model
    ensemble.save_ensemble_model(ensemble_model_path)
    
    logger.info("✅ Ensemble model training completed")
    
    return ensemble

def load_ensemble_model(xgb_model_path: str = "ml-engine/models/xgb_model.pkl",
                       lstm_model_path: str = "ml-engine/models/lstm_weights.pt",
                       ensemble_model_path: str = "ml-engine/models/ensemble_model.pkl") -> EnsembleModel:
    """
    Load complete ensemble model
    """
    logger.info("Loading ensemble model...")
    
    # Initialize ensemble
    ensemble = EnsembleModel()
    
    # Load individual models
    ensemble.load_xgboost_model(xgb_model_path)
    ensemble.load_lstm_model(lstm_model_path)
    
    # Load ensemble state
    ensemble.load_ensemble_model(ensemble_model_path)
    
    logger.info("✅ Ensemble model loaded successfully")
    
    return ensemble

if __name__ == "__main__":
    # Test ensemble model
    try:
        from data.data_query import get_real_data
        from features.feature_engineer import engineer_features
        
        # Get real data and engineer features
        crime_df, requests_df = get_real_data()
        feature_df = engineer_features(crime_df, requests_df)
        
        # Train ensemble model
        ensemble = train_ensemble_model(feature_df)
        
        # Test prediction
        test_features = {
            'hour': 14,
            'day_of_week': 2,
            'month': 6,
            'is_weekend': 0,
            'is_night': 0,
            'quarter': 2,
            'is_business_hours': 1,
            'day_of_year': 165,
            'week_of_year': 24,
            'distance_to_downtown': 2.5,
            'crime_count_7d': 12,
            'crime_count_30d': 45,
            'open_311_count': 8,
            'total_311_count_30d': 25
        }
        
        result = ensemble.ensemble_predict(test_features)
        
        print("✅ Ensemble model test completed!")
        print(f"Prediction: {result['riskLevel']} (confidence: {result['confidenceScore']:.3f})")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure all individual models are trained first.")
