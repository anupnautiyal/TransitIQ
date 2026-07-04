import os
import asyncio
import json
import uuid
import time
import logging
from enum import Enum
from typing import List, Optional, Dict, Any, Set
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
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

app = FastAPI(title="TransitIQ API", version="2.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────

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
    route_geometry: Optional[List[List[float]]] = None
    current_step: int = 0
    total_steps: int = 0

# ─────────────────────────────────────────────
# Simulation State
# ─────────────────────────────────────────────

simulation_state = {
    "running": False,
    "speed": 1.0,          # multiplier: 1x, 2x, 4x
    "steps_per_tick": 2,   # base steps per 1.5s tick
    "tick_interval": 1.5,  # seconds between ticks
    "elapsed_seconds": 0,
    "started_at": None,
}

# ─────────────────────────────────────────────
# Demo Scenario: Mumbai → Pune (Primary)
# ─────────────────────────────────────────────

DEMO_SHIPMENTS = [
    Shipment(
        id="TRK-MH-MH-01",
        origin=Location(lat=19.0760, lng=72.8777, name="Mumbai Port"),
        destination=Location(lat=18.5204, lng=73.8567, name="Pune Warehouse"),
        current_location=Location(lat=19.0760, lng=72.8777, name="Mumbai Port"),
        mode=TransportMode.TRUCKING,
        status=Status.IN_TRANSIT,
        eta="2026-07-01T18:00:00Z",
        cargo_type="Electronics",
        priority="High",
        value_usd=125000.0,
    ),
    Shipment(
        id="TRK-DL-MH-02",
        origin=Location(lat=28.7041, lng=77.1025, name="New Delhi Hub"),
        destination=Location(lat=19.0760, lng=72.8777, name="Mumbai Port"),
        current_location=Location(lat=28.7041, lng=77.1025, name="New Delhi Hub"),
        mode=TransportMode.TRUCKING,
        status=Status.IN_TRANSIT,
        eta="2026-07-02T10:00:00Z",
        cargo_type="Automotive Parts",
        priority="Standard",
        value_usd=85000.0,
    ),
    Shipment(
        id="TRK-TN-KA-03",
        origin=Location(lat=13.0827, lng=80.2707, name="Chennai Base"),
        destination=Location(lat=12.9716, lng=77.5946, name="Bangalore Depot"),
        current_location=Location(lat=13.0827, lng=80.2707, name="Chennai Base"),
        mode=TransportMode.TRUCKING,
        status=Status.IN_TRANSIT,
        eta="2026-07-01T20:00:00Z",
        cargo_type="Textiles",
        priority="Standard",
        value_usd=45000.0,
    ),
]

# Disruption config for the Mumbai→Pune demo truck
DEMO_DISRUPTION = {
    "shipment_id": "TRK-MH-MH-01",
    "trigger_at_pct": 0.45,          # trigger at 45% of route
    "risk_score": 0.92,
    "weather_risks": [{"factor": "Heavy Rainfall & Flooding", "severity": "Critical"}],
    "disruption_type": "Weather",
    "description": "Severe rainfall warning on Mumbai-Pune Expressway near Lonavala",
    "auto_reroute_reason": "Avoiding Heavy Rainfall & Flooding near Lonavala — rerouting via alternate highway",
}

# Global state
active_disruptions: List[Dict[str, Any]] = []
live_shipments: List[Shipment] = [s for s in DEMO_SHIPMENTS]
disruption_triggered: Dict[str, bool] = {}  # track which shipments already triggered

# ─────────────────────────────────────────────
# WebSocket Connection Manager
# ─────────────────────────────────────────────

connected_clients: Set[WebSocket] = set()

async def broadcast_positions():
    """Broadcasts shipment positions to all connected WebSocket clients."""
    while True:
        if connected_clients:
            payload = json.dumps({
                "type": "position_update",
                "shipments": [s.dict() for s in live_shipments],
                "disruptions": active_disruptions,
                "simulation": {
                    "running": simulation_state["running"],
                    "speed": simulation_state["speed"],
                    "elapsed": simulation_state["elapsed_seconds"],
                },
                "timestamp": time.time(),
            }, default=str)
            
            disconnected = set()
            for ws in connected_clients:
                try:
                    await ws.send_text(payload)
                except Exception:
                    disconnected.add(ws)
            connected_clients.difference_update(disconnected)
        
        await asyncio.sleep(simulation_state["tick_interval"])

# ─────────────────────────────────────────────
# Route Fetching Helper
# ─────────────────────────────────────────────

async def fetch_route_for_shipment(s: Shipment) -> bool:
    """Fetches and assigns a route geometry for a shipment. Returns True on success."""
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
                s.total_steps = len(s.route_geometry)
                return True
            else:
                print(f"RouteFetch: No routes for {s.id} (attempt {attempt+1})")
        except Exception as e:
            print(f"RouteFetch: Error for {s.id}: {e} (attempt {attempt+1})")
        
        if attempt < max_retries - 1:
            await asyncio.sleep(1)
    
    print(f"RouteFetch: Giving up on {s.id} after {max_retries} attempts")
    return False

async def fetch_reroute_for_shipment(s: Shipment) -> bool:
    """Fetches an alternative route from current_location to destination. Returns True on success."""
    try:
        import httpx
        params = {
            "access_token": routing_service.access_token,
            "geometries": "geojson",
            "overview": "full",
            "alternatives": "true",
        }
        url = (
            f"{routing_service.base_url}/"
            f"{s.current_location.lng},{s.current_location.lat};"
            f"{s.destination.lng},{s.destination.lat}"
        )
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10)
            route_data = response.json()
        
        if "routes" in route_data and len(route_data["routes"]) > 0:
            # Pick the alternate if available, else the main route
            best = route_data["routes"][1] if len(route_data["routes"]) > 1 else route_data["routes"][0]
            s.route_geometry = best["geometry"]["coordinates"]
            s.current_step = 0
            s.total_steps = len(s.route_geometry)
            return True
    except Exception as e:
        print(f"RerouteFetch: Error for {s.id}: {e}")
    return False

