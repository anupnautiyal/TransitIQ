const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchShipments() {
  try {
    const res = await fetch(`${BASE_URL}/shipments`);
    if (!res.ok) throw new Error("Failed to fetch shipments");
    return res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function fetchRisks() {
  try {
    const res = await fetch(`${BASE_URL}/risks`);
    if (!res.ok) throw new Error("Failed to fetch risks");
    return res.json();
  } catch (error) {
    console.error(error);
    return { active_disruptions: [] };
  }
}

// ── Simulation Control ──

export async function playSimulation() {
  const res = await fetch(`${BASE_URL}/simulation/play`, { method: "POST" });
  return res.json();
}

export async function pauseSimulation() {
  const res = await fetch(`${BASE_URL}/simulation/pause`, { method: "POST" });
  return res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${BASE_URL}/simulation/reset`, { method: "POST" });
  return res.json();
}

export async function setSimulationSpeed(multiplier: number) {
  const res = await fetch(`${BASE_URL}/simulation/speed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ multiplier }),
  });
  return res.json();
}

export async function getSimulationStatus() {
  const res = await fetch(`${BASE_URL}/simulation/status`);
  return res.json();
}
