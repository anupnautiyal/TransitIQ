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
    """Background task to poll live APIs and update global risk state."""
    global active_disruptions
    while True:
        try:
            print(f"IntelligenceAgent: Polling live environmental data (Chaos Mode: {SIMULATE_CHAOS})...")
            new_disruptions = []
            
            for s in live_shipments:
                # 1. Live Weather Check
                weather_data = await weather_service.get_weather_at_location(s.current_location.lat, s.current_location.lng)
                weather_risks = weather_service.analyze_risks(weather_data, s.mode.value)
                
                # 2. Live Traffic Check
                traffic_risk = await routing_service.get_traffic_at_location(s.current_location.lat, s.current_location.lng)
                
                # 3. Calculate Risk with ML Engine
                s.risk_score = risk_engine.calculate_shipment_risk(
                    weather_risks=weather_risks,
                    traffic_data=traffic_risk,
                    is_delayed=(s.status == Status.DELAYED),
                    transport_mode=s.mode.value,
                    distance_km=800.0
                )

                # 4. Chaos Injection (Demo Only)
                if SIMULATE_CHAOS and s.id == "TRK-DL-MH-01":
                     s.risk_score = 0.89
                     weather_risks = [{"factor": "Tropical Cyclone Warning", "severity": "Critical"}]
                     print(f"IntelligenceAgent: INJECTING CHAOS for {s.id}")
                
                print(f"IntelligenceAgent: Asset {s.id} | raw_score: {s.risk_score}")

                # 5. Generate Disruptions from high-risk events
                if s.risk_score >= ALERT_THRESHOLD:
                    reason = "Unfavorable Conditions detected by Sensor Fusion"
                    if weather_risks:
                        reason = f"Severe Weather: {weather_risks[0].get('factor')}"
                    elif traffic_risk.get("congestion") in ["heavy", "severe"]:
                        reason = f"Major Traffic Congestion detected by Mapbox"
                        
                    new_disruptions.append({
                        "id": f"D-{s.id}",
                        "type": "Weather" if weather_risks else "Traffic",
                        "severity": "High" if s.risk_score < 0.8 else "Critical",
                        "location": {"lat": s.current_location.lat, "lng": s.current_location.lng},
                        "radius_km": 25,
                        "description": reason
                    })
            
            active_disruptions = new_disruptions
            print(f"IntelligenceAgent: Successfully updated scores. Detected {len(active_disruptions)} disruptions.")
            
        except Exception as e:
            print(f"IntelligenceAgent Error: {e}")
            
        await asyncio.sleep(60) # Poll every 1 minute in "Chaos Mode" for faster feedback

@app.on_event("startup")
async def startup_event():
    # Start the Proactive Intelligence Agent
    asyncio.create_task(refresh_intelligence())
    
    # Optional: AIS listener could be started here too
    pass

class ShipmentCreate(BaseModel):
    origin: str
    destination: str
    cargo: str
    mode: str = "trucking"

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
    origin_coords = CITY_COORDINATES.get(data.origin, CITY_COORDINATES["Delhi"])
    dest_coords = CITY_COORDINATES.get(data.destination, CITY_COORDINATES["Bangalore"])
    
    new_shipment = Shipment(
        id=f"TRK-{data.origin[:2].upper()}-{data.destination[:2].upper()}-{len(live_shipments)+1:02d}",
        origin=Location(lat=origin_coords["lat"], lng=origin_coords["lng"], name=f"{data.origin} Hub"),
        destination=Location(lat=dest_coords["lat"], lng=dest_coords["lng"], name=f"{data.destination} Center"),
        current_location=Location(lat=origin_coords["lat"], lng=origin_coords["lng"], name=f"Departing {data.origin}"),
        mode=TransportMode(data.mode),
        status=Status.IN_TRANSIT,
        eta="2026-04-21T12:00:00Z",
        risk_score=0.0
    )
    
    live_shipments.append(new_shipment)
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
    # In a real app, this updates the database and potentially the TMS/Carrier
    return {
        "message": f"Shipment {shipment_id} successfully rerouted.",
        "new_status": "Rerouted",
        "new_eta": "2026-04-19T14:00:00Z"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
