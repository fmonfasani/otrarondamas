import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formBody } from './helpers/route';
import { action, loader } from '../app/routes/vender';
import { loader as oldRegister } from '../app/routes/$lang.auth.register';
import { getSession } from '../app/services/auth.server';

type Handler = (args: { request: Request; params: Record<string, string>; context: Record<string, never> }) => unknown;
const send = async (pairs: Array<[string, string]>, path = '/vender') =>
  (await (action as unknown as Handler)({
    request: new Request(`http://app.test${path}`, { method: 'POST', body: formBody(pairs) }),
    params: {},
    context: {},
  })) as Response;
const body = async (response: Response) => (await response.json()) as Record<string, unknown>;

const business: Array<[string, string]> = [
  ['intent', 'crear'],
  ['nombreNegocio', 'Vinoteca Lucía'],
  ['cuit', ''],
  ['direccion', 'Av. Pellegrini 1200'],
  ['ciudad', 'Rosario'],
  ['codigoPostal', '2000'],
  ['provincia', 'Santa Fe'],
  ['rubro', 'Bebidas'],
  ['subrubro', 'Vinoteca'],
];

describe('«Vendé en Wapsell» (ADR-IDN-008)', () => {
  let api: ReturnType<typeof vi.fn<(input: string, init?: RequestInit) => Promise<Response>>>;

  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => api(String(input), init)));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('step 1 asks for nombre, apellido and a valid email before moving on', async () => {
    const missing = await send([['intent', 'paso1'], ['nombre', 'Lucía'], ['apellido', ''], ['email', 'lucia@test']]);
    expect(missing.status).toBe(400);
    expect(await body(missing)).toMatchObject({ step: 1, error: 'Escribí tu apellido.' });

    const next = await send([['intent', 'paso1'], ['nombre', 'Lucía'], ['apellido', 'Pérez'], ['email', 'Lucia@Test.com']]);
    expect(await body(next)).toEqual({ step: 2, persona: { nombre: 'Lucía', apellido: 'Pérez', email: 'lucia@test.com' } });
    expect(api).not.toHaveBeenCalled();
  });

  it('step 2 creates the business with the person and its profile; the CUIT may be empty', async () => {
    api.mockResolvedValue(new Response(JSON.stringify({ negocio: 'Vinoteca Lucía', email: 'lucia@test.com', mailEnviado: true }), { status: 201 }));
    const response = await send([['nombre', 'Lucía'], ['apellido', 'Pérez'], ['email', 'lucia@test.com'], ...business]);
    expect(await body(response)).toMatchObject({ created: { negocio: 'Vinoteca Lucía' } });
    const [url, init] = api.mock.calls[0];
    expect(url).toBe('http://api.test/auth/registro');
    const sent = JSON.parse(String(init?.body));
    expect(sent).toMatchObject({ nombre: 'Lucía', apellido: 'Pérez', provincia: 'Santa Fe', rubro: 'Bebidas', subrubro: 'Vinoteca' });
    expect(sent).not.toHaveProperty('cuit');
  });

  it('shows the API message and keeps what was typed', async () => {
    api.mockResolvedValue(new Response(JSON.stringify({ message: 'El CUIT no es válido. Revisá los 11 números.' }), { status: 400 }));
    const response = await send([['nombre', 'Lucía'], ['apellido', 'Pérez'], ['email', 'lucia@test.com'], ...business]);
    expect(response.status).toBe(400);
    expect(await body(response)).toMatchObject({ step: 2, error: 'El CUIT no es válido. Revisá los 11 números.', values: { ciudad: 'Rosario' } });
  });

  it('with Google, creates the business and continues to MFA, then the welcome', async () => {
    api.mockResolvedValue(new Response(JSON.stringify({ mfa: 'activar', ticket: 'mfa-ticket' }), { status: 201 }));
    const response = await send([['ticket', 'google-ticket'], ...business]);
    expect(response.headers.get('Location')).toBe('/es/auth/activar-mfa');
    expect(api.mock.calls[0][0]).toBe('http://api.test/auth/registro/google');
    const session = await getSession(response.headers.get('Set-Cookie'));
    expect(session.get('mfaRedirect')).toBe('/panel?bienvenida=1');
  });

  it('loads the rubros and provinces from the API', async () => {
    api.mockResolvedValue(new Response(JSON.stringify({ rubros: { Bebidas: ['Vinoteca'] }, provincias: ['Santa Fe'] }), { status: 200 }));
    const response = (await (loader as unknown as Handler)({ request: new Request('http://app.test/vender'), params: {}, context: {} })) as Response;
    expect(await body(response)).toMatchObject({ catalog: { provincias: ['Santa Fe'] }, google: null });
    expect(api.mock.calls[0][0]).toBe('http://api.test/auth/registro/catalogo');
  });

  it('the old sign-up address sends to /vender, keeping the Google ticket', async () => {
    const response = (await (oldRegister as unknown as Handler)({
      request: new Request('http://app.test/es/auth/register?google=abc'),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe('/vender?google=abc');
  });
});
