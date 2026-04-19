import pandas as pd
import numpy as np
import os

def generate_historical_data(num_samples=2000, output_path="backend/data/historical_shipments.csv"):
    """
    Generates a synthetic historical dataset for training the TransitIQ Risk Engine.
    """
    dirpath = os.path.dirname(output_path)
    if dirpath:
        os.makedirs(dirpath, exist_ok=True)
    
    np.random.seed(42)
    
    # Features
    weather_severity = np.random.randint(0, 4, size=num_samples) # 0:Low, 1:Moderate, 2:High, 3:Critical
    traffic_congestion = np.random.uniform(1.0, 2.5, size=num_samples) # Ratio of actual/typical duration
    is_delayed_start = np.random.choice([0, 1], size=num_samples, p=[0.8, 0.2]) # Operational status
    transport_mode = np.random.choice([0, 1], size=num_samples) # 0:Trucking, 1:Maritime
    distance_km = np.random.uniform(50, 2000, size=num_samples)
    
    # Label: Risk Score calculation logic (with noise)
    # Higher weights for weather and traffic
    base_risk = (
        (weather_severity / 3.0) * 0.4 + 
        ((traffic_congestion - 1.0) / 1.5) * 0.3 + 
        is_delayed_start * 0.2 + 
        (distance_km / 2000.0) * 0.05 +
        (transport_mode * 0.05) # Add maritime overhead
    )
    
    # Add noise to simulate real-world uncertainty
    noise = np.random.normal(0, 0.05, size=num_samples)
    risk_score = np.clip(base_risk + noise, 0.0, 1.0)
    
    df = pd.DataFrame({
        'weather_severity': weather_severity,
        'traffic_congestion': traffic_congestion,
        'is_delayed_start': is_delayed_start,
        'transport_mode': transport_mode,
        'distance_km': distance_km,
        'risk_score': risk_score
    })
    
    df.to_csv(output_path, index=False)
    print(f"Successfully generated {num_samples} records at {output_path}")

if __name__ == "__main__":
    generate_historical_data()
