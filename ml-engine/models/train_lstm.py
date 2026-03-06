# ml-engine/models/train_lstm.py
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import logging
from pathlib import Path
from typing import Dict, Any, Tuple, List
import matplotlib.pyplot as plt
import pickle

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set device
device = torch.device('cpu')
logger.info(f"Using device: {device}")

class CrimeTimeSeriesDataset(Dataset):
    """Dataset for crime time series data"""
    
    def __init__(self, sequences: np.ndarray, targets: np.ndarray):
        self.sequences = torch.FloatTensor(sequences)
        self.targets = torch.FloatTensor(targets)
    
    def __len__(self):
        return len(self.sequences)
    
    def __getitem__(self, idx):
        return self.sequences[idx], self.targets[idx]

class LSTMModel(nn.Module):
    """LSTM model for time series prediction"""
    
    def __init__(self, input_size: int, hidden_size: int, num_layers: int, output_size: int, dropout: float = 0.2):
        super(LSTMModel, self).__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # LSTM layers
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0
        )
        
        # Dropout layer
        self.dropout = nn.Dropout(dropout)
        
        # Fully connected layers
        self.fc1 = nn.Linear(hidden_size, hidden_size // 2)
        self.fc2 = nn.Linear(hidden_size // 2, output_size)
        
        # Activation
        self.relu = nn.ReLU()
        
    def forward(self, x):
        # Initialize hidden state
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        
        # LSTM forward pass
        out, _ = self.lstm(x, (h0, c0))
        
        # Take the last output
        out = out[:, -1, :]
        
        # Apply dropout
        out = self.dropout(out)
        
        # Fully connected layers
        out = self.relu(self.fc1(out))
        out = self.fc2(out)
        
        return out

def prepare_time_series_data(crime_df: pd.DataFrame, sequence_length: int = 14) -> Tuple[np.ndarray, np.ndarray, MinMaxScaler]:
    """
    Prepare time series data for LSTM training
    Returns: (sequences, targets, scaler)
    """
    logger.info("Preparing time series data...")
    
    # Aggregate crime counts by date
    crime_df['incidentdate'] = pd.to_datetime(crime_df['incidentdate'])
    daily_crime_counts = crime_df.groupby(crime_df['incidentdate'].dt.date).size().reset_index(name='crime_count')
    daily_crime_counts.columns = ['date', 'crime_count']
    daily_crime_counts['date'] = pd.to_datetime(daily_crime_counts['date'])
    
    # Sort by date
    daily_crime_counts = daily_crime_counts.sort_values('date')
    
    # Fill missing dates with zero counts
    date_range = pd.date_range(start=daily_crime_counts['date'].min(), 
                              end=daily_crime_counts['date'].max(), freq='D')
    daily_crime_counts = daily_crime_counts.set_index('date').reindex(date_range, fill_value=0).reset_index()
    daily_crime_counts.columns = ['date', 'crime_count']
    
    logger.info(f"Time series range: {daily_crime_counts['date'].min()} to {daily_crime_counts['date'].max()}")
    logger.info(f"Total days: {len(daily_crime_counts)}")
    
    # Add additional features
    daily_crime_counts['day_of_week'] = daily_crime_counts['date'].dt.dayofweek
    daily_crime_counts['month'] = daily_crime_counts['date'].dt.month
    daily_crime_counts['is_weekend'] = (daily_crime_counts['day_of_week'] >= 5).astype(int)
    
    # Create lag features
    for lag in range(1, 8):  # 7-day lag features
        daily_crime_counts[f'lag_{lag}'] = daily_crime_counts['crime_count'].shift(lag)
    
    # Rolling statistics
    daily_crime_counts['rolling_mean_7'] = daily_crime_counts['crime_count'].rolling(window=7, min_periods=1).mean()
    daily_crime_counts['rolling_std_7'] = daily_crime_counts['crime_count'].rolling(window=7, min_periods=1).std().fillna(0)
    
    # Drop NaN values
    daily_crime_counts = daily_crime_counts.fillna(0)
    
    # Select features for LSTM
    feature_columns = ['crime_count', 'day_of_week', 'month', 'is_weekend'] + \
                     [f'lag_{lag}' for lag in range(1, 8)] + \
                     ['rolling_mean_7', 'rolling_std_7']
    
    data = daily_crime_counts[feature_columns].values
    
    # Normalize data
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data)
    
    # Create sequences
    sequences = []
    targets = []
    
    for i in range(sequence_length, len(scaled_data)):
        sequences.append(scaled_data[i-sequence_length:i])
        targets.append(scaled_data[i, 0])  # Predict next day's crime count
    
    sequences = np.array(sequences)
    targets = np.array(targets)
    
    logger.info(f"Created {len(sequences)} sequences with length {sequence_length}")
    
    return sequences, targets, scaler

def train_lstm_model(sequences: np.ndarray, targets: np.ndarray, scaler: MinMaxScaler,
                    model_path: str = "ml-engine/models/lstm_weights.pt",
                    sequence_length: int = 14,
                    input_size: int = 13) -> Dict[str, Any]:
    """
    Train LSTM model for time series prediction
    """
    logger.info("Training LSTM model...")
    
    # Split data
    train_size = int(len(sequences) * 0.8)
    val_size = int(len(sequences) * 0.1)
    
    X_train = sequences[:train_size]
    y_train = targets[:train_size]
    X_val = sequences[train_size:train_size+val_size]
    y_val = targets[train_size:train_size+val_size]
    X_test = sequences[train_size+val_size:]
    y_test = targets[train_size+val_size:]
    
    logger.info(f"Train size: {len(X_train)}, Val size: {len(X_val)}, Test size: {len(X_test)}")
    
    # Create datasets and dataloaders
    train_dataset = CrimeTimeSeriesDataset(X_train, y_train)
    val_dataset = CrimeTimeSeriesDataset(X_val, y_val)
    test_dataset = CrimeTimeSeriesDataset(X_test, y_test)
    
    batch_size = 32
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
    
    # Initialize model
    hidden_size = 64
    num_layers = 2
    output_size = 1
    
    model = LSTMModel(input_size, hidden_size, num_layers, output_size).to(device)
    
    # Loss and optimizer
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-5)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)
    
    # Training loop
    num_epochs = 100
    best_val_loss = float('inf')
    patience_counter = 0
    patience = 20
    
    train_losses = []
    val_losses = []
    
    for epoch in range(num_epochs):
        # Training
        model.train()
        train_loss = 0.0
        
        for batch_sequences, batch_targets in train_loader:
            batch_sequences = batch_sequences.to(device)
            batch_targets = batch_targets.to(device)
            
            # Forward pass
            outputs = model(batch_sequences)
            loss = criterion(outputs.squeeze(), batch_targets)
            
            # Backward pass and optimize
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            
            train_loss += loss.item()
        
        train_loss /= len(train_loader)
        train_losses.append(train_loss)
        
        # Validation
        model.eval()
        val_loss = 0.0
        
        with torch.no_grad():
            for batch_sequences, batch_targets in val_loader:
                batch_sequences = batch_sequences.to(device)
                batch_targets = batch_targets.to(device)
                
                outputs = model(batch_sequences)
                loss = criterion(outputs.squeeze(), batch_targets)
                val_loss += loss.item()
        
        val_loss /= len(val_loader)
        val_losses.append(val_loss)
        
        scheduler.step(val_loss)
        
        # Early stopping
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            
            # Save best model
            model_path_obj = Path(model_path)
            model_path_obj.parent.mkdir(parents=True, exist_ok=True)
            torch.save(model.state_dict(), model_path)
            logger.info(f"✅ Model saved to {model_path}")
        else:
            patience_counter += 1
        
        if (epoch + 1) % 10 == 0:
            logger.info(f"Epoch [{epoch+1}/{num_epochs}], Train Loss: {train_loss:.6f}, Val Loss: {val_loss:.6f}")
        
        if patience_counter >= patience:
            logger.info(f"Early stopping at epoch {epoch+1}")
            break
    
    # Load best model for evaluation
    model.load_state_dict(torch.load(model_path))
    
    # Evaluate on test set
    model.eval()
    test_predictions = []
    test_actuals = []
    
    with torch.no_grad():
        for batch_sequences, batch_targets in test_loader:
            batch_sequences = batch_sequences.to(device)
            batch_targets = batch_targets.to(device)
            
            outputs = model(batch_sequences)
            test_predictions.extend(outputs.squeeze().cpu().numpy())
            test_actuals.extend(batch_targets.cpu().numpy())
    
    test_predictions = np.array(test_predictions)
    test_actuals = np.array(test_actuals)
    
    # Calculate metrics
    mse = mean_squared_error(test_actuals, test_predictions)
    mae = mean_absolute_error(test_actuals, test_predictions)
    rmse = np.sqrt(mse)
    
    logger.info(f"Test Results - MSE: {mse:.6f}, MAE: {mae:.6f}, RMSE: {rmse:.6f}")
    
    # Prepare model data
    model_data = {
        'model': model,
        'scaler': scaler,
        'sequence_length': sequence_length,
        'input_size': input_size,
        'hidden_size': hidden_size,
        'num_layers': num_layers,
        'train_losses': train_losses,
        'val_losses': val_losses,
        'test_metrics': {
            'mse': mse,
            'mae': mae,
            'rmse': rmse
        },
        'test_predictions': test_predictions.tolist(),
        'test_actuals': test_actuals.tolist()
    }
    
    # Save model data
    model_data_path = model_path.replace('.pt', '_data.pkl')
    with open(model_data_path, 'wb') as f:
        pickle.dump(model_data, f)
    
    logger.info(f"✅ LSTM model training completed")
    
    return model_data

