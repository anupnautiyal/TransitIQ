# Project: TransitIQ

## What This is
TransitIQ is a production-grade, scalable **Smart Supply Chain Disruption Detection and Dynamic Rerouting Platform**. It leverages real-time multifaceted data (Weather, Traffic, Maritime AIS) to preemptively identify risks and recommend optimized route adjustments before disruptions cascade into system-wide delays.

## The Core Value
Proactive resilience through **foresight**. By shifting from reactive tracking to predictive orchestration, TransitIQ minimizes lead-time volatility and operational costs.

## Background & Problem
Modern global supply chains manage millions of concurrent shipments across highly complex transportation networks. Critical disruptions (sudden weather events, port congestion, operational bottlenecks) are often identified only after delivery timelines are compromised. TransitIQ solves this "Visibility without Foresight" gap.

## Objectives
- **Preemptive Detection**: Continuous analysis of real-time data to flag potential disruptions.
- **Dynamic Optimization**: Formulation of optimized route recommendations (Maritime & Trucking).
- **Premium Intelligence**: A world-class UI/UX that offers deep visibility and actionable insights.

## Tech Stack
- **Backend**: Python (FastAPI), Pydantic, httpx, pandas, scikit-learn
- **Frontend**: Next.js 16.2.4 (React 19), Tailwind CSS, Mapbox GL 3.22.0
- **APIs**: Tomorrow.io (Weather), Mapbox (Routing), Spire (AIS - Proposed)
- **Infrastructure**: Dockerized (Internal/Shared)

## Requirements

### Validated
- [x] Real-time data ingestion (Tomorrow.io, Mapbox)
- [x] Rule-based Risk Engine (Weather + Traffic)
- [x] Dynamic Rerouting Algorithm (Mapbox Alternatives)
- [x] Premium Dashboard with animated visualizations (Light Mode)
- [x] Shipment Detail Drill-down UX (Route Trace, Timeline)
- [x] Operational View for multi-shipment tracking (Network Map)

### Active
- [ ] Predictive Anomaly Detection (ML Risk Model training)
- [ ] Real-time AIS stream integration (Live ship tracking)
- [ ] Historical disruption data collection pipeline
- [ ] Multi-region routing optimization

### Out of Scope
- [Mobile Native App] - Focus is on web-first intelligence platform.
- [Pharma/Cold Chain IoT] - Focus is on general logistics transit disruptions for MVP.

## Evolution
This document evolves as we hit phase transitions and validate requirements.
