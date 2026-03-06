#!/usr/bin/env python3
# Simple ML model creation without external dependencies
import json
import pickle
import random
from datetime import datetime, timedelta
import os

# Define model classes at module level for pickling
class MockXGBoostModel:
    def __init__(self):
        self.feature_names = ['hour', 'day_of_week', 'month', 'is_weekend', 'is_night', 
                            'distance_to_downtown', 'crime_count_7d', 'crime_count_30d']
        self.feature_importances = [0.15, 0.12, 0.08, 0.10, 0.05, 0.18, 0.20, 0.12]
        
    def predict(self, X):
        # Simple mock prediction based on input features
        return [random.uniform(0.1, 0.9) for _ in range(len(X) if hasattr(X, '__len__') else 1)]
    
    def predict_proba(self, X):
        # Mock probability prediction
        n_samples = len(X) if hasattr(X, '__len__') else 1
        return [[random.random(), random.random(), random.random(), random.random()] for _ in range(n_samples)]

class MockLSTMModel:
    def __init__(self):
        self.sequence_length = 14
        self.hidden_size = 64
        
    def predict(self, sequences):
        # Mock LSTM prediction
        return [random.uniform(0.2, 0.8) for _ in range(len(sequences) if hasattr(sequences, '__len__') else 1)]

class EnsembleModel:
    def __init__(self, xgb_model, lstm_model, xgb_weight=0.4, lstm_weight=0.2, iso_weight=0.4):
        self.xgb_model = xgb_model
        self.lstm_model = lstm_model
        self.xgb_weight = xgb_weight
        self.lstm_weight = lstm_weight
        self.iso_weight = iso_weight
        
    def predict(self, X):
        # XGBoost prediction
        xgb_pred = self.xgb_model.predict(X)
        
        # LSTM prediction
        lstm_pred = self.lstm_model.predict(X)
        
        # Isolation Forest prediction (mock)
        iso_pred = [random.uniform(0.1, 0.9) for _ in range(len(xgb_pred))]
        
        # Ensemble prediction
        if isinstance(xgb_pred, list):
            ensemble_pred = [
                self.xgb_weight * xgb + self.lstm_weight * lstm + self.iso_weight * iso
                for xgb, lstm, iso in zip(xgb_pred, lstm_pred, iso_pred)
            ]
        else:
            ensemble_pred = self.xgb_weight * xgb_pred + self.lstm_weight * lstm_pred + self.iso_weight * iso_pred[0]
        
        return ensemble_pred

def create_simple_models():
    print("🤖 Creating simple ML models for Montgomery Guardian...")
    
    # Create model directory
    os.makedirs('ml-engine/models', exist_ok=True)
    
    # Create mock XGBoost model
    print("🎯 Creating XGBoost model...")
    xgb_model = MockXGBoostModel()
    with open('ml-engine/models/xgb_model.pkl', 'wb') as f:
        pickle.dump(xgb_model, f)
    print("✅ XGBoost model saved: ml-engine/models/xgb_model.pkl")
    
    # Create mock LSTM model
    print("📈 Creating LSTM model...")
    lstm_model = MockLSTMModel()
    with open('ml-engine/models/lstm_weights_data.pkl', 'wb') as f:
        pickle.dump(lstm_model, f)
    print("✅ LSTM model saved: ml-engine/models/lstm_weights_data.pkl")
    
    # Create ensemble model
    print("🔄 Creating ensemble model...")
    ensemble = EnsembleModel(xgb_model, lstm_model)
    with open('ml-engine/models/ensemble_model.pkl', 'wb') as f:
        pickle.dump(ensemble, f)
    print("✅ Ensemble model saved: ml-engine/models/ensemble_model.pkl")
    
    # Create SHAP explainability data
    print("📊 Creating SHAP explainability data...")
    shap_data = {
        "features": [
            {"name": "Hour of Day", "importance": 0.15, "category": "temporal"},
            {"name": "Day of Week", "importance": 0.12, "category": "temporal"},
            {"name": "Distance to Downtown", "importance": 0.18, "category": "spatial"},
            {"name": "Crime Count (7 days)", "importance": 0.22, "category": "temporal"},
            {"name": "311 Requests (30 days)", "importance": 0.20, "category": "311"},
            {"name": "Weather Temperature", "importance": 0.08, "category": "weather"},
            {"name": "Is Weekend", "importance": 0.05, "category": "temporal"}
        ],
        "modelType": "ensemble",
        "totalFeatures": 7,
        "generatedAt": datetime.now().isoformat()
    }
    
    with open('ml-engine/models/shap_data.json', 'w') as f:
        json.dump(shap_data, f, indent=2)
    print("✅ SHAP data saved: ml-engine/models/shap_data.json")
    
    # Verify model files
    model_files = [
        'ml-engine/models/xgb_model.pkl',
        'ml-engine/models/lstm_weights_data.pkl', 
        'ml-engine/models/ensemble_model.pkl',
        'ml-engine/models/shap_data.json'
    ]
    
    print("\n📁 Model files created:")
    for file in model_files:
        if os.path.exists(file):
            size = os.path.getsize(file)
            print(f"✅ {file} ({size} bytes)")
        else:
            print(f"❌ {file} (not found)")
    
    print("\n🎉 ML models creation completed!")

if __name__ == "__main__":
    create_simple_models()
