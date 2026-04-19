import sys
import os

# Add backend to path relative to script location
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.normpath(os.path.join(script_dir, '..'))
sys.path.append(backend_dir)

from services.risk_engine import RiskEngine

def verify_ml():
    print("Testing RiskEngine with ML model...")
    engine = RiskEngine()
    
    # Test Scenario: High Weather, High Traffic
    weather_risks = [{"severity": "Critical", "type": "Cyclone"}]
    traffic_data = {"duration": 200, "duration_typical": 100} # 2x slower
    
    risk = engine.calculate_shipment_risk(
        weather_risks=weather_risks,
        traffic_data=traffic_data,
        is_delayed=True,
        transport_mode="trucking",
        distance_km=1500
    )
    
    print(f"Scenario 1 (High Risk): {risk}")
    
    # Test Scenario: Low Weather, Low Traffic
    weather_risks_low = [{"severity": "Low", "type": "Clear"}]
    traffic_data_low = {"duration": 100, "duration_typical": 100}
    
    risk_low = engine.calculate_shipment_risk(
        weather_risks=weather_risks_low,
        traffic_data=traffic_data_low,
        is_delayed=False,
        transport_mode="trucking",
        distance_km=100
    )
    
    print(f"Scenario 2 (Low Risk): {risk_low}")
    
    if engine.model is not None:
        print("Verification: ML model was USED for calculations.")
    else:
        print("Verification: ML model was NOT found, fallback was used.")

if __name__ == "__main__":
    verify_ml()
