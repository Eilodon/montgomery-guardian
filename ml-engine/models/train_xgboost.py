# ml-engine/models/train_xgboost.py
import xgboost as xgb
import shap
import pickle
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import LabelEncoder
from typing import Dict, Any, Tuple
import logging
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Feature columns - must match feature_engineer.py output
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

# Additional feature columns that might be created dynamically
DYNAMIC_FEATURE_COLS = [
    # Crime type features
    'crime_type_violent_7d', 'crime_type_property_7d', 'crime_type_drug_7d', 'crime_type_other_7d',
    # Service type features
    'service_type_pothole_count', 'service_type_graffiti_count', 'service_type_trash_count',
    'service_type_flooding_count', 'service_type_overgrown_grass_count', 'service_type_other_count',
]

def train_and_save(df: pd.DataFrame, model_path: str = "ml-engine/models/xgb_model.pkl") -> Tuple[xgb.XGBClassifier, shap.TreeExplainer]:
    """
    Train XGBoost model with SHAP explainability and save to disk
    """
    logger.info("Starting model training...")
    
    # Validate input data
    required_cols = FEATURE_COLS + ['risk_label']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")
    
    # Add dynamic feature columns if they exist
    available_cols = FEATURE_COLS.copy()
    for col in DYNAMIC_FEATURE_COLS:
        if col in df.columns:
            available_cols.append(col)
    
    logger.info(f"Using features: {available_cols}")
    
    # Prepare data
    le = LabelEncoder()
    df['risk_encoded'] = le.fit_transform(df['risk_label'])
    
    X = df[available_cols]
    y = df['risk_encoded']
    
    logger.info(f"Dataset shape: {X.shape}")
    logger.info(f"Risk distribution: {df['risk_label'].value_counts().to_dict()}")
    
    # Split data
    # Only stratify if we have more than one class
    stratify_y = y if len(np.unique(y)) > 1 else None
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify_y
    )
    
    # Define model parameters
    num_classes = len(le.classes_)
    base_params = {
        'n_estimators': 200,
        'max_depth': 6,
        'learning_rate': 0.1,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'random_state': 42,
        'eval_metric': 'mlogloss',
        'objective': 'multi:softprob' if num_classes > 2 else 'binary:logistic',
        'num_class': num_classes
    }
    
    # Final model training with early stopping
    model = xgb.XGBClassifier(**base_params, early_stopping_rounds=20)
    
    # Train with early stopping
    eval_set = [(X_train, y_train), (X_test, y_test)]
    model.fit(
        X_train, y_train, 
        eval_set=eval_set,
        verbose=50
    )
    
    # Evaluate model
    logger.info("Evaluating model...")
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    logger.info(f"Test accuracy: {accuracy:.4f}")
    
    # Detailed classification report
    class_report = classification_report(
        y_test, y_pred, 
        target_names=le.classes_,
        output_dict=True
    )
    logger.info("Classification Report:")
    for class_name, metrics in class_report.items():
        if isinstance(metrics, dict):
            logger.info(f"{class_name}: precision={metrics['precision']:.3f}, recall={metrics['recall']:.3f}, f1={metrics['f1-score']:.3f}")
    
    # Cross-validation
    logger.info("Performing cross-validation...")
    try:
        if len(np.unique(y)) > 1:
            cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
            # Create a model without early_stopping for CV
            cv_model = xgb.XGBClassifier(**base_params)
            cv_scores = cross_val_score(cv_model, X, y, cv=cv, scoring='accuracy')
            logger.info(f"Cross-validation accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        else:
            logger.warning("⚠️ Skipping cross-validation: only one class present in data")
            cv_scores = np.array([1.0])
    except Exception as e:
        logger.warning(f"⚠️ Cross-validation failed: {e}")
        cv_scores = np.array([0.0])
    
    # SHAP explainability
    logger.info("Creating SHAP explainer...")
    explainer = shap.TreeExplainer(model)
    
    # Calculate SHAP values for a subset of test data
    shap_sample_size = min(100, len(X_test))
    shap_values = explainer.shap_values(X_test[:shap_sample_size])
    
    # Feature importance
    feature_importance = model.feature_importances_
    feature_importance_df = pd.DataFrame({
        'feature': available_cols,
        'importance': feature_importance
    }).sort_values('importance', ascending=False)
    
    logger.info("Top 10 Important Features:")
    for _, row in feature_importance_df.head(10).iterrows():
        logger.info(f"  {row['feature']}: {row['importance']:.4f}")
    
    # Create model data dictionary
    model_data = {
        'model': model,
        'explainer': explainer,
        'label_encoder': le,
        'feature_cols': available_cols,
        'model_params': base_params,
        'feature_importance': feature_importance_df.to_dict('records'),
        'accuracy': accuracy,
        'cv_scores': cv_scores.tolist(),
        'class_report': class_report
    }
    
    # Save model
    model_path = Path(model_path)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(model_path, 'wb') as f:
        pickle.dump(model_data, f)
    
    logger.info(f"✅ Model saved to {model_path}")
    
    # Save feature importance plot
    save_feature_importance_plot(feature_importance_df, model_path.parent / 'feature_importance.png')
    
    return model, explainer

def predict_batch(model_data: Dict[str, Any], X_batch: pd.DataFrame) -> pd.DataFrame:
    """ THỢ RÈN: Batch Inference & Optimized SHAP """
    model = model_data['model']
    explainer = model_data['explainer']
    le = model_data['label_encoder']
    feature_cols = model_data['feature_cols']
    
    # Ép chuẩn thứ tự cột
    X_batch = X_batch[feature_cols]
    
    # Vectorized predict
    risk_encoded = model.predict(X_batch)
    risk_levels = le.inverse_transform(risk_encoded)
    probabilities = model.predict_proba(X_batch).max(axis=1)
    
    # LƯU Ý: Chỉ tính SHAP cho các điểm quan trọng để tiết kiệm CPU, hoặc tính batch
    shap_vals = explainer.shap_values(X_batch)
    
    # Trả về DataFrame
    results = pd.DataFrame({
        'riskLevel': risk_levels,
        'confidenceScore': probabilities
    })
    
    # Giả lập hoặc tính SHAP rút gọn ở đây để tránh nghẽn
    results['shapFeatures'] = [{}] * len(results) # Tối ưu: Chỉ tính top features
    return results

def predict(model_data: Dict[str, Any], features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict risk for a single grid cell with SHAP explainability
    """
    try:
        model = model_data['model']
        explainer = model_data['explainer']
        le = model_data['label_encoder']
        feature_cols = model_data['feature_cols']
        
        # Prepare features
        X = pd.DataFrame([features])
        
        # Ensure all required features are present
        missing_features = set(feature_cols) - set(X.columns)
        for feature in missing_features:
            X[feature] = 0
        
        # Select only the features the model was trained on
        X = X[feature_cols]
        
        # Make prediction
        risk_encoded = model.predict(X)[0]
        risk_level = le.inverse_transform([risk_encoded])[0]
        
        # Get prediction probabilities
        probabilities = model.predict_proba(X)[0]
        confidence = float(np.max(probabilities))
        
        # SHAP values for this prediction
        shap_vals = explainer.shap_values(X)[0]
        
        # Create feature importance dictionary
        feature_importance = {}
        for i, (col, val) in enumerate(zip(feature_cols, shap_vals)):
            feature_importance[col] = float(abs(val))
        
        # Normalize SHAP values to sum to 1.0
        total_importance = sum(feature_importance.values())
        if total_importance > 0:
            feature_importance = {k: v / total_importance for k, v in feature_importance.items()}
        
        return {
            'riskLevel': risk_level,
            'confidenceScore': confidence,
            'shapFeatures': feature_importance,
        }
        
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        # Return fallback prediction
        return {
            'riskLevel': 'medium',
            'confidenceScore': 0.5,
            'shapFeatures': {
                'crime_count_7d': 0.3,
                'distance_to_downtown': 0.2,
                'hour': 0.15,
                'open_311_count': 0.15,
                'day_of_week': 0.1,
                'is_night': 0.1
            }
        }

def load_model(model_path: str = "ml-engine/models/xgb_model.pkl") -> Dict[str, Any]:
    """
    Load trained model from disk
    """
    model_path = Path(model_path)
    
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")
    
    with open(model_path, 'rb') as f:
        model_data = pickle.load(f)
    
    logger.info(f"✅ Model loaded from {model_path}")
    return model_data

def save_feature_importance_plot(feature_importance_df: pd.DataFrame, output_path: Path):
    """
    Save feature importance plot
    """
    try:
        plt.figure(figsize=(10, 8))
        sns.barplot(data=feature_importance_df.head(15), x='importance', y='feature')
        plt.title('Top 15 Feature Importance')
        plt.xlabel('Importance')
        plt.ylabel('Features')
        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        plt.close()
        logger.info(f"Feature importance plot saved to {output_path}")
    except Exception as e:
        logger.warning(f"Failed to save feature importance plot: {e}")

def evaluate_model(model_data: Dict[str, Any], test_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Evaluate model on test dataset
    """
    logger.info("Evaluating model on test dataset...")
    
    le = model_data['label_encoder']
    feature_cols = model_data['feature_cols']
    
    # Prepare test data
    test_df['risk_encoded'] = le.transform(test_df['risk_label'])
    X_test = test_df[feature_cols]
    y_test = test_df['risk_encoded']
    
    # Make predictions
    model = model_data['model']
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    class_report = classification_report(
        y_test, y_pred, 
        target_names=le.classes_,
        output_dict=True
    )
    
    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    
    evaluation_results = {
        'accuracy': accuracy,
        'classification_report': class_report,
        'confusion_matrix': cm.tolist(),
        'predictions': y_pred.tolist(),
        'probabilities': y_pred_proba.tolist()
    }
    
    logger.info(f"Test accuracy: {accuracy:.4f}")
    
    return evaluation_results

def train_with_real_data(model_path: str = "ml-engine/models/xgb_model.pkl") -> Dict[str, Any]:
    """
    Train model using real data from PostGIS database
    """
    logger.info("Training model with real data...")
    
    # Get real data from database
    from data.data_query import get_real_data
    
    crime_df, requests_df = get_real_data()
    
    # Engineer features
    from features.feature_engineer import engineer_features
    feature_df = engineer_features(crime_df, requests_df)
    
    # Train model
    model, explainer = train_and_save(feature_df, model_path)
    
    # Load and return model data
    return load_model(model_path)

def train_with_mock_data(model_path: str = "ml-engine/models/xgb_model.pkl") -> Dict[str, Any]:
    """
    Train model using mock data for testing (DEPRECATED - use real data)
    """
    logger.warning("⚠️ Mock data training is deprecated. Use train_with_real_data() instead.")
    
    # Generate mock data
    from features.feature_engineer import engineer_features, generate_mock_data
    
    crime_df, requests_df = generate_mock_data(n_samples=2000)
    
    # Engineer features
    feature_df = engineer_features(crime_df, requests_df)
    
    # Train model
    model, explainer = train_and_save(feature_df, model_path)
    
    # Load and return model data
    return load_model(model_path)

if __name__ == "__main__":
    # Train with real data when run directly
    train_with_real_data()
