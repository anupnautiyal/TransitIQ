# REQUIREMENTS: TransitIQ

## Functional Requirements (FR)

### 1. Risk Intelligence
- **FR1.1**: The system must ingest real-time weather data from `tomorrow.io` (wind, precipitation, severe alerts).
- **FR1.2**: The system must ingest transit data and traffic conditions via `Mapbox`.
- **FR1.3**: The system must detect anomalies in transit times vs. standard benchmarks.
- **FR1.4**: The system must calculate a "Disruption Risk Score" for every active shipment.

### 2. Dynamic Routing
- **FR2.1**: The system must identify alternative paths when a disruption is detected.
- **FR2.2**: The system must calculate ETA for rerouted paths.
- **FR2.3**: Both maritime (sea lanes) and trucking (road networks) must be supported.

### 3. Intelligence Dashboard (UI)
- **FR3.1**: A high-fidelity map interface showing shipments and overlaying risk zones (weather, bottlenecks).
- **FR3.2**: A "Disruption Center" for reviewing and approving rerouting recommendations.
- **FR3.3**: Real-time updates and notifications for critical threats.

## Technical Requirements (TR)
- **TR1**: Backend: Python 3.11+ with FastAPI.
- **TR2**: Frontend: Next.js 14+ with Antigravity Rich Aesthetics (Glassmorphism, Light Mode).
- **TR3**: API Strategy: Async integration with Tomorrow.io and Mapbox via environment variables.

## User Experience (UX)
- **UX1**: World-class visual design (Premium, Modern).
- **UX2**: Low latency data reflects on the dashboard within seconds of ingestion.
- **UX3**: Mobile-responsive desktop-first experience.
