import os
import asyncio
import json
import uuid
import logging
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
from services.traffic_service import TrafficService

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
traffic_service = TrafficService()

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
    place_id: Optional[str] = None

class Shipment(BaseModel):
    id: str
    origin: Location
    destination: Location
    current_location: Location
    mode: TransportMode
    status: Status
    eta: str
    risk_score: float = 0.0
    cargo_type: str = "General"
    priority: str = "Standard"
    value_usd: float = 0.0
    route_geometry: Optional[List[List[float]]] = None # List of [lng, lat]
    current_step: int = 0

# Global state for Live Analytics
active_disruptions: List[Dict[str, Any]] = []
live_shipments: List[Shipment] = [
    Shipment(
        id="TRK-DL-MH-01",
        origin=Location(lat=28.7041, lng=77.1025, name="New Delhi Hub"),
        destination=Location(lat=19.0760, lng=72.8777, name="Mumbai Port"),
        current_location=Location(lat=26.9124, lng=75.7873, name="NH48 near Jaipur"),
        mode=TransportMode.TRUCKING,
        status=Status.DELAYED,
        eta="2026-04-19T10:00:00Z"
    ),
    Shipment(
        id="TRK-TN-KA-02",
        origin=Location(lat=13.0827, lng=80.2707, name="Chennai Base"),
        destination=Location(lat=12.9716, lng=77.5946, name="Bangalore Depot"),
        current_location=Location(lat=12.9165, lng=79.1325, name="Vellore Toll"),
        mode=TransportMode.TRUCKING,
        status=Status.IN_TRANSIT,
        eta="2026-04-20T18:00:00Z"
    ),
    Shipment(
        id="TRK-WB-TS-03",
        origin=Location(lat=22.5726, lng=88.3639, name="Kolkata Hub"),
        destination=Location(lat=17.3850, lng=78.4867, name="Hyderabad Center"),
        current_location=Location(lat=16.5062, lng=80.6480, name="Vijayawada Approach"),
        mode=TransportMode.TRUCKING,
        status=Status.REROUTED,
        eta="2026-04-21T08:00:00Z"
    )
]

# Operational Configuration
SIMULATE_CHAOS = True  # Set to True to force a "High Risk" event for Demo verification
ALERT_THRESHOLD = 0.2  # Threshold to trigger an active disruption in the map feed