# ─────────────────────────────────────────────
# Core Simulation Loop
# ─────────────────────────────────────────────

async def refresh_intelligence():
    """Accelerated background simulation: moves trucks, checks risks, auto-reroutes."""
    global active_disruptions
    
    while True:
        try:
            # Wait if paused
            if not simulation_state["running"]:
                await asyncio.sleep(0.5)
                continue
            
            # Carry over active disruptions that are already resolved/rerouted,
            # as long as their corresponding shipment is still in transit (not delivered).
            active_shipment_ids = {s.id for s in live_shipments if s.status != Status.DELIVERED}
            new_disruptions = [
                d for d in active_disruptions
                if (d.get("auto_rerouted") or d.get("resolved") or d.get("status") == "rerouted")
                and d.get("shipment_id") in active_shipment_ids
            ]

            
            for s in live_shipments:
                # Skip delivered or paused shipments
                if s.status == Status.DELIVERED:
                    continue
                
                # Fetch route if missing
                if not s.route_geometry:
                    await fetch_route_for_shipment(s)
                    if not s.route_geometry:
                        continue
                
                # Calculate step size dynamically for this shipment so it takes exactly 2 minutes (120s) at 1x speed.
                # Total ticks at 1x speed = 120s / tick_interval = 120 / 1.5 = 80 ticks.
                target_duration = 120.0  # 2 minutes
                ticks_needed = target_duration / simulation_state["tick_interval"]
                base_steps = s.total_steps / ticks_needed
                steps_float = base_steps * simulation_state["speed"]
                shipment_steps = max(1, int(steps_float))
                
                # ── Move the truck ──
                for _ in range(shipment_steps):
                    if s.current_step < s.total_steps - 1:
                        s.current_step += 1
                        pos = s.route_geometry[s.current_step]
                        s.current_location.lng = pos[0]
                        s.current_location.lat = pos[1]
                
                # Check delivery
                if s.current_step >= s.total_steps - 1:
                    s.status = Status.DELIVERED
                    print(f"Delivered: {s.id} reached {s.destination.name}")
                    continue
                
                # ── Risk Assessment ──
                # Check for demo disruption injection
                progress_pct = s.current_step / s.total_steps if s.total_steps > 0 else 0
                demo = DEMO_DISRUPTION
                if (
                    s.id == demo["shipment_id"]
                    and progress_pct >= demo["trigger_at_pct"]
                    and not disruption_triggered.get(s.id)
                ):
                    # Inject demo disruption
                    s.risk_score = demo["risk_score"]
                    weather_risks = demo["weather_risks"]
                    if s.status == Status.IN_TRANSIT:
                        s.status = Status.DELAYED
                    print(f"DISRUPTION: Triggering demo event for {s.id} at {progress_pct:.0%}")
                else:
                    # Live weather check
                    weather_data = await weather_service.get_weather_at_location(
                        s.current_location.lat, s.current_location.lng
                    )
                    weather_risks = weather_service.analyze_risks(weather_data, s.mode.value)
                    
                    # Live traffic check
                    traffic_risk = await traffic_service.get_traffic_at_location(
                        s.current_location.lat, s.current_location.lng
                    )
                    
                    # ML risk calculation
                    s.risk_score = risk_engine.calculate_shipment_risk(
                        weather_risks=weather_risks,
                        traffic_data=traffic_risk,
                        is_delayed=(s.status == Status.DELAYED),
                        transport_mode=s.mode.value,
                        distance_km=200.0,
                        priority=s.priority,
                    )
                    
                    if s.risk_score >= 0.7 and s.status == Status.IN_TRANSIT:
                        s.status = Status.DELAYED
                    elif s.risk_score < 0.7 and s.status == Status.DELAYED:
                        s.status = Status.IN_TRANSIT
                
                # ── Auto-Reroute Logic ──
                if (
                    s.risk_score >= 0.7
                    and s.status != Status.REROUTED
                    and s.id == demo["shipment_id"]
                    and not disruption_triggered.get(s.id)
                ):
                    print(f"AUTO-REROUTE: {s.id} risk={s.risk_score:.2f}, fetching alternative...")
                    
                    old_route_steps = s.total_steps
                    success = await fetch_reroute_for_shipment(s)
                    
                    if success:
                        disruption_triggered[s.id] = True
                        s.status = Status.REROUTED
                        new_steps = s.total_steps
                        
                        new_disruptions.append({
                            "id": f"D-{s.id}-{int(time.time())}",
                            "shipment_id": s.id,
                            "type": demo["disruption_type"],
                            "severity": "Critical",
                            "location": {"lat": s.current_location.lat, "lng": s.current_location.lng},
                            "radius_km": 30,
                            "description": demo["description"],
                            "auto_rerouted": True,
                            "auto_reroute_reason": demo["auto_reroute_reason"],
                            "old_route_steps": old_route_steps,
                            "new_route_steps": new_steps,
                        })
                        
                        print(f"AUTO-REROUTE: {s.id} success. New route: {new_steps} steps (was {old_route_steps})")
                    else:
                        print(f"AUTO-REROUTE: {s.id} failed, continuing on current route")
                
                # ── Generate Disruption Events (for sidebar) ──
                if s.risk_score >= 0.4 and not disruption_triggered.get(s.id):
                    risk_type = "Environmental"
                    reason = "Complex risk pattern detected"
                    
                    if weather_risks and isinstance(weather_risks, list) and len(weather_risks) > 0:
                        risk_type = "Weather"
                        reason = f"Severe {weather_risks[0].get('factor', 'weather event')} detected"
                    
                    new_disruptions.append({
                        "id": f"D-{s.id}-{s.current_step}",
                        "shipment_id": s.id,
                        "type": risk_type,
                        "severity": "High" if s.risk_score < 0.8 else "Critical",
                        "location": {"lat": s.current_location.lat, "lng": s.current_location.lng},
                        "radius_km": 25,
                        "description": f"{reason} for Asset {s.id}",
                        "auto_rerouted": False,
                    })
                
                progress_str = f"{s.current_step}/{s.total_steps}" if s.total_steps else "?"
                print(f"Tick: {s.id} | Step {progress_str} ({progress_pct:.0%}) | Risk: {s.risk_score:.2f} | Status: {s.status.value}")
            
            active_disruptions = new_disruptions
            simulation_state["elapsed_seconds"] += simulation_state["tick_interval"]
            
        except Exception as e:
            print(f"SimulationError: {e}")
        
        # Sleep for the tick interval, adjusted by speed
        sleep_time = simulation_state["tick_interval"] / max(1, simulation_state["speed"])
        await asyncio.sleep(max(0.3, sleep_time))

