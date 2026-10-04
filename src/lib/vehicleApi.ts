/** Údaje o autě z našeho serveru (ten se ptá Autokuk API, klíč je jen na serveru). */
export type VehicleInfo = {
  vin?: string;
  name?: string;
  stkUntil?: string;
  vignetteUntil?: string;
  vignetteExempt?: boolean;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN;

export function vehicleApiConfigured(): boolean {
  return !!API_URL;
}

export async function fetchVehicle(query: string): Promise<VehicleInfo | null> {
  if (!API_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_URL.replace(/\/$/, '')}/vehicle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(APP_TOKEN ? { 'X-App-Token': APP_TOKEN } : {}) },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as VehicleInfo;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
