import sys
import os
import asyncio

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from main import get_shipments

async def verify_endpoints():
    print("Testing /shipments dynamic calculation...")
    shipments = await get_shipments()
    for s in shipments:
        print(f"ID: {s.id}, Status: {s.status}, Dynamic Risk Score: {s.risk_score}")
        if s.risk_score == 0.85 or s.risk_score == 0.15:
             print("WARNING: Score matches hardcoded mock! Check wiring.")
        else:
             print("SUCCESS: Dynamic score detected.")

if __name__ == "__main__":
    asyncio.run(verify_endpoints())
