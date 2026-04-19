# Architecture Overview: TransitIQ

## System Components

### 1. Unified Dashboard (Frontend)
The frontend is a modern Next.js application designed with premium light-mode aesthetics.
- **App Router**: Uses file-based routing for pages (`/operations`, `/shipment/[id]`, `/network`).
- **Real-time Map**: Mapbox-powered visualization layer displaying shipments, risks, and optimized routes.
- **Intelligence Dialogs**: Contextual overlays (e.g., `RerouteDialog.tsx`) that trigger backend optimizations and display AI recommendations.

### 2. Service-Oriented API (Backend)
FastAPI provides the backbone for intelligence orchestration.
- **Rerouting Engine**: Coordinates between the `RoutingService` and `RiskEngine` to find paths that minimize disruption.
- **Risk Engine**: Currently uses a weighted rule-based model to score environmental and operational risks.
- **Integration Services**: Separate modules for Tomorrow.io (`WeatherService`), Mapbox (`RoutingService`), and AIS (`AISService`).

### 3. Data Flow
1. **Ingestion**: `WeatherService` and `AISService` fetch external data.
2. **Analysis**: `RiskEngine` processes raw data into normalized risk scores (0-1).
3. **Trigger**: If `RiskEngine.needs_reroute()` returns true, an alert is pushed.
4. **Optimization**: `ReroutingEngine` requests alternative paths from Mapbox.
5. **Human-in-the-loop**: User approves the recommendation via the Frontend, triggering the final route update.

## Future ML Transition
The architecture is designed to swap the rule-based `RiskEngine` with a predictive model. The `risk_score` output interface will remain stable while the internal logic shifts to scikit-learn inference.
