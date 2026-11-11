import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commitSession, getSession } from '../app/services/auth.server';
import { action } from '../app/routes/_business.$lang.dashboard.caja';

// Business panel "Caja", wired to POST /caja/apertura, /caja/movimientos, /caja/arqueo, /caja/cierre.
async function post(fields: Record<string, string>) {
  const session = await getSession();
  session.set('jwt', 'jwt-token');
  const cookie = (await commitSession(session)).split(';')[0];
  return action({
    request: new Request('http://app.test/es/dashboard/caja', {
      method: 'POST',
      body: new URLSearchParams(fields),
      headers: { Cookie: cookie },
    }),
    params: { lang: 'es' },
    context: {},
  }) as Promise<Response>;
}
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe('cash route', () => {
  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok({ id: 'u-1' })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('opens the register with a decimal-comma amount', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({ id: 'a-1' }));
    const response = await post({ intent: 'open', montoInicial: '5000,50' });
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    const [url, init] = vi.mocked(fetch).mock.calls[1] as [string, RequestInit];
    expect(url).toBe('http://api.test/caja/apertura');
    expect(init.body).toBe(JSON.stringify({ montoInicial: 5000.5 }));
  });

  it('rejects a non-positive amount without calling the API', async () => {
    const response = await post({ intent: 'movement', tipo: 'Gasto', monto: '0' });
    expect(response.status).toBe(400);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('sends a manual movement and omits an empty description', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({ id: 'm-1' }));
    await post({ intent: 'movement', tipo: 'Retiro', monto: '300', descripcion: '  ' });
    expect((vi.mocked(fetch).mock.calls[1][1] as RequestInit).body).toBe(JSON.stringify({ tipo: 'Retiro', monto: 300 }));
  });

  it('shows the API reason when the register cannot be closed', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'No se puede cerrar la caja sin un arqueo previo del turno' }), { status: 400 }),
    );
    const response = await post({ intent: 'close' });
    await expect(response.json()).resolves.toEqual({ ok: false, message: 'No se puede cerrar la caja sin un arqueo previo del turno' });
  });

  it('returns the expected, counted and difference figures of a shift count', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({ efectivoEsperado: '5850', efectivoContado: '5800', diferencia: '-50' }));
    const response = await post({ intent: 'count', usuarioEntranteId: 'u-2', efectivoContado: '5800' });
    await expect(response.json()).resolves.toMatchObject({ ok: true, count: { diferencia: '-50' } });
  });
});
