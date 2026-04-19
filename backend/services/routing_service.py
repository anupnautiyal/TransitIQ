import os
import httpx
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

class RoutingService:
    def __init__(self):
        self.access_token = os.getenv("MAPBOX_ACCESS_TOKEN")
        self.base_url = "https://api.mapbox.com/directions/v5/mapbox/driving-traffic"

    async def get_route(self, origin: List[float], destination: List[float]) -> Dict[str, Any]:
        """Fetches optimized driving-traffic route between two points (lng, lat)."""
        if not self.access_token:
            return {"error": "Mapbox Token missing"}

        # Mapbox expects lng,lat
        coordinates = f"{origin[0]},{origin[1]};{destination[0]},{destination[1]}"
        url = f"{self.base_url}/{coordinates}"
        
        params = {
            "access_token": self.access_token,
            "geometries": "geojson",
            "overview": "full",
            "steps": "true"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                return {"error": str(e)}

    async def get_matrix(self, origins: List[List[float]], destinations: List[List[float]]) -> Dict[str, Any]:
        """Calculates travel times between multiple points using Mapbox Matrix API."""
        if not self.access_token:
             return {"error": "Mapbox Token missing"}

        # Combine coordinates for Matrix API: lng,lat;lng,lat...
        all_coords = origins + destinations
        coord_str = ";".join([f"{c[0]},{c[1]}" for c in all_coords])
        
        url = f"https://api.mapbox.com/directions-matrix/v1/mapbox/driving/{coord_str}"
        
        params = {
            "access_token": self.access_token,
            "sources": ";".join([str(i) for i in range(len(origins))]),
            "destinations": ";".join([str(i) for i in range(len(origins), len(all_coords))])
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                return {"error": str(e)}
    async def get_traffic_at_location(self, lat: float, lng: float) -> Dict[str, Any]:
        """
        Checks for live traffic congestion at a specific coordinate by querying a 
        small 1km segment near the location.
        """
        if not self.access_token:
            return {"error": "Mapbox Token missing"}

        # Define a small 1km segment (offset by ~0.009 degrees lat)
        segment = f"{lng},{lat};{lng},{lat+0.01}"
        url = f"{self.base_url}/{segment}"
        
        params = {
            "access_token": self.access_token,
            "annotations": "duration,congestion",
            "geometries": "geojson",
            "overview": "full"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                if "routes" in data and len(data["routes"]) > 0:
                    route = data["routes"][0]
                    # Mapbox returns duration and typical duration
                    duration = route.get("duration", 1)
                    typical = route.get("weight", duration) # 'weight' in driving-traffic is a good proxy for typical
                    
                    return {
                        "duration": duration,
                        "duration_typical": typical,
                        "congestion": route.get("legs", [{}])[0].get("annotation", {}).get("congestion", ["unknown"])[0]
                    }
                return {"congestion": "unknown"}
            except Exception as e:
                return {"error": str(e)}
