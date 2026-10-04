// Malý server (Cloudflare Worker) mezi appkou a Autokuk API.
// Klíč k Autokuk API je jen tady, v nastavení serveru, nikdy v appce.
import { mapAutokuk } from './autokuk';

export interface Env {
  AUTOKUK_API_KEY: string;
  /** Volitelné: stejný token jako EXPO_PUBLIC_APP_TOKEN v appce, odfiltruje náhodné dotazy. */
  APP_TOKEN?: string;
}

const AUTOKUK_URL = 'https://autokuk.cz/api/v1/search';
const QUERY_RE = /^[A-Z0-9]{5,17}$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/vehicle' || request.method !== 'POST') return json({ error: 'not-found' }, 404);
    if (env.APP_TOKEN && request.headers.get('X-App-Token') !== env.APP_TOKEN) return json({ error: 'forbidden' }, 403);

    const body = (await request.json().catch(() => null)) as { query?: unknown } | null;
    const query = String(body?.query ?? '')
      .toUpperCase()
      .replace(/\s/g, '');
    if (!QUERY_RE.test(query)) return json({ error: 'bad-query' }, 400);

    const upstream = await fetch(AUTOKUK_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.AUTOKUK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, include: ['vignette'] }),
    });
    if (upstream.status === 404) return json({}, 200);
    if (!upstream.ok) return json({ error: 'upstream', status: upstream.status }, 502);

    return json(mapAutokuk(await upstream.json()));
  },
};
