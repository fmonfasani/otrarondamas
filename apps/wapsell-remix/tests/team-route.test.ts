import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formBody, ok, postTo, sessionCookie, stubApi } from './helpers/route';
import { action as teamAction, loader as teamLoader } from '../app/routes/_business.$lang.dashboard.equipo';
import { action as activateAction } from '../app/routes/$lang.auth.activar';
import { canChangeStatus, invitationState, missingSentence, type TeamMember } from '../app/utils/team';

const member = (overrides: Partial<TeamMember>): TeamMember => ({
  membershipId: 'm-1',
  userId: 'u-1',
  usuarioId: 'us-1',
  nombre: 'Vale',
  email: 'vale@test',
  role: 'VENDEDOR',
  status: 'ACTIVE',
  estadoLegajo: 'PENDIENTE',
  since: '2026-11-12T00:00:00Z',
  isViewer: false,
  ...overrides,
});

describe('team helpers', () => {
  it('says in words what is missing from a dossier', () => {
    expect(missingSentence(['dni', 'documento:CONSTANCIA_CUIL'])).toBe(
      'Todavía no se puede aprobar. Le falta cargar: DNI y constancia de CUIL.',
    );
    expect(missingSentence(['dni', 'telefono', 'direccion'])).toContain('DNI, teléfono y dirección');
  });

  it('tells pending, accepted and expired invitations apart', () => {
    const now = new Date('2026-11-12T12:00:00Z');
    const base = { id: 'i', email: 'a@b.c', rol: 'VENDEDOR', createdAt: '2026-11-10T00:00:00Z' };
    expect(invitationState({ ...base, expiraEn: '2026-11-15T00:00:00Z', usadaEn: null }, now).label).toBe('Pendiente');
    expect(invitationState({ ...base, expiraEn: '2026-11-11T00:00:00Z', usadaEn: null }, now).label).toBe('Vencida');
    expect(invitationState({ ...base, expiraEn: '2026-11-11T00:00:00Z', usadaEn: '2026-11-10T05:00:00Z' }, now).label).toBe('Aceptada');
  });

  it('never offers to suspend yourself, and only an Owner touches an Owner', () => {
    expect(canChangeStatus(member({ isViewer: true }), 'OWNER')).toBe(false);
    expect(canChangeStatus(member({ role: 'OWNER' }), 'ADMIN')).toBe(false);
    expect(canChangeStatus(member({}), 'ADMIN')).toBe(true);
  });
});

describe('Equipo route', () => {
  let api: ReturnType<typeof stubApi>;
  beforeEach(() => {
    api = stubApi('OWNER');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('tells a role without access that the team is for Owner and admins', async () => {
    api.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 }));
    const response = (await teamLoader({
      request: new Request('http://app.test/es/dashboard/equipo', { headers: { Cookie: await sessionCookie() } }),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    await expect(response.json()).resolves.toMatchObject({ denied: true });
  });

  it('invites with a role and offers the link when the email did not go out', async () => {
    api.mockResolvedValueOnce(ok({ linkActivacion: 'https://app.test/es/auth/activar?token=abc', emailEnviado: false }));
    const response = await postTo(teamAction, 'equipo', [['intent', 'invite'], ['email', ' Vale@Test.com '], ['rol', 'VENDEDOR']]);
    await expect(response.json()).resolves.toMatchObject({ ok: true, emailSent: false, link: 'https://app.test/es/auth/activar?token=abc' });
    expect(JSON.parse(String(api.mock.calls[0][1]?.body))).toEqual({ email: 'vale@test.com', rol: 'VENDEDOR' });
  });

  it('does not invite an Owner or a bad email', async () => {
    expect((await postTo(teamAction, 'equipo', [['intent', 'invite'], ['email', 'a@b.co'], ['rol', 'OWNER']])).status).toBe(400);
    expect((await postTo(teamAction, 'equipo', [['intent', 'invite'], ['email', 'nope'], ['rol', 'VENDEDOR']])).status).toBe(400);
    expect(api).not.toHaveBeenCalled();
  });

  it('explains what a dossier is missing instead of approving it', async () => {
    api.mockResolvedValueOnce(ok({ aprobado: false, faltantes: ['documento:ANTECEDENTES_PENALES'] }));
    const response = await postTo(teamAction, 'equipo', [['intent', 'approve'], ['usuarioId', 'us-1']]);
    await expect(response.json()).resolves.toMatchObject({ ok: false, message: expect.stringContaining('antecedentes penales') });
    expect(api.mock.calls[0]).toEqual(['http://api.test/legajo/us-1/aprobar', expect.objectContaining({ method: 'PATCH' })]);
  });

  it('suspends a membership', async () => {
    api.mockResolvedValueOnce(ok({ status: 'SUSPENDED' }));
    await postTo(teamAction, 'equipo', [['intent', 'suspend'], ['membershipId', 'm-1']]);
    expect(api.mock.calls[0]).toEqual(['http://api.test/memberships/m-1/suspend', expect.objectContaining({ method: 'PATCH' })]);
  });
});

describe('invitation activation page', () => {
  const api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    api.mockReset();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => api(String(input), init)));
  });
  afterEach(() => vi.unstubAllGlobals());
  const activate = (pairs: Array<[string, string]>) =>
    activateAction({
      request: new Request('http://app.test/es/auth/activar', { method: 'POST', body: formBody(pairs) }),
      params: { lang: 'es' },
      context: {},
    }) as Promise<Response>;

  it('activates, signs the person in and opens the panel', async () => {
    api.mockResolvedValueOnce(ok({ accessToken: 'new-jwt' }));
    const response = await activate([['token', 't'], ['nombre', 'Vale'], ['password', 'clave-segura'], ['confirm', 'clave-segura']]);
    expect(response.headers.get('Location')).toBe('/es/dashboard?bienvenida=1');
    expect(response.headers.get('Set-Cookie')).toContain('__session=');
    expect(JSON.parse(String(api.mock.calls[0][1]?.body))).toEqual({ token: 't', nombre: 'Vale', password: 'clave-segura' });
  });

  it('checks the password before calling the API', async () => {
    const response = await activate([['token', 't'], ['nombre', 'Vale'], ['password', 'clave-segura'], ['confirm', 'otra-clave']]);
    await expect(response.json()).resolves.toEqual({ error: 'Las contraseñas no coinciden.' });
    expect(api).not.toHaveBeenCalled();
  });

  it('shows the API reason for a used or expired invitation', async () => {
    api.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Esta invitación ya fue utilizada' }), { status: 400 }));
    const response = await activate([['token', 't'], ['nombre', 'Vale'], ['password', 'clave-segura'], ['confirm', 'clave-segura']]);
    await expect(response.json()).resolves.toEqual({ error: 'Esta invitación ya fue utilizada' });
  });
});
