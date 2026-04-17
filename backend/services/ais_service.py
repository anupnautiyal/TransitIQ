import os
import json
import asyncio
import websockets # type: ignore
from typing import Dict, Any, Callable, Optional
from dotenv import load_dotenv

load_dotenv()

class AISService:
    def __init__(self):
        self.api_key = os.getenv("AISSTREAM_API_KEY")
        self.url = "wss://stream.aisstream.io/v0/stream"
        self.active_connections = []

    async def connect_and_listen(self, bounding_boxes: list, callback: Callable[[Dict[str, Any]], None]):
        """
        Connects to AISStream and listens for vessel updates in specific areas.
        
        bounding_boxes: List of lists [[lat1, lon1], [lat2, lon2]]
        callback: Function to handle incoming message
        """
        if not self.api_key:
            print("AISStream API Key missing")
            return

        subscribe_message = {
            "APIKey": self.api_key,
            "BoundingBoxes": bounding_boxes,
            "FiltersShipMMSI": [], # Option to filter by specific vessels
            "FilterMessageTypes": ["PositionReport"] 
        }

        async with websockets.connect(self.url) as websocket:
            await websocket.send(json.dumps(subscribe_message))

            async for message in websocket:
                data = json.loads(message)
                # Normalize AIS data to TransitIQ format
                normalized = self._normalize(data)
                if normalized:
                    await callback(normalized)

    def _normalize(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Converts raw AISStream JSON to TransitIQ internal format."""
        try:
            msg_type = data.get("MessageType")
            if msg_type != "PositionReport":
                return None
            
            meta = data.get("MetaData", {})
            msg = data.get("Message", {}).get("PositionReport", {})
            
            return {
                "vessel_name": meta.get("ShipName", "Unknown"),
                "mmsi": meta.get("MMSI"),
                "lat": meta.get("latitude"),
                "lng": meta.get("longitude"),
                "speed": msg.get("Sog", 0),
                "course": msg.get("Cog", 0),
                "timestamp": meta.get("time_utc")
            }
        except Exception:
            return None

# Usage note: This service is typically run in a background task within the FastAPI app.
