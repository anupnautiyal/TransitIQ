import os
import math
import httpx
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculates haversine distance between two coordinates in kilometers."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class WeatherService:
    def __init__(self):
        self.api_key = os.getenv("TOMORROW_API_KEY")
        self.base_url = "https://api.tomorrow.io/v4/weather/forecast"
        # 15-minute spatial cache (~10km resolution) to conserve Tomorrow.io free quota
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = 900  # 15 mins
        
    async def get_weather_at_location(self, lat: float, lng: float) -> Dict[str, Any]:
        """Fetches current and forecast weather, overlays simulated weather cells when matched."""
        # 15-min cache check (round to 1 decimal place ~11km)
        cache_key = f"{round(lat, 1)},{round(lng, 1)}"
        import time
        now = time.time()
        if cache_key in self.cache:
            entry = self.cache[cache_key]
            if now - entry["timestamp"] < self.cache_ttl:
                return entry["data"]

        weather_data = {}
        if self.api_key:
            params = {
                "location": f"{lat},{lng}",
                "apikey": self.api_key,
                "units": "imperial",
                "timesteps": "1h"
            }

            async with httpx.AsyncClient() as client:
                try:
                    response = await client.get(self.base_url, params=params)
                    if response.status_code == 200:
                        weather_data = response.json()
                except Exception as e:
                    print(f"WeatherService: Tomorrow.io API error: {e}")

        # Seasonally realistic weather hazards (Winter: Fog & Low Visibility in North; Monsoon/Cyclonic in South)
        simulated_cells = [
            {
                "name": "Dense Winter Smog / Fog Sector",
                "lat": 28.1500,  # Near Haryana/Rajasthan border on Delhi-Mumbai corridor
                "lng": 76.8000,
                "radius_km": 75.0,
                "values": {
                    "visibility": 0.3,     # Severe fog <0.5 mi
                    "rainIntensity": 0.0,
                }
            },
            {
                "name": "Heavy Coastal Cloudburst",
                "lat": 13.0827,  # Near Tamil Nadu / Karnataka ghat border
                "lng": 79.5000,
                "radius_km": 40.0,
                "values": {
                    "windGust": 42.0,      # knots
                    "rainIntensity": 0.85,  # in/hr
                }
            }
        ]

        active_cell = None
        for cell in simulated_cells:
            dist = haversine_distance(lat, lng, cell["lat"], cell["lng"])
            if dist <= cell["radius_km"]:
                active_cell = cell
                break

        if active_cell:
            print(f"WeatherService: Overriding with simulated cell '{active_cell['name']}' at {lat:.4f}, {lng:.4f}")
            # Ensure timelines structure exists
            if "timelines" not in weather_data:
                weather_data["timelines"] = {"hourly": [{"time": "now", "values": {}}]}
            elif "hourly" not in weather_data["timelines"] or len(weather_data["timelines"]["hourly"]) == 0:
                weather_data["timelines"]["hourly"] = [{"time": "now", "values": {}}]
            
            # Merge cell values
            weather_data["timelines"]["hourly"][0]["values"].update(active_cell["values"])
            weather_data["simulated_cell"] = active_cell["name"]

        import time
        self.cache[cache_key] = {"data": weather_data, "timestamp": time.time()}
        return weather_data

    def analyze_risks(self, weather_data: Dict[str, Any], transport_mode: str) -> List[Dict[str, Any]]:
        """Analyzes weather data against transport-specific thresholds."""
        risks = []
        if "timelines" not in weather_data:
            return risks

        forecast = weather_data.get("timelines", {}).get("hourly", [])
        if not forecast:
            return risks

        current = forecast[0].get("values", {})
        
        if transport_mode == "maritime":
            wind_gust = current.get("windGust", 0)
            if wind_gust > 35:
                risks.append({
                    "type": "Weather",
                    "factor": "High Wind",
                    "severity": "Critical" if wind_gust > 50 else "High",
                    "value": f"{wind_gust} kts"
                })
        
        elif transport_mode == "trucking":
            # Fix Tomorrow.io key mapping: Tomorrow.io uses rainIntensity but code checked precipitationIntensity
            precip = current.get("precipitationIntensity") or current.get("rainIntensity", 0)
            if precip > 0.8:
                risks.append({
                    "type": "Weather",
                    "factor": "Heavy Rain",
                    "severity": "Critical",
                    "value": f"{precip} in/hr"
                })
            elif precip > 0.3:
                risks.append({
                    "type": "Weather",
                    "factor": "Moderate Rain",
                    "severity": "High",
                    "value": f"{precip} in/hr"
                })
            elif precip > 0.1:
                risks.append({
                    "type": "Weather",
                    "factor": "Light Rain",
                    "severity": "Moderate",
                    "value": f"{precip} in/hr"
                })
            
            visibility = current.get("visibility", 10)
            if visibility < 0.5:
                risks.append({
                    "type": "Weather",
                    "factor": "Dense Winter Fog / Smog (Hazard)",
                    "severity": "Critical",
                    "value": f"{visibility} mi"
                })
            elif visibility < 2.0:
                risks.append({
                    "type": "Weather",
                    "factor": "Low Visibility / Fog",
                    "severity": "High",
                    "value": f"{visibility} mi"
                })
            elif visibility < 4.0:
                risks.append({
                    "type": "Weather",
                    "factor": "Moderate Winter Haze",
                    "severity": "Moderate",
                    "value": f"{visibility} mi"
                })

        return risks

