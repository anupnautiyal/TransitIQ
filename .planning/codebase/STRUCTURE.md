# Directory Structure: TransitIQ

```text
TransitIQ/
├── .planning/                  # Project Management & Design Docs
│   ├── codebase/               # System Architecture Snapshots
│   ├── PROJECT.md              # High-level objectives
│   └── ROADMAP.md              # Milestone tracking
├── backend/                    # FastAPI Intelligence Layer
│   ├── main.py                 # API Entry point & Routing
│   ├── requirements.txt        # Python dependencies
│   ├── services/               # Core business logic
│   │   ├── risk_engine.py      # Risk scoring (Rule-based/ML)
│   │   ├── rerouting_engine.py  # Path optimization logic
│   │   ├── weather_service.py  # Tomorrow.io integration
│   │   └── routing_service.py  # Mapbox integration
│   └── scripts/                # Utility & Training scripts
└── frontend/                   # Next.js 14+ UI
    ├── src/
    │   ├── app/                # App Router (Pages/Layouts)
    │   │   ├── operations/     # Fleet overview
    │   │   └── shipment/[id]/  # Detail drill-down
    │   └── components/         # Premium UI Components
    │       └── Intelligence/   # Decision support UI
    ├── tailwind.config.ts      # Design system configuration
    └── package.json            # Frontend dependencies
```
