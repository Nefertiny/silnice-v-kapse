/** Údaje o autě z našeho serveru (ten se ptá Autokuk API, klíč je jen na serveru). */
export type VehicleInfo = {
  vin?: string;
  name?: string;
  stkUntil?: string;
  vignetteUntil?: string;
  vignetteExempt?: boolean;
};

/** Prověření ojetiny přes Autokuk. Stejný tvar vrací server v server/src/autokuk.ts. */
export type UsedCarReport = {
  vin?: string;
  name?: string;
  year?: number;
  firstRegistration?: string;
  fuel?: string;
  powerKw?: number;
  stkUntil?: string;
  mileage: { date: string; km: number }[];
  imported?: { country?: string; date?: string };
  /** current: auto je teď vyřazené z provozu, jinak bylo vyřazené v minulosti. */
  deregistered?: { current: boolean; date?: string };
  /** undefined: Autokuk to jasně neřekl, appka se zeptá webu policie. */
  stolen?: boolean;
  owners?: number;
  /** Poznámky výrobce, například svolávací akce. */
  notes?: string[];
};

export type UsedCarAnswer = { kind: 'report'; report: UsedCarReport } | { kind: 'not-found' } | { kind: 'failed' };

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN;

export function vehicleApiConfigured(): boolean {
  return !!API_URL;
}

async function post<T>(path: string, query: string, timeoutMs = 15000): Promise<T | null> {
  if (!API_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(APP_TOKEN ? { 'X-App-Token': APP_TOKEN } : {}) },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchVehicle(query: string): Promise<VehicleInfo | null> {
  return post<VehicleInfo>('/vehicle', query);
}

export async function fetchUsedCar(query: string): Promise<UsedCarAnswer> {
  // Pátrání policie v Autokuku může chvíli trvat, proto delší limit.
  const body = await post<{ found?: boolean } & Partial<UsedCarReport>>('/used-car', query, 30000);
  if (!body) return { kind: 'failed' };
  if (!body.found) return { kind: 'not-found' };
  const { found: _found, ...report } = body;
  return { kind: 'report', report: { ...report, mileage: Array.isArray(report.mileage) ? report.mileage : [] } };
}
