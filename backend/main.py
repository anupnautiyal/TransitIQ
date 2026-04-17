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
            id="SHP-001",
            origin=Location(lat=40.7128, lng=-74.0060, name="New York"),
            destination=Location(lat=34.0522, lng=-118.2437, name="Los Angeles"),
            current_location=Location(lat=39.0997, lng=-94.5786, name="Kansas City"),
            mode=TransportMode.TRUCKING,
            status=Status.IN_TRANSIT,
            eta="2026-04-19T10:00:00Z",
            risk_score=0.15
        ),
        Shipment(
            id="MT-002",
            origin=Location(lat=1.3521, lng=103.8198, name="Singapore"),
            destination=Location(lat=33.7701, lng=-118.1937, name="Long Beach"),
            current_location=Location(lat=5.0, lng=140.0, name="Pacific Ocean"),
            mode=TransportMode.MARITIME,
            status=Status.DELAYED,
            eta="2026-04-25T18:00:00Z",
            risk_score=0.85
        )
    ]

@app.get("/risks")
async def get_risks():
    """Returns a list of active disruptions/risks."""
    return {
        "active_disruptions": [
            {
                "id": "D-99",
                "type": "Weather",
                "severity": "High",
                "location": {"lat": 10.0, "lng": 135.0},
                "radius_km": 500,
                "description": "Tropical Storm in Pacific - Affecting Sea Lanes"
            }
        ]
    }

@app.post("/shipments/{shipment_id}/reroute")
async def calculate_reroute(shipment_id: str):
    """Calculates an alternative route for a shipment."""
    # Mock lookup for demo
    # In reality, this would fetch current shipment data and find alternatives
    return {
        "shipment_id": shipment_id,
        "current_route": {"time": "4.2h", "risk": 0.85},
        "recommended_route": {
            "time": "4.8h", 
            "risk": 0.15,
            "path_data": "...", # Encoded Mapbox geometry
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