# ─────────────────────────────────────────────
# Persistence
# ─────────────────────────────────────────────

SHIPMENTS_FILE = os.path.join(os.path.dirname(__file__), "data", "shipments.json")

def save_shipments_to_disk() -> bool:
    try:
        os.makedirs(os.path.dirname(SHIPMENTS_FILE), exist_ok=True)
        with open(SHIPMENTS_FILE, "w") as f:
            json.dump([s.dict() for s in live_shipments], f, indent=2)
        return True
    except Exception as e:
        print(f"SaveError: {e}")
        return False

def load_shipments_from_disk():
    global live_shipments
    if os.path.exists(SHIPMENTS_FILE):
        try:
            with open(SHIPMENTS_FILE, "r") as f:
                data = json.load(f)
                live_shipments = [Shipment(**s) for s in data]
                print(f"Loaded {len(live_shipments)} shipments from disk.")
        except Exception as e:
            print(f"LoadError: {e}")

# ─────────────────────────────────────────────
# Startup
# ─────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    # Always use demo scenario (fresh start)
    live_shipments.clear()
    for s in DEMO_SHIPMENTS:
        live_shipments.append(s.model_copy(deep=True))
    disruption_triggered.clear()
    
    # Fetch routes in background
    async def fetch_all_routes():
        for s in live_shipments:
            await fetch_route_for_shipment(s)
        print(f"Routes fetched for {len(live_shipments)} demo shipments.")
    
    asyncio.create_task(fetch_all_routes())
    asyncio.create_task(refresh_intelligence())
    asyncio.create_task(broadcast_positions())

