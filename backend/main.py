import os
import asyncio
from enum import Enum
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Import Services
from services.weather_service import WeatherService
from services.routing_service import RoutingService
from services.ais_service import AISService
from services.risk_engine import RiskEngine
from services.rerouting_engine import ReroutingEngine

# Load environment variables
load_dotenv()

app = FastAPI(title="TransitIQ API", version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For hackathon demo, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Services
weather_service = WeatherService()
routing_service = RoutingService()
ais_service = AISService()
risk_engine = RiskEngine()
rerouting_engine = ReroutingEngine(routing_service)

# Global state for AIS tracking
tracked_vessels: Dict[int, Any] = {}

async def ais_callback(data: Dict[str, Any]):
    mmsi = data.get("mmsi")
    if mmsi:
        tracked_vessels[mmsi] = data

@app.on_event("startup")
async def startup_event():
    # Example bounding box for Demo (near major ports)
    # This could be more dynamic based on active shipments
    try:
        # Long Beach / San Pedro area
        boxes = [[[-90, -180], [90, 180]]] # Global low-res or specific zones
        # asyncio.create_task(ais_service.connect_and_listen(boxes, ais_callback))
        pass
    except Exception as e:
        print(f"Failed to start AIS listener: {e}")

class TransportMode(str, Enum):
    MARITIME = "maritime"
    TRUCKING = "trucking"

class Status(str, Enum):
    IN_TRANSIT = "in_transit"
    DELAYED = "delayed"
    REROUTED = "rerouted"
    DELIVERED = "delivered"

class Location(BaseModel):
    lat: float
    lng: float
    name: Optional[str] = None

class Shipment(BaseModel):
    id: str
    origin: Location
    destination: Location
    current_location: Location
    mode: TransportMode
    status: Status
    eta: str
    risk_score: float = 0.0

@app.get("/")
async def root():
    return {"message": "Welcome to TransitIQ - Smart Supply Chain Intelligence"}

@app.get("/shipments", response_model=List[Shipment])
async def get_shipments():
    # Placeholder for database/simulation integration
    return [
        Shipment(
            id="TRK-DL-MH-01",
            origin=Location(lat=28.7041, lng=77.1025, name="New Delhi Hub"),
            destination=Location(lat=19.0760, lng=72.8777, name="Mumbai Port"),
            current_location=Location(lat=26.9124, lng=75.7873, name="NH48 near Jaipur"),
            mode=TransportMode.TRUCKING,
            status=Status.DELAYED,
            eta="2026-04-19T10:00:00Z",
            risk_score=0.85
        ),
        Shipment(
            id="TRK-TN-KA-02",
            origin=Location(lat=13.0827, lng=80.2707, name="Chennai Base"),
            destination=Location(lat=12.9716, lng=77.5946, name="Bangalore Depot"),
            current_location=Location(lat=12.9165, lng=79.1325, name="Vellore Toll"),
            mode=TransportMode.TRUCKING,
            status=Status.IN_TRANSIT,
            eta="2026-04-20T18:00:00Z",
            risk_score=0.15
        ),
        Shipment(
            id="TRK-WB-TS-03",
            origin=Location(lat=22.5726, lng=88.3639, name="Kolkata Hub"),
            destination=Location(lat=17.3850, lng=78.4867, name="Hyderabad Center"),
            current_location=Location(lat=16.5062, lng=80.6480, name="Vijayawada Approach"),
            mode=TransportMode.TRUCKING,
            status=Status.REROUTED,
            eta="2026-04-21T08:00:00Z",
            risk_score=0.45
        )
    ]

@app.get("/risks")
async def get_risks():
    """Returns a list of active disruptions/risks."""
    return {
        "active_disruptions": [
            {
                "id": "D-IN-01",
                "type": "Traffic",
                "severity": "High",
                "location": {"lat": 26.91, "lng": 75.79},
                "radius_km": 15,
                "description": "Massive pile-up on NH48 causing 3-hour delay"
            },
            {
                "id": "D-IN-02",
                "type": "Weather",
                "severity": "Medium",
                "location": {"lat": 16.50, "lng": 80.64},
                "radius_km": 50,
                "description": "Heavy monsoon washouts on coastal highway"
            }
        ]
    }

@app.get("/shipments/{shipment_id}/route")
async def get_shipment_route(shipment_id: str):
    """Fetches the current route GeoJSON for a shipment."""
    shipments = await get_shipments()
    shipment = next((s for s in shipments if s.id == shipment_id), None)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    route_data = await routing_service.get_route(
        [shipment.origin.lng, shipment.origin.lat], 
        [shipment.destination.lng, shipment.destination.lat]
    )
    
    if "routes" in route_data and len(route_data["routes"]) > 0:
         return {
            "path_data": route_data["routes"][0]["geometry"]
         }
    return {"path_data": None}

@app.post("/shipments/{shipment_id}/reroute")
async def calculate_reroute(shipment_id: str):
    """Calculates an alternative route for a shipment."""
    shipments = await get_shipments()
    shipment = next((s for s in shipments if s.id == shipment_id), None)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    # Fetch alternative routes using engine
    # As a mock alternative, we ask Mapbox to avoid an area or just pick an alternative route.
    # The rerouting_engine.get_alternatives does this.
    try:
         main_route = await routing_service.get_route(
            [shipment.current_location.lng, shipment.current_location.lat], 
            [shipment.destination.lng, shipment.destination.lat]
         )
         
         # Mock an alternate path by finding an alternative route or just slightly modifying it
         # Let's request alternatives from Mapbox directly via a custom call if possible, or just use the first alternative
         
         params = {
            "access_token": routing_service.access_token,
            "geometries": "geojson",
            "overview": "full",
            "alternatives": "true"
         }
         
         import httpx
         async with httpx.AsyncClient() as client:
             url = f"{routing_service.base_url}/{shipment.current_location.lng},{shipment.current_location.lat};{shipment.destination.lng},{shipment.destination.lat}"
             response = await client.get(url, params=params)
             route_data = response.json()
             
             path_data = None
             if "routes" in route_data:
                 if len(route_data["routes"]) > 1:
                     path_data = route_data["routes"][1]["geometry"] # take the alternate
                 elif len(route_data["routes"]) > 0:
                     path_data = route_data["routes"][0]["geometry"]
             
             return {
                "shipment_id": shipment_id,
                "current_route": {"time": "4.2h", "risk": 0.85},
                "recommended_route": {
                    "time": "4.8h", 
                    "risk": 0.15,
                    "path_data": path_data,
                    "reason": "Avoiding Severe Weather Cell D-99"
                }
             }

    except Exception as e:
        pass

    return {
        "shipment_id": shipment_id,
        "current_route": {"time": "4.2h", "risk": 0.85},
        "recommended_route": {
            "time": "4.8h", 
            "risk": 0.15,
            "path_data": {"type": "LineString", "coordinates": [[shipment.current_location.lng, shipment.current_location.lat], [shipment.destination.lng, shipment.destination.lat]]},
            "reason": "Avoiding Severe Weather Cell D-99"
        }
    }

@app.post("/shipments/{shipment_id}/execute")
async def execute_reroute(shipment_id: str):
    """Executes the reroute and updates shipment status (One-Click Reroute)."""
    # In a real app, this updates the database and potentially the TMS/Carrier
    return {
        "message": f"Shipment {shipment_id} successfully rerouted.",
        "new_status": "Rerouted",
        "new_eta": "2026-04-19T14:00:00Z"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