async def refresh_intelligence():
    """Background task to poll live APIs and update global risk state with motion simulation."""
    global active_disruptions
    while True:
        try:
            print(f"IntelligenceAgent: Polling live environmental data (Chaos Mode: {SIMULATE_CHAOS})...")
            new_disruptions = []
            
            for s in live_shipments:
                # 0. Motion Simulation: Fetch route if missing
                if not s.route_geometry:
                    print(f"IntelligenceAgent: Fetching initial route for {s.id}")
                    max_retries = 3
                    for attempt in range(max_retries):
                        try:
                            route_data = await routing_service.get_route(
                                [s.origin.lng, s.origin.lat], 
                                [s.destination.lng, s.destination.lat]
                            )
                            if "routes" in route_data and len(route_data["routes"]) > 0:
                                s.route_geometry = route_data["routes"][0]["geometry"]["coordinates"]
                                s.current_step = 0
                                break
                            else:
                                print(f"IntelligenceAgent: No routes found for {s.id} (Attempt {attempt + 1}/{max_retries})")
                        except Exception as e:
                            print(f"IntelligenceAgent: Failed to fetch route for {s.id}: {e} (Attempt {attempt + 1}/{max_retries})")
                        
                        if attempt < max_retries - 1:
                            await asyncio.sleep(2) # Delay before retry
                        else:
                            print(f"IntelligenceAgent: Giving up on route fetch for {s.id} after {max_retries} attempts.")
                
                # 0.1 Move the truck
                if s.route_geometry and s.status != Status.DELIVERED:
                    s.current_step = (s.current_step + 1) % len(s.route_geometry)
                    new_pos = s.route_geometry[s.current_step]
                    s.current_location.lng = new_pos[0]
                    s.current_location.lat = new_pos[1]
                    
                    if s.current_step == len(s.route_geometry) - 1:
                        s.status = Status.DELIVERED
                        print(f"IntelligenceAgent: Asset {s.id} has reached its destination.")

                # 1. Live Weather Check (Tomorrow.io)
                weather_data = await weather_service.get_weather_at_location(s.current_location.lat, s.current_location.lng)
                weather_risks = weather_service.analyze_risks(weather_data, s.mode.value)
                
                # 2. Live Traffic Check (TomTom)
                traffic_risk = await traffic_service.get_traffic_at_location(s.current_location.lat, s.current_location.lng)
                
                # 3. Calculate Risk with ML Engine
                s.risk_score = risk_engine.calculate_shipment_risk(
                    weather_risks=weather_risks,
                    traffic_data=traffic_risk,
                    is_delayed=(s.status == Status.DELAYED),
                    transport_mode=s.mode.value,
                    distance_km=800.0,
                    priority=s.priority
                )

                # 4. Chaos Injection (Demo Only - Trigger at midpoint)
                # If truck is halfway, simulate a severe weather event if not already rerouted
                midpoint = len(s.route_geometry) // 2 if s.route_geometry else -1
                if SIMULATE_CHAOS and s.id == "TRK-DL-MH-01" and s.current_step == midpoint and s.status != Status.REROUTED:
                     s.risk_score = 0.95
                     weather_risks = [{"factor": "Sudden Flash Flood Warning", "severity": "Critical"}]
                     print(f"IntelligenceAgent: TRIGGERING PLANNED DISRUPTION for {s.id}")
                
                print(f"IntelligenceAgent: Asset {s.id} | Pos: {s.current_step}/{len(s.route_geometry) if s.route_geometry else '?'} | Score: {s.risk_score}")

                # 5. Generate Disruptions from high-risk events (Sidebar Alerts)
                if s.risk_score >= 0.4: # Only show significant risks in the intelligence feed
                    risk_type = "Environmental"
                    reason = "Complex Risk Pattern detected"
                    
                    if weather_risks and traffic_risk.get("congestion") in ["heavy", "moderate"]:
                        risk_type = "Multi-Factor"
                        reason = f"Combined {weather_risks[0].get('factor')} & Traffic Congestion"
                    elif weather_risks:
                        risk_type = "Weather"
                        reason = f"Severe {weather_risks[0].get('factor')} detected"
                    elif traffic_risk.get("congestion_index", 0) > 0:
                        risk_type = "Traffic"
                        c_idx = traffic_risk.get("congestion_index", 0)
                        reason = f"Traffic Congestion (Index: {c_idx}) detected by TomTom"
                        
                    new_disruptions.append({
                        "id": f"D-{s.id}-{s.current_step}",
                        "shipment_id": s.id,
                        "type": risk_type,
                        "severity": "High" if s.risk_score < 0.8 else "Critical",
                        "location": {"lat": s.current_location.lat, "lng": s.current_location.lng},
                        "radius_km": 25,
                        "description": f"{reason} for Asset {s.id}"
                    })
            
            active_disruptions = new_disruptions
            print(f"IntelligenceAgent: Cycle complete. {len(active_disruptions)} active disruptions.")
            
        except Exception as e:
            print(f"IntelligenceAgent Error: {e}")
            
        await asyncio.sleep(10) # Faster cycle for Demo (10s instead of 60s)

SHIPMENTS_FILE = os.path.join(os.path.dirname(__file__), "data", "shipments.json")

def save_shipments_to_disk() -> bool:
    """Saves live shipments to JSON file with error handling."""
    try:
        os.makedirs(os.path.dirname(SHIPMENTS_FILE), exist_ok=True)
        with open(SHIPMENTS_FILE, "w") as f:
            json.dump([s.dict() for s in live_shipments], f, indent=2)
        return True
    except (OSError, TypeError) as e:
        print(f"IntelligenceAgent: Failed to save shipments: {e}")
        return False
    except Exception as e:
        print(f"IntelligenceAgent: Unexpected error during save: {e}")
        return False

def load_shipments_from_disk():
    global live_shipments
    if os.path.exists(SHIPMENTS_FILE):
        try:
            with open(SHIPMENTS_FILE, "r") as f:
                data = json.load(f)
                live_shipments = [Shipment(**s) for s in data]
                print(f"IntelligenceAgent: Restored {len(live_shipments)} shipments from disk.")
        except Exception as e:
            print(f"IntelligenceAgent: Failed to restore shipments: {e}")

@app.on_event("startup")
async def startup_event():
    # Restore state
    load_shipments_from_disk()
    # Start the Proactive Intelligence Agent
    asyncio.create_task(refresh_intelligence())
    pass

class LocationCreate(BaseModel):
    name: str
    lat: float
    lng: float

class ShipmentCreate(BaseModel):
    origin: LocationCreate
    destination: LocationCreate
    cargo: str
    mode: str = "trucking"
    priority: str = "Standard"
    value: float = 0.0

