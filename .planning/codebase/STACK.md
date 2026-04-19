# Tech Stack: TransitIQ

## Frontend
- **Framework**: Next.js 16.2.4 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4.19
- **Maps**: Mapbox GL JS 3.22.0
- **State Management**: React Hooks (Context API where needed)
- **UI Components**: Custom Headless UI / Glassmorphism components

## Backend
- **Framework**: FastAPI (Python 3.10+)
- **Validation**: Pydantic
- **Asynchronous**: Asyncio, HTTPX
- **Data Processing**: Pandas
- **Machine Learning**: Scikit-Learn
- **Server**: Uvicorn

## Infrastructure & DevOps
- **Environment**: Docker & Docker Compose
- **Configuration**: Dotenv (.env)
- **Version Control**: Git

## External Services
- **Weather Intelligence**: Tomorrow.io API (via `weather_service.py`)
- **Navigation & Routing**: Mapbox Directions/Matrix API (via `routing_service.py`)
- **Maritime Tracking**: Spire/AIS Data (via `ais_service.py` - Draft)
