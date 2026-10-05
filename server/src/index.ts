// Malý server (Cloudflare Worker) mezi appkou a Autokuk API.
// Klíč k Autokuk API je jen tady, v nastavení serveru, nikdy v appce.
import { mapAutokuk, mapUsedCar, remainingToday, type Json } from './autokuk';

export interface Env {
  AUTOKUK_API_KEY: string;
  /** Volitelné: stejný token jako EXPO_PUBLIC_APP_TOKEN v appce, odfiltruje náhodné dotazy. */
  APP_TOKEN?: string;
}

const AUTOKUK_URL = 'https://autokuk.cz/api/v1/search';
const QUERY_RE = /^[A-Z0-9]{5,17}$/;

/** /vehicle doplní údaje při přidání auta, /used-car prověří ojetinu. */
const ROUTES: Record<string, { include: string[]; answer: (data: Json) => unknown; notFound: unknown }> = {
  '/vehicle': { include: ['vignette'], answer: mapAutokuk, notFound: {} },
  '/used-car': { include: ['theft'], answer: (data) => ({ found: true, ...mapUsedCar(data) }), notFound: { found: false } },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const route = Object.hasOwn(ROUTES, url.pathname) ? ROUTES[url.pathname] : undefined;
    if (!route || request.method !== 'POST') return json({ error: 'not-found' }, 404);
    if (env.APP_TOKEN && request.headers.get('X-App-Token') !== env.APP_TOKEN) return json({ error: 'forbidden' }, 403);

    const body = (await request.json().catch(() => null)) as { query?: unknown } | null;
    const query = String(body?.query ?? '')
      .toUpperCase()
      .replace(/\s/g, '');
    if (!QUERY_RE.test(query)) return json({ error: 'bad-query' }, 400);

    const upstream = await fetch(AUTOKUK_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.AUTOKUK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, include: route.include }),
    });
    if (upstream.status === 404) return json(route.notFound);
    const data = (await upstream.json().catch(() => null)) as Json;
    if (!upstream.ok) {
      // 401 špatný klíč, 403 tarif bez API, 429 vyčerpaný denní limit. Appka pak prověří zdarma na webech úřadů.
      const code = (data as { error?: { code?: string } } | null)?.error?.code ?? '';
      console.log(`Autokuk ${upstream.status} ${code} ${url.pathname}`);
      return json({ error: 'upstream', status: upstream.status }, 502);
    }
    if ((data as { data?: unknown } | null)?.data == null) return json(route.notFound);

    // Do logu jen kolik dotazů dnes zbývá, žádné údaje o autě.
    console.log(`Autokuk ${url.pathname}: dnes zbývá ${remainingToday(data) ?? '?'}`);
    return json(route.answer(data));
  },
};
