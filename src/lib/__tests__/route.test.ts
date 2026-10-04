import { googleMapsUrl, mapyNavigationUrl, wazeUrl } from '../route/links';
import { routeMapHtml } from '../route/mapHtml';
import type * as Mapy from '../route/mapy';

type Call = { url: string; headers: Record<string, string> };

const PRAHA = { name: 'Praha', label: 'Hlavní město', location: 'Česko', position: { lon: 14.4378, lat: 50.0755 } };
const BRNO = { name: 'Brno', label: 'Město', location: 'Jihomoravský kraj, Česko', position: { lon: 16.6068, lat: 49.1951 } };
const ROUTE = {
  length: 205432,
  duration: 6731,
  geometry: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[14.4378, 50.0755], [15.6, 49.6], [16.6068, 49.1951]] } },
};

function load(key?: string): typeof Mapy {
  let mod!: typeof Mapy;
  jest.isolateModules(() => {
    if (key) process.env.EXPO_PUBLIC_MAPY_API_KEY = key;
    else delete process.env.EXPO_PUBLIC_MAPY_API_KEY;
    // Klíč se čte při načtení modulu, proto ho načítáme znovu pro každý test.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../route/mapy');
  });
  return mod;
}

function mockFetch(places: Record<string, object | undefined>, calls: Call[]) {
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const u = new URL(url);
    if (u.pathname === '/v1/geocode') {
      const item = places[u.searchParams.get('query') ?? ''];
      return new Response(JSON.stringify({ items: item ? [item] : [] }));
    }
    return new Response(JSON.stringify(ROUTE));
  }) as typeof fetch;
}

describe('Mapy.com route', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.EXPO_PUBLIC_MAPY_API_KEY;
  });

  it('stays off without a key', async () => {
    const mapy = load();
    expect(mapy.routingConfigured()).toBe(false);
    await expect(mapy.planRoute('Praha', 'Brno')).rejects.toMatchObject({ code: 'no-key' });
  });

  it('finds both places and the fastest car route', async () => {
    const mapy = load('test-key');
    const calls: Call[] = [];
    mockFetch({ Praha: PRAHA, Brno: BRNO }, calls);

    const route = await mapy.planRoute(' Praha ', 'Brno');
    expect(route).toMatchObject({ lengthKm: 205, minutes: 112, from: { name: 'Praha', position: [14.4378, 50.0755] }, to: { label: 'Brno, Jihomoravský kraj, Česko' } });
    expect(route.line).toHaveLength(3);

    const routing = new URL(calls.find((c) => c.url.includes('/routing/route'))!.url);
    expect(routing.searchParams.getAll('start')).toEqual(['14.4378', '50.0755']);
    expect(routing.searchParams.getAll('end')).toEqual(['16.6068', '49.1951']);
    expect(routing.searchParams.get('routeType')).toBe('car_fast');
    expect(calls.every((c) => c.headers['X-Mapy-Api-Key'] === 'test-key' && !c.url.includes('test-key'))).toBe(true);

    // Stejnou trasu podruhé nehledáme, každý dotaz stojí kredity.
    await mapy.planRoute('praha', 'brno');
    expect(calls).toHaveLength(3);
  });

  it('says which place it could not find', async () => {
    const mapy = load('test-key');
    mockFetch({ Praha: PRAHA }, []);
    const error = await mapy.planRoute('Praha', 'Brnoo').catch((e) => e);
    expect(error).toMatchObject({ code: 'not-found', place: 'Brnoo' });
    expect(mapy.routeErrorText(error)).toBe('Místo „Brnoo“ jsme nenašli. Zkuste ho napsat přesněji.');
  });
});

describe('navigation links and map page', () => {
  const route: Mapy.PlannedRoute = {
    from: { query: 'Praha', name: 'Praha', label: 'Praha', position: [14.4378, 50.0755] },
    to: { query: 'Brno', name: 'Brno', label: 'Brno', position: [16.6068, 49.1951] },
    lengthKm: 205,
    minutes: 112,
    line: [
      [14.4378, 50.0755],
      [16.6068, 49.1951],
    ],
  };

  it('opens navigation apps at the found places', () => {
    expect(mapyNavigationUrl(route)).toBe(
      'https://mapy.com/fnc/v1/route?mapset=traffic&start=14.4378,50.0755&end=16.6068,49.1951&routeType=car_fast_traffic&navigate=true',
    );
    expect(wazeUrl('Brno', route)).toBe('https://waze.com/ul?ll=49.1951,16.6068&navigate=yes');
    expect(wazeUrl('Brno')).toBe('https://waze.com/ul?q=Brno&navigate=yes');
    expect(googleMapsUrl('Praha', 'Hradec Králové')).toContain('destination=Hradec%20Kr%C3%A1lov%C3%A9');
  });

  it('draws the route line on the map page', () => {
    const html = routeMapHtml(route, { line: '#38E1FF', start: '#38E1FF', end: '#FFB547', ground: '#0B1220' });
    expect(html).toContain('maplibre-gl@5.24.0/dist/maplibre-gl.js');
    expect(html).toContain('[[14.4378,50.0755],[16.6068,49.1951]]');
    expect(html).toContain('https://tiles.openfreemap.org/styles/dark');
  });
});
