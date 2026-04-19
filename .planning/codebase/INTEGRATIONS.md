# External Integrations

## Mapbox (Primary GIS)
- **Purpose**: Map rendering, Geocoding, Routing, and Alternative Path finding.
- **Services Used**:
    - Directions API (v5)
    - Mapbox GL JS 3.22.0
- **Configuration**: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (Frontend), `MAPBOX_ACCESS_TOKEN` (Backend).

## Tomorrow.io (Weather Intelligence)
- **Purpose**: Real-time hyper-local weather alerts (Wind, Precipitation, Visibility).
- **Service Used**: Weather API (v4).
- **Implementation**: `backend/services/weather_service.py`.

## Spire / AIS (Maritime Tracking - Roadmap)
- **Purpose**: Live vessel positions and maritime congestion.
- **Service**: AIS Data Stream.
- **Implementation**: `backend/services/ais_service.py` (Draft websocket listener).

## Environment Configuration
All integration secrets must be stored in root-level `.env`:
```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.xxx
MAPBOX_ACCESS_TOKEN=pk.xxx
TOMORROW_API_KEY=xxx
```
