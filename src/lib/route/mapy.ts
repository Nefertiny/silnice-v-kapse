// Trasa přes Mapy.com REST API (tarif Basic: 250 000 kreditů měsíčně zdarma, bez karty).
// Klíč je v EXPO_PUBLIC_MAPY_API_KEY v souboru .env, do GitHubu se nedává.
// Hledání místa i trasa stojí 4 kredity, výsledky si proto pamatujeme.
const API = 'https://api.mapy.com/v1';
const MAPY_KEY = process.env.EXPO_PUBLIC_MAPY_API_KEY;

/** Zeměpisná délka a šířka, v tomhle pořadí (jako v GeoJSON a v Mapy.com API). */
export type LonLat = [number, number];

export type Place = { query: string; name: string; label: string; position: LonLat };

export type PlannedRoute = {
  from: Place;
  to: Place;
  lengthKm: number;
  /** Doba jízdy bez provozu v minutách. */
  minutes: number;
  line: LonLat[];
};

export type RouteErrorCode = 'no-key' | 'bad-key' | 'not-found' | 'no-route' | 'offline';

export class RouteError extends Error {
  constructor(
    readonly code: RouteErrorCode,
    readonly place?: string,
  ) {
    super(code);
  }
}

export function routingConfigured(): boolean {
  return !!MAPY_KEY;
}

async function call<T>(path: string, params: URLSearchParams): Promise<T> {
  if (!MAPY_KEY) throw new RouteError('no-key');
  params.set('lang', 'cs');
  let res: Response;
  try {
    res = await fetch(`${API}${path}?${params}`, { headers: { 'X-Mapy-Api-Key': MAPY_KEY } });
  } catch {
    throw new RouteError('offline');
  }
  if (res.status === 401 || res.status === 403) throw new RouteError('bad-key');
  if (res.status === 404 || res.status === 422) throw new RouteError('no-route');
  if (!res.ok) throw new RouteError('offline');
  return (await res.json()) as T;
}

type GeocodeResponse = { items?: { name: string; label: string; location?: string; position: { lon: number; lat: number } }[] };

const places = new Map<string, Promise<Place>>();

export function findPlace(query: string): Promise<Place> {
  const q = query.trim();
  const key = q.toLowerCase();
  let p = places.get(key);
  if (!p) {
    p = call<GeocodeResponse>('/geocode', new URLSearchParams({ query: q, limit: '1' })).then((data) => {
      const item = data.items?.[0];
      if (!item) throw new RouteError('not-found', q);
      const label = item.location ? `${item.name}, ${item.location}` : item.name;
      return { query: q, name: item.name, label, position: [item.position.lon, item.position.lat] };
    });
    places.set(key, p);
    p.catch(() => places.delete(key));
  }
  return p;
}

type RouteResponse = {
  length: number;
  duration: number;
  geometry: { geometry: { coordinates: LonLat[] } };
};

const routes = new Map<string, Promise<PlannedRoute>>();

/** Najde obě místa a nejrychlejší trasu autem mezi nimi. */
export function planRoute(from: string, to: string): Promise<PlannedRoute> {
  const key = `${from.trim().toLowerCase()}|${to.trim().toLowerCase()}`;
  let p = routes.get(key);
  if (!p) {
    p = Promise.all([findPlace(from), findPlace(to)]).then(async ([a, b]) => {
      const params = new URLSearchParams({ routeType: 'car_fast', format: 'geojson' });
      // Souřadnice se posílají jako dvě hodnoty stejného parametru: start=délka&start=šířka.
      a.position.forEach((n) => params.append('start', String(n)));
      b.position.forEach((n) => params.append('end', String(n)));
      const r = await call<RouteResponse>('/routing/route', params);
      const line = r.geometry?.geometry?.coordinates;
      if (!line?.length) throw new RouteError('no-route');
      return { from: a, to: b, lengthKm: Math.round(r.length / 1000), minutes: Math.round(r.duration / 60), line };
    });
    routes.set(key, p);
    p.catch(() => routes.delete(key));
  }
  return p;
}

export function routeErrorText(e: unknown): string {
  const code = e instanceof RouteError ? e.code : 'offline';
  switch (code) {
    case 'no-key':
      return 'Mapa a skutečná trasa zatím nejsou zapnuté.';
    case 'bad-key':
      return 'Mapy.com odmítly klíč. Zkontrolujte ho v souboru .env.';
    case 'not-found':
      return `Místo „${(e as RouteError).place}“ jsme nenašli. Zkuste ho napsat přesněji.`;
    case 'no-route':
      return 'Mezi těmito místy jsme trasu autem nenašli.';
    default:
      return 'Trasu se nepodařilo načíst. Zkontrolujte připojení k internetu.';
  }
}
