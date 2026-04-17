from typing import List, Dict, Any
import math

class RiskEngine:
    def __init__(self, weather_weight=0.5, traffic_weight=0.3, operational_weight=0.2):
        self.weather_weight = weather_weight
        self.traffic_weight = traffic_weight
        self.operational_weight = operational_weight
        self.threshold = 0.7

    def calculate_shipment_risk(self, 
        weather_risks: List[Dict[str, Any]], 
        traffic_data: Dict[str, Any] = None,
        is_delayed: bool = False
    ) -> float:
        """
        Calculates a unified risk score (0.0 to 1.0).
        """
        score = 0.0
        
        # 1. Weather Impact
        if weather_risks:
            max_severity = 0.0
            for risk in weather_risks:
                severity_map = {"Critical": 1.0, "High": 0.7, "Moderate": 0.4, "Low": 0.1}
                max_severity = max(max_severity, severity_map.get(risk["severity"], 0.0))
            score += max_severity * self.weather_weight

        # 2. Traffic/Network Impact (Mapbox data)
        if traffic_data:
            # Simplified: Mapbox Directions API returns 'congestion' or 'duration_typical' vs 'duration'
            # For this demo, we check if duration > 1.3 * duration_typical
            duration = traffic_data.get("duration", 1)
            typical = traffic_data.get("duration_typical", duration)
            if duration > typical:
                ratio = (duration / typical) - 1.0 # e.g. 0.3 if 30% slower
                traffic_score = min(ratio * 2, 1.0) # Scaled
                score += traffic_score * self.traffic_weight

        # 3. Operational Anomaly
        if is_delayed:
            score += 1.0 * self.operational_weight

        return min(round(score, 2), 1.0)

    def needs_reroute(self, risk_score: float) -> bool:
        return risk_score >= self.threshold
