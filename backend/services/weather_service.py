import os
import httpx
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

class WeatherService:
    def __init__(self):
        self.api_key = os.getenv("TOMORROW_API_KEY")
        self.base_url = "https://api.tomorrow.io/v4/weather/forecast"
        
    async def get_weather_at_location(self, lat: float, lng: float) -> Dict[str, Any]:
        """Fetches current and forecast weather for a specific point."""
        if not self.api_key:
            return {"error": "API Key missing"}

        params = {
            "location": f"{lat},{lng}",
            "apikey": self.api_key,
            "units": "imperial",
            "timesteps": "1h"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.base_url, params=params)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                return {"error": str(e)}

    def analyze_risks(self, weather_data: Dict[str, Any], transport_mode: str) -> List[Dict[str, Any]]:
        """Analyzes weather data against transport-specific thresholds."""
        risks = []
        if "timelines" not in weather_data:
            return risks

        # Sample logic for thresholds defined in implementation plan
        # Maritime: Wind Gusts > 35kts
        # Trucking: Precipitation > 0.8 in/hr
        
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
            precip = current.get("precipitationIntensity", 0)
            if precip > 0.8:
                risks.append({
                    "type": "Weather",
                    "factor": "Heavy Rain",
                    "severity": "High",
                    "value": f"{precip} in/hr"
                })
            
            visibility = current.get("visibility", 10)
            if visibility < 0.5:
                risks.append({
                    "type": "Weather",
                    "factor": "Low Visibility / Fog",
                    "severity": "Critical",
                    "value": f"{visibility} mi"
                })

        return risks
