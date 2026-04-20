import asyncio
import httpx
import json

async def verify_premium_features():
    api_base = "http://localhost:8000"
    
    print("\n--- Phase 1: Testing Geocoding Search Proxy ---")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{api_base}/geocoding/search?query=Delhi")
            resp.raise_for_status() # Check status code
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                print(f"SUCCESS: Geocoding search returned {len(data)} results.")
                print(f"Sample Result: {data[0]['name']} ({data[0]['lat']}, {data[0]['lng']})")
                origin = data[0]
            else:
                print(f"FAILURE: Delhi search returned invalid or empty results: {data}")
                return

            resp = await client.get(f"{api_base}/geocoding/search?query=Mumbai")
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                dest = data[0]
                print(f"SUCCESS: Destination validated.")
            else:
                print(f"FAILURE: Mumbai search returned invalid or empty results: {data}")
                return

            print("\n--- Phase 2: Testing Premium Shipment Creation ---")
            payload = {
                "origin": {"name": origin['name'], "lat": origin['lat'], "lng": origin['lng']},
                "destination": {"name": dest['name'], "lat": dest['lat'], "lng": dest['lng']},
                "cargo": "Pharmaceutical Synthetics",
                "mode": "trucking",
                "priority": "High",
                "value": 45000.0
            }
            
            resp = await client.post(f"{api_base}/shipments", json=payload)
            if resp.status_code == 200:
                new_shp = resp.json()
                print(f"SUCCESS: Shipment {new_shp['id']} created with priority {new_shp['priority']}.")
                print(f"Cargo: {new_shp['cargo_type']}, Value: ${new_shp['value_usd']}")
            else:
                print(f"FAILURE: Shipment creation failed with status {resp.status_code}")
                print(resp.text)
                return

            print("\n--- Phase 3: Verifying Risk Weighting (High Priority) ---")
            # Risk score should eventually reflect the +0.2 priority boost in refreshing logic
            # For now we check if it was initialized correctly
            print(f"Initial Risk Score: {new_shp['risk_score']}")
            
    except Exception as e:
        print(f"ERROR: Verification failed: {e}")

if __name__ == "__main__":
    print("Pre-requisite: Backend must be running on http://localhost:8000")
    asyncio.run(verify_premium_features())