def predict_lstm(model_data: Dict[str, Any], last_sequences: np.ndarray) -> Dict[str, Any]:
    """
    Make prediction using trained LSTM model
    """
    try:
        model = model_data['model']
        scaler = model_data['scaler']
        sequence_length = model_data['sequence_length']
        
        model.eval()
        
        # Prepare input
        if len(last_sequences.shape) == 2:
            last_sequences = last_sequences.reshape(1, sequence_length, -1)
        
        input_tensor = torch.FloatTensor(last_sequences).to(device)
        
        # Make prediction
        with torch.no_grad():
            prediction = model(input_tensor)
        
        # Inverse transform to get actual crime count
        # Note: This is simplified - proper inverse transform would need to handle all features
        predicted_count = prediction.cpu().numpy()[0, 0]
        
        return {
            'predicted_crime_count': float(predicted_count),
            'confidence': 0.8  # Placeholder confidence
        }
        
    except Exception as e:
        logger.error(f"LSTM prediction failed: {e}")
        return {
            'predicted_crime_count': 10.0,
            'confidence': 0.5
        }

def load_lstm_model(model_path: str = "ml-engine/models/lstm_weights.pt") -> Dict[str, Any]:
    """
    Load trained LSTM model and data
    """
    model_data_path = model_path.replace('.pt', '_data.pkl')
    
    if not Path(model_data_path).exists():
        raise FileNotFoundError(f"LSTM model data not found: {model_data_path}")
    
    with open(model_data_path, 'rb') as f:
        model_data = pickle.load(f)
    
    # Load model state
    model = LSTMModel(
        input_size=model_data['input_size'],
        hidden_size=model_data['hidden_size'],
        num_layers=model_data['num_layers'],
        output_size=1
    ).to(device)
    
    model.load_state_dict(torch.load(model_path))
    model.eval()
    
    model_data['model'] = model
    
    logger.info(f"✅ LSTM model loaded from {model_path}")
    return model_data

if __name__ == "__main__":
    # Test LSTM training
    try:
        from data.data_query import get_real_data
        
        # Get real data
        crime_df, requests_df = get_real_data()
        
        # Prepare time series data
        sequences, targets, scaler = prepare_time_series_data(crime_df)
        
        # Train LSTM model
        model_data = train_lstm_model(sequences, targets)
        
        print("✅ LSTM training completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure you have real crime data in the database.")
