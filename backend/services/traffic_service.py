import os
import httpx
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

class TrafficService:
    def __init__(self):
        self.api_key = os.getenv("TOMTOM_API_KEY")
        self.base_url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json"

    async def get_traffic_at_location(self, lat: float, lng: float) -> Dict[str, Any]:
        """
        Fetches live traffic flow data from TomTom for a specific coordinate.
        Returns metrics like current speed, free flow speed, and congestion level.
        """
        if not self.api_key:
            print("TrafficService: TOMTOM_API_KEY missing.")
            return {"error": "API Key missing", "congestion": "unknown"}

        params = {
            "key": self.api_key,
            "point": f"{lat},{lng}",
            "unit": "KMPH"
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(self.base_url, params=params)
                if response.status_code == 200:
                    data = response.json().get("flowSegmentData", {})
                    
                    current_speed = data.get("currentSpeed")
                    free_flow = data.get("freeFlowSpeed")
                    
                    # Compute congestion level only if speeds are valid and free_flow > 0
                    if (isinstance(current_speed, (int, float)) and 
                        isinstance(free_flow, (int, float)) and free_flow > 0):
                        congestion_level = max(0.0, 1.0 - (current_speed / free_flow))
                        congestion_status = "heavy" if congestion_level > 0.6 else "moderate" if congestion_level > 0.3 else "low"
                    else:
                        congestion_level = None # Sentinel for unknown/invalid
                        congestion_status = "unknown"
                    
                    return {
                        "current_speed": current_speed,
                        "free_flow_speed": free_flow,
                        "congestion_index": round(congestion_level, 2) if congestion_level is not None else 0.0,
                        "confidence": data.get("confidence", 0),
                        "congestion": congestion_status
                    }
                else:
                    print(f"TrafficService Error: {response.status_code} - {response.text}")
                    return {"error": f"API Error {response.status_code}", "congestion": "unknown"}
            except Exception as e:
                print(f"TrafficService Exception: {e}")
                return {"error": str(e), "congestion": "unknown"}
