import os
import httpx
import asyncio
import time
import json
from datetime import datetime
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

class TrafficService:
    def __init__(self):
        self.api_key = os.getenv("TOMTOM_API_KEY")
        self.base_url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json"
        
        # Rate Limiting Logic: 5 requests per second (TomTom Free Tier)
        self.rate_limit = 5 
        self.request_window = 1.0 # 1 second
        self.request_times = []
        self._lock = asyncio.Lock()
        
        # Quota Management
        self.max_daily_quota = 2500
        self.quota_file = os.path.join(os.path.dirname(__file__), "..", "data", "tomtom_quota.json")
        self.usage_today = self._load_usage()
        
        # Simulation Flag
        self.simulate_rate_limit = os.getenv("SIMULATE_TOMTOM_RATE_LIMIT", "false").lower() == "true"

    def _load_usage(self) -> int:
        """Loads usage from disk, resetting if it's a new day."""
        if not os.path.exists(self.quota_file):
            return 0
        try:
            with open(self.quota_file, "r") as f:
                data = json.load(f)
                last_date = data.get("date")
                if last_date == datetime.now().strftime("%Y-%m-%d"):
                    return data.get("usage", 0)
        except Exception as e:
            print(f"TrafficService: Failed to load quota: {e}")
        return 0

    def _save_usage(self):
        """Saves current usage to disk."""
        try:
            os.makedirs(os.path.dirname(self.quota_file), exist_ok=True)
            with open(self.quota_file, "w") as f:
                json.dump({
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "usage": self.usage_today
                }, f)
        except Exception as e:
            print(f"TrafficService: Failed to save quota: {e}")

    async def _throttle(self):
        """Internal method to ensure we stay within rate limits."""
        async with self._lock:
            now = time.time()
            # Filter out requests outside the current window
            self.request_times = [t for t in self.request_times if now - t < self.request_window]
            
            if len(self.request_times) >= self.rate_limit:
                sleep_time = self.request_window - (now - self.request_times[0])
                if sleep_time > 0:
                    print(f"TrafficService: Rate limit approaching. Throttling for {sleep_time:.2f}s...")
                    await asyncio.sleep(sleep_time)
            
            self.request_times.append(time.time())

    async def get_traffic_at_location(self, lat: float, lng: float) -> Dict[str, Any]:
        """
        Fetches live traffic flow data from TomTom for a specific coordinate.
        Returns metrics like current speed, free flow speed, and congestion level.
        Includes rate limiting, quota management, and simulation support.
        """
        # 1. Quota Check
        if self.usage_today >= self.max_daily_quota:
            print(f"TrafficService: Daily quota ({self.max_daily_quota}) reached. Blocking request.")
            return {"error": "Daily quota exceeded", "congestion": "unknown", "status_code": 403}

        # 2. Simulation Check
        if self.simulate_rate_limit:
            print("TrafficService: [SIMULATION] Injecting 429 Too Many Requests error.")
            return {"error": "Rate limit exceeded (Simulated)", "congestion": "unknown", "status_code": 429}

        if not self.api_key:
            print("TrafficService: TOMTOM_API_KEY missing.")
            return {"error": "API Key missing", "congestion": "unknown"}

        # 3. Apply throttling (QPS)
        await self._throttle()

        params = {
            "key": self.api_key,
            "point": f"{lat},{lng}",
            "unit": "KMPH"
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(self.base_url, params=params)
                
                # Increment and save usage
                self.usage_today += 1
                self._save_usage()

                if response.status_code == 200:
                    data = response.json().get("flowSegmentData", {})
                    
                    current_speed = data.get("currentSpeed")
                    free_flow = data.get("freeFlowSpeed")
                    
                    # Compute congestion level only if speeds are valid and free_flow > 0
                    if (isinstance(current_speed, (int, float)) and 
                        isinstance(free_flow, (int, float)) and free_flow > 0):
                        congestion_level = max(0.0, 1.0 - (current_speed / free_flow))
                        congestion_status = "heavy" if congestion_level > 0.6 else "moderate" if congestion_level > 0.3 else "low"
                    else:
                        congestion_level = None # Sentinel for unknown/invalid
                        congestion_status = "unknown"
                    
                    return {
                        "current_speed": current_speed,
                        "free_flow_speed": free_flow,
                        "congestion_index": round(congestion_level, 2) if congestion_level is not None else 0.0,
                        "confidence": data.get("confidence", 0),
                        "congestion": congestion_status,
                        "quota_used": self.usage_today
                    }
                elif response.status_code == 429:
                    print("TrafficService: Received 429 Too Many Requests from TomTom.")
                    return {"error": "Rate limit exceeded", "congestion": "unknown", "status_code": 429}
                else:
                    print(f"TrafficService Error: {response.status_code} - {response.text}")
                    return {"error": f"API Error {response.status_code}", "congestion": "unknown"}
            except Exception as e:
                print(f"TrafficService Exception: {e}")
                return {"error": str(e), "congestion": "unknown"}
