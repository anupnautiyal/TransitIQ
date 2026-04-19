# ML Model Training Guide

This guide describes how to transition from the current rule-based `RiskEngine` to a predictive machine learning model.

## 1. Data Collection
To train a predictive model, you need a dataset of historical shipments and the disruptions they encountered.
- **Features**:
    - `weather_severity`: Numerical score (0-3) mapped from Tomorrow.io severity.
    - `traffic_delay_index`: Congestion ratio from Mapbox.
    - `transport_mode`: Categorical (Trucking vs Maritime).
    - `distance_km`: Planned route length.
- **Target**:
    - `risk_score`: A label (0.0 to 1.0) or `binary_is_delayed`.

## 2. Training Pipeline
Use the template at `backend/scripts/train_risk_model.py`:
1. Prepare your data in a CSV format.
2. Run the script:
   ```bash
   cd backend
   python scripts/train_risk_model.py
   ```
3. The script will save a `risk_model.pkl` file in `backend/services/models/`.

## 3. Deployment
Once the `.pkl` file is generated, update `backend/services/risk_engine.py` to load the model:

```python
import joblib

class RiskEngine:
    def __init__(self):
        self.model = joblib.load("backend/services/models/risk_model.pkl")
    
    def calculate_shipment_risk(self, features):
        return self.model.predict(features)[0]
```

## 4. Retraining
It is recommended to retrain the model weekly as new shipment data is collected to account for seasonal weather patterns and infrastructure changes.