@app.get("/geocoding/search")
async def search_geocoding(query: str):
    """Proxy for Mapbox Geocoding with validation."""
    clean_query = query.strip()
    if not clean_query:
        raise HTTPException(status_code=400, detail="Query parameter cannot be empty or whitespace.")
    
    try:
        return await routing_service.search_location(clean_query)
    except Exception as e:
        print(f"Geocoding Proxy Error: {e}")
        raise HTTPException(status_code=502, detail="Geocoding service is temporarily unavailable.")

CITY_COORDINATES = {
    "Delhi": {"lat": 28.7041, "lng": 77.1025},
    "Mumbai": {"lat": 19.0760, "lng": 72.8777},
    "Chennai": {"lat": 13.0827, "lng": 80.2707},
    "Kolkata": {"lat": 22.5726, "lng": 88.3639},
    "Bangalore": {"lat": 12.9716, "lng": 77.5946},
    "Hyderabad": {"lat": 17.3850, "lng": 78.4867},
    "Pune": {"lat": 18.5204, "lng": 73.8567},
    "Ahmedabad": {"lat": 23.0225, "lng": 72.5714},
}

@app.get("/shipments", response_model=List[Shipment])
async def get_shipments():
    # Returns the dynamically updated shipments
    return live_shipments

@app.post("/shipments", response_model=Shipment)
async def create_shipment(data: ShipmentCreate):
    # Collision-resistant ID generation
    origin_code = (data.origin.name[:2] if data.origin.name else "XX").upper()
    dest_code = (data.destination.name[:2] if data.destination.name else "XX").upper()
    unique_token = str(uuid.uuid4())[:4].upper()
    
    new_shipment = Shipment(
        id=f"TRK-{origin_code}-{dest_code}-{unique_token}",
        origin=Location(lat=data.origin.lat, lng=data.origin.lng, name=data.origin.name),
        destination=Location(lat=data.destination.lat, lng=data.destination.lng, name=data.destination.name),
        current_location=Location(lat=data.origin.lat, lng=data.origin.lng, name=f"Departing {data.origin.name}"),
        mode=TransportMode(data.mode),
        status=Status.IN_TRANSIT,
        eta="2026-04-21T12:00:00Z",
        risk_score=0.0,
        cargo_type=data.cargo,
        priority=data.priority,
        value_usd=data.value
    )
    
    live_shipments.append(new_shipment)
    save_shipments_to_disk()
    print(f"IntelligenceAgent: New shipment registered: {new_shipment.id}")
    return new_shipment

@app.get("/risks")
async def get_risks():
    """Returns a list of dynamically discovered disruptions."""
    return {"active_disruptions": active_disruptions}

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
             
             # Calculate Dynamic Risks for the UI comparison
             current_context = await get_shipments()
             target_s = next((s for s in current_context if s.id == shipment_id), shipment)
             
             # ML prediction for recommended route (Assume 0 weather/traffic risk for the alternate)
             rec_risk = risk_engine.calculate_shipment_risk(
                weather_risks=[], 
                traffic_data=None, 
                is_delayed=False,
                transport_mode=target_s.mode.value,
                distance_km=900.0 # Alternate might be longer
             )

             return {
                "shipment_id": shipment_id,
                "current_route": {"time": "4.2h", "risk": target_s.risk_score},
                "recommended_route": {
                    "time": "4.8h", 
                    "risk": rec_risk,
                    "path_data": path_data,
                    "reason": "Avoiding Severe Weather Cell D-99"
                }
             }

    except Exception as e:
        print(f"Reroute error: {e}")
        pass

    return {
        "shipment_id": shipment_id,
        "current_route": {"time": "4.2h", "risk": 0.85},
        "recommended_route": {
            "time": "4.8h", 
            "risk": 0.05,
            "path_data": {"type": "LineString", "coordinates": [[shipment.current_location.lng, shipment.current_location.lat], [shipment.destination.lng, shipment.destination.lat]]},
            "reason": "Avoiding Severe Weather Cell D-99"
        }
    }

@app.post("/shipments/{shipment_id}/execute")
async def execute_reroute(shipment_id: str):
    """Executes the reroute and updates shipment status (One-Click Reroute)."""
    global live_shipments
    shipment = next((s for s in live_shipments if s.id == shipment_id), None)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    # Update status and reset route progress
    shipment.status = Status.REROUTED
    shipment.route_geometry = None # Force refresh on next intelligence cycle
    shipment.current_step = 0
    
    save_shipments_to_disk()
    print(f"IntelligenceAgent: Asset {shipment_id} successfully rerouted.")
    
    return {
        "message": f"Shipment {shipment_id} successfully rerouted.",
        "new_status": "Rerouted",
        "new_eta": "2026-04-19T14:00:00Z"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
