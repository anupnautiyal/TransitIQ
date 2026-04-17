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