# ─────────────────────────────────────────────
# WebSocket Endpoint
# ─────────────────────────────────────────────

@app.websocket("/ws/fleet")
async def websocket_fleet(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    print(f"WS: Client connected ({len(connected_clients)} total)")
    try:
        # Send initial state immediately
        await websocket.send_json({
            "type": "position_update",
            "shipments": [s.dict() for s in live_shipments],
            "disruptions": active_disruptions,
            "simulation": {
                "running": simulation_state["running"],
                "speed": simulation_state["speed"],
                "elapsed": simulation_state["elapsed_seconds"],
            },
            "timestamp": time.time(),
        })
        # Keep connection alive, listen for client messages
        while True:
            data = await websocket.receive_text()
            # Client can send commands (e.g., "ping")
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        connected_clients.discard(websocket)
        print(f"WS: Client disconnected ({len(connected_clients)} total)")

# ─────────────────────────────────────────────
# Simulation Control Endpoints
# ─────────────────────────────────────────────

class SpeedRequest(BaseModel):
    multiplier: float

@app.post("/simulation/play")
async def simulation_play():
    simulation_state["running"] = True
    if not simulation_state["started_at"]:
        simulation_state["started_at"] = time.time()
    return {"running": True, "speed": simulation_state["speed"]}

@app.post("/simulation/pause")
async def simulation_pause():
    simulation_state["running"] = False
    return {"running": False}

@app.post("/simulation/reset")
async def simulation_reset():
    simulation_state["running"] = False
    simulation_state["elapsed_seconds"] = 0
    simulation_state["started_at"] = None
    disruption_triggered.clear()
    
    live_shipments.clear()
    for s in DEMO_SHIPMENTS:
        live_shipments.append(s.model_copy(deep=True))
    
    # Re-fetch routes
    asyncio.create_task(fetch_all_routes())
    
    return {"message": "Simulation reset", "shipments": len(live_shipments)}

async def fetch_all_routes():
    for s in live_shipments:
        await fetch_route_for_shipment(s)
    print(f"Routes fetched for {len(live_shipments)} shipments.")

@app.post("/simulation/speed")
async def simulation_speed(req: SpeedRequest):
    simulation_state["speed"] = max(0.5, min(4.0, req.multiplier))
    return {"speed": simulation_state["speed"]}

@app.get("/simulation/status")
async def simulation_status():
    progress = {}
    for s in live_shipments:
        pct = (s.current_step / s.total_steps * 100) if s.total_steps > 0 else 0
        progress[s.id] = {
            "step": s.current_step,
            "total": s.total_steps,
            "percent": round(pct, 1),
            "status": s.status.value,
        }
    return {
        "running": simulation_state["running"],
        "speed": simulation_state["speed"],
        "elapsed_seconds": simulation_state["elapsed_seconds"],
        "shipments": progress,
    }

# ─────────────────────────────────────────────
# Existing API Endpoints (kept intact)
# ─────────────────────────────────────────────

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
    clean_query = query.strip()
    if not clean_query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    try:
        return await routing_service.search_location(clean_query)
    except Exception as e:
        print(f"Geocoding error: {e}")
        raise HTTPException(status_code=502, detail="Geocoding unavailable.")

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
    return live_shipments

@app.post("/shipments", response_model=Shipment)
async def create_shipment(data: ShipmentCreate):
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
        eta="2026-07-02T12:00:00Z",
        risk_score=0.0,
        cargo_type=data.cargo,
        priority=data.priority,
        value_usd=data.value,
    )
    
    live_shipments.append(new_shipment)
    save_shipments_to_disk()
    return new_shipment

