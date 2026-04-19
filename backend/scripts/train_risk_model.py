"""
Training Template for TransitIQ Predictive Risk Engine
This script demonstrates how to train a Random Forest model using historical shipment/disruption data.
"""

import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

def load_and_preprocess_data(csv_path):
    """
    Loads historical disruption logs.
    Expected features: weather_severity, traffic_delay_index, distance_km, operational_status
    Target: actual_delay_minutes or risk_score
    """
    df = pd.read_csv(csv_path)
    
    # Feature Engineering (Example)
    # Convert categorical weather to numerical if not already done
    weather_map = {"Low": 0, "Moderate": 1, "High": 2, "Critical": 3}
    if 'weather_severity' in df.columns and df['weather_severity'].dtype == object:
        df['weather_severity_numeric'] = df['weather_severity'].map(weather_map)
    
    # Selection of features for the model
    features = ['weather_severity_numeric', 'traffic_delay_index', 'distance_km']
    target = 'risk_score' # or 'delay_minutes'
    
    X = df[features]
    y = df[target]
    
    return train_test_split(X, y, test_size=0.2, random_state=42)

def train_model(X_train, y_train):
    """
    Trains a Random Forest Regressor to predict risk.
    """
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    return model

def save_model(model, output_path="backend/services/models/risk_model.pkl"):
    """
    Serializes the model for use in the FastAPI backend.
    """
    import os
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    joblib.dump(model, output_path)
    print(f"Model saved to {output_path}")

if __name__ == "__main__":
    # In a real scenario, you would provide the path to your historical data CSV
    # data_path = "backend/data/historical_disruptions.csv"
    # X_train, X_test, y_train, y_test = load_and_preprocess_data(data_path)
    
    # MOCK TRAINING FOR DEMONSTRATION
    print("Initializing Mock Training...")
    mock_X = np.random.rand(100, 3) # [Weather, Traffic, Distance]
    mock_y = np.random.rand(100)    # [Risk Score]
    
    X_train, X_test, y_train, y_test = train_test_split(mock_X, mock_y, test_size=0.2)
    
    model = train_model(X_train, y_train)
    
    # Evaluation
    predictions = model.predict(X_test)
    print(f"Model trained. MSE: {mean_squared_error(y_test, predictions):.4f}")
    
    save_model(model)
