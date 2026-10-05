/**
 * @jest-environment node
 */
import worker from '../index';

const env = { AUTOKUK_API_KEY: 'test-key', APP_TOKEN: 'app' };

function call(path: string, query: string, token = 'app') {
  return worker.fetch(
    new Request(`https://api.example${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Token': token },
      body: JSON.stringify({ query }),
    }),
    env,
  );
}

describe('worker', () => {
  const realFetch = globalThis.fetch;
  let upstream: jest.Mock;
  beforeEach(() => {
    upstream = jest.fn();
    globalThis.fetch = upstream;
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('asks Autokuk for theft data and returns the used-car report', async () => {
    upstream.mockResolvedValue(new Response(JSON.stringify({ vehicle: { brand: 'ŠKODA', model: 'FABIA' }, theft: { stolen: false } })));
    const res = await call('/used-car', '1ab 2345');
    expect(await res.json()).toMatchObject({ found: true, name: 'ŠKODA FABIA', stolen: false, mileage: [] });
    const [url, init] = upstream.mock.calls[0];
    expect(url).toBe('https://autokuk.cz/api/v1/search');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(JSON.parse(init.body)).toEqual({ query: '1AB2345', include: ['theft'] });
  });

  it('logs field names but never values', async () => {
    upstream.mockResolvedValue(new Response(JSON.stringify({ vehicle: { vin: 'TMBJJ7NE5K0123456' } })));
    await call('/used-car', 'TMBJJ7NE5K0123456');
    const logged = (console.log as jest.Mock).mock.calls.flat().join(' ');
    expect(logged).toContain('"vin":"string"');
    expect(logged).not.toContain('TMBJJ7NE5K0123456');
  });

  it('says not found, rejects strangers and reports upstream errors', async () => {
    upstream.mockResolvedValue(new Response('{}', { status: 404 }));
    expect(await (await call('/used-car', 'TMBJJ7NE5K0123456')).json()).toEqual({ found: false });
    expect((await call('/used-car', 'TMBJJ7NE5K0123456', 'wrong')).status).toBe(403);
    upstream.mockResolvedValue(new Response('{}', { status: 429 }));
    expect((await call('/used-car', 'TMBJJ7NE5K0123456')).status).toBe(502);
    expect((await call('/nic', 'TMBJJ7NE5K0123456')).status).toBe(404);
  });

  it('keeps the vehicle route for adding a car', async () => {
    upstream.mockResolvedValue(new Response(JSON.stringify({ vehicle: { brand: 'ŠKODA', model: 'FABIA' } })));
    expect(await (await call('/vehicle', '1AB2345')).json()).toMatchObject({ name: 'ŠKODA FABIA' });
    expect(JSON.parse(upstream.mock.calls[0][1].body).include).toEqual(['vignette']);
  });
});
