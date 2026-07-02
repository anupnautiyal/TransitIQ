import os
import httpx
from typing import List, Dict, Any
from .routing_service import RoutingService


class ReroutingEngine:
    def __init__(self, routing_service: RoutingService):
        self.routing_service = routing_service

    async def get_alternatives(
        self,
        origin: List[float],
        destination: List[float],
        current_risk_zone: Dict[str, Any] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetches alternative routes from Mapbox with alternatives=true.
        origin/destination are [lng, lat].
        """
        if not self.routing_service.access_token:
            return []

        coordinates = f"{origin[0]},{origin[1]};{destination[0]},{destination[1]}"
        url = f"{self.routing_service.base_url}/{coordinates}"

        params = {
            "access_token": self.routing_service.access_token,
            "geometries": "geojson",
            "overview": "full",
            "alternatives": "true",
            "steps": "false",
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=10)
                data = response.json()

            routes = data.get("routes", [])
            results = []
            for i, route in enumerate(routes):
                results.append({
                    "index": i,
                    "geometry": route.get("geometry", {}),
                    "distance_km": route.get("distance", 0) / 1000,
                    "duration_hours": route.get("duration", 0) / 3600,
                    "weight": route.get("weight", 0),
                })
            return results
        except Exception as e:
            print(f"ReroutingEngine: Error fetching alternatives: {e}")
            return []

    def recommend_best_path(self, routes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Selects the route with the best balance of safety and speed."""
        if not routes:
            return {}
        # Prefer the shortest duration that isn't the first route (current)
        candidates = routes[1:] if len(routes) > 1 else routes
        return min(candidates, key=lambda r: r.get("duration_hours", float("inf")))