@app.get("/risks")
async def get_risks():
    return {"active_disruptions": active_disruptions}

@app.get("/quota/status")
async def get_quota_status():
    return {
        "used": traffic_service.usage_today,
        "total": traffic_service.max_daily_quota,
        "remaining": max(0, traffic_service.max_daily_quota - traffic_service.usage_today),
        "percentage": round((traffic_service.usage_today / traffic_service.max_daily_quota) * 100, 2),
    }

@app.get("/shipments/{shipment_id}/route")
async def get_shipment_route(shipment_id: str):
    shipment = next((s for s in live_shipments if s.id == shipment_id), None)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    if shipment.route_geometry:
        return {"path_data": {"type": "LineString", "coordinates": shipment.route_geometry}}
    
    route_data = await routing_service.get_route(
        [shipment.origin.lng, shipment.origin.lat],
        [shipment.destination.lng, shipment.destination.lat],
    )
    if "routes" in route_data and len(route_data["routes"]) > 0:
        return {"path_data": route_data["routes"][0]["geometry"]}
    return {"path_data": None}

@app.post("/shipments/{shipment_id}/reroute")
async def calculate_reroute(shipment_id: str):
    shipment = next((s for s in live_shipments if s.id == shipment_id), None)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    try:
        params = {
            "access_token": routing_service.access_token,
            "geometries": "geojson",
            "overview": "full",
            "alternatives": "true",
        }
        import httpx
        async with httpx.AsyncClient() as client:
            url = (
                f"{routing_service.base_url}/"
                f"{shipment.current_location.lng},{shipment.current_location.lat};"
                f"{shipment.destination.lng},{shipment.destination.lat}"
            )
            response = await client.get(url, params=params)
            route_data = response.json()

            path_data = None
            if "routes" in route_data:
                if len(route_data["routes"]) > 1:
                    path_data = route_data["routes"][1]["geometry"]
                elif len(route_data["routes"]) > 0:
                    path_data = route_data["routes"][0]["geometry"]

            rec_risk = risk_engine.calculate_shipment_risk(
                weather_risks=[],
                traffic_data=None,
                is_delayed=False,
                transport_mode=shipment.mode.value,
                distance_km=250.0,
            )

            return {
                "shipment_id": shipment_id,
                "current_route": {"time": "3.5h", "risk": shipment.risk_score},
                "recommended_route": {
                    "time": "4.0h",
                    "risk": rec_risk,
                    "path_data": path_data,
                    "reason": "Avoiding Severe Weather Cell D-99",
                },
            }
    except Exception as e:
        print(f"Reroute error: {e}")

    return {
        "shipment_id": shipment_id,
        "current_route": {"time": "3.5h", "risk": 0.85},
        "recommended_route": {
            "time": "4.0h",
            "risk": 0.05,
            "path_data": {"type": "LineString", "coordinates": [
                [shipment.current_location.lng, shipment.current_location.lat],
                [shipment.destination.lng, shipment.destination.lat],
            ]},
            "reason": "Avoiding Severe Weather Cell D-99",
        },
    }

@app.post("/shipments/{shipment_id}/execute")
async def execute_reroute(shipment_id: str):
    shipment = next((s for s in live_shipments if s.id == shipment_id), None)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    shipment.status = Status.REROUTED
    disruption_triggered[shipment_id] = True
    
    old_route_steps = shipment.total_steps
    success = await fetch_reroute_for_shipment(shipment)
    
    if success:
        # Update the active disruption affecting this shipment so it is persisted as resolved/rerouted
        for d in active_disruptions:
            if d.get("shipment_id") == shipment_id and not d.get("auto_rerouted"):
                d["auto_rerouted"] = True
                d["auto_reroute_reason"] = "Avoiding weather / congestion — manual reroute applied"
                d["old_route_steps"] = old_route_steps
                d["new_route_steps"] = shipment.total_steps
    
    save_shipments_to_disk()
    
    return {
        "message": f"Shipment {shipment_id} rerouted.",
        "new_status": "Rerouted",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
