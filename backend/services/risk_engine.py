import os
import joblib
import pandas as pd
import hashlib
from pathlib import Path
from typing import List, Dict, Any

class RiskEngine:
    def __init__(self, weather_weight=0.5, traffic_weight=0.3, operational_weight=0.2):
        self.weather_weight = weather_weight
        self.traffic_weight = traffic_weight
        self.operational_weight = operational_weight
        self.threshold = 0.7
        
        # ML Model Initialization (Absolute Path Resolution)
        base_dir = Path(__file__).resolve().parent
        self.model_path = str(base_dir / "models" / "risk_model.pkl")
        self.model = None
        self._load_model()

    def _load_model(self):
        """Attempts to load and validate the serialized ML model."""
        if not os.path.exists(self.model_path):
            print("RiskEngine: ML Model not found. Falling back to rule-based logic.")
            return

        # 1. Integrity Verification
        checksum_path = f"{self.model_path}.sha256"
        if os.path.exists(checksum_path):
            try:
                with open(self.model_path, "rb") as f:
                    file_hash = hashlib.sha256(f.read()).hexdigest()
                with open(checksum_path, "r") as f:
                    expected_hash = f.read().strip()
                
                if file_hash != expected_hash:
                    print("RiskEngine: [SECURITY] Model checksum mismatch! Refusing to load untrusted model.")
                    return
            except Exception as e:
                print(f"RiskEngine: Integrity check failed: {e}")
                return

        # 2. Load and Validate Object
        try:
            loaded_model = joblib.load(self.model_path)
            # Whitelist/Attribute Check
            if hasattr(loaded_model, "predict"):
                self.model = loaded_model
                print(f"RiskEngine: ML Model loaded and validated successfully.")
            else:
                print("RiskEngine: Loaded object lacks 'predict' method. Invalid model.")
        except Exception as e:
            print(f"RiskEngine: Failed to load ML model: {e}")

    def calculate_shipment_risk(self, 
        weather_risks: List[Dict[str, Any]], 
        traffic_data: Dict[str, Any] = None,
        is_delayed: bool = False,
        transport_mode: str = "trucking",
        distance_km: float = 500.0
    ) -> float:
        """
        Calculates a unified risk score (0.0 to 1.0).
        Uses ML model if available, otherwise falls back to weighted rules.
        """
        
        # 1. Extract Features
        weather_sev = 0
        if weather_risks:
            severity_map = {"Critical": 3, "High": 2, "Moderate": 1, "Low": 0}
            for risk in weather_risks:
                weather_sev = max(weather_sev, severity_map.get(risk.get("severity"), 0))

        traffic_congestion = 1.0
        if traffic_data:
            duration = traffic_data.get("duration", 1)
            typical = traffic_data.get("duration_typical", duration)
            traffic_congestion = duration / typical if typical > 0 else 1.0

        # Safe handling of transport_mode
        safe_mode = (transport_mode or "trucking").lower()
        mode_val = 1 if safe_mode == "maritime" else 0
        delay_val = 1 if is_delayed else 0

        # 2. ML Inference (if model is loaded)
        if self.model:
            try:
                features = pd.DataFrame([{
                    'weather_severity': weather_sev,
                    'traffic_congestion': traffic_congestion,
                    'is_delayed_start': delay_val,
                    'transport_mode': mode_val,
                    'distance_km': distance_km
                }])
                ml_score = self.model.predict(features)[0]
                # Clamp between 0.0 and 1.0
                return max(0.0, min(round(float(ml_score), 2), 1.0))
            except Exception as e:
                print(f"RiskEngine: ML Inference failed: {e}. Falling back to rules.")

        # 3. Rule-based Fallback (Synchronized logic)
        score = 0.0
        # Weather (Scaled 0-1)
        score += (weather_sev / 3.0) * self.weather_weight
        # Traffic (Scaled)
        if traffic_congestion > 1.0:
            ratio = traffic_congestion - 1.0
            traffic_score = min(ratio * 2, 1.0)
            score += traffic_score * self.traffic_weight
        # Operational
        if is_delayed:
            score += 1.0 * self.operational_weight
        # Distance (Minor normalization to 2000km like the trainer)
        score += (distance_km / 2000.0) * 0.05
        # Mode
        if safe_mode == "maritime":
            score += 0.05

        return min(round(score, 2), 1.0)

    def needs_reroute(self, risk_score: float) -> bool:
        return risk_score >= self.threshold
