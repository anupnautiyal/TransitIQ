"""
Predictive Risk Model Training Script
Loads historical shipment data and trains a Random Forest model.
"""

import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

def train_risk_engine_model(data_path="backend/data/historical_shipments.csv", model_output="backend/services/models/risk_model.pkl"):
    """
    Trains and saves the Random Forest model.
    """
    if not os.path.exists(data_path):
        print(f"Error: Training data not found at {data_path}")
        return

    print(f"Loading data from {data_path}...")
    df = pd.read_csv(data_path)
    
    # Features & Target
    # Select only numeric features to prevent training failures
    X = df.drop(columns=['risk_score']).select_dtypes(include=[np.number])
    y = df['risk_score']
    
    if X.empty:
        raise ValueError("Training aborted: No numeric features found in the dataset.")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest Regressor...")
    model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluation
    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print(f"Model trained successfully.")
    print(f"Mean Squared Error: {mse:.4f}")
    print(f"R2 Score: {r2:.4f}")
    
    # Save Model
    dirpath = os.path.dirname(model_output)
    if dirpath:
        os.makedirs(dirpath, exist_ok=True)
        
    joblib.dump(model, model_output)
    print(f"Model serialized and saved to {model_output}")

    # Generate Checksum for Integrity Verification
    import hashlib
    with open(model_output, "rb") as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()
    with open(f"{model_output}.sha256", "w") as f:
        f.write(file_hash)
    print(f"Checksum generated at {model_output}.sha256")

if __name__ == "__main__":
    train_risk_engine_model()
