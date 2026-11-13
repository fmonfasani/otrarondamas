import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, sessionCookie, stubApi } from './helpers/route';
import { action } from '../app/routes/_business.$lang.dashboard.mi-legajo';
import { sessionDossierState } from '../app/services/auth.server';
import { dossierFieldsFor, dossierProgress, dossierStanding } from '../app/utils/team';

const tokenWith = (claims: Record<string, unknown>) =>
  ['h', Buffer.from(JSON.stringify(claims)).toString('base64url'), 's'].join('.');

describe('dossier standing (RF-17)', () => {
  it('tells pending, approved-but-stale-session and fine apart; the Owner is never blocked', () => {
    expect(dossierStanding('VENDEDOR', 'PENDIENTE', 'PENDIENTE')).toBe('pending');
    expect(dossierStanding('VENDEDOR', 'APROBADO', 'PENDIENTE')).toBe('relogin');
    expect(dossierStanding('VENDEDOR', 'APROBADO', 'APROBADO')).toBe('ok');
    expect(dossierStanding('OWNER', 'PENDIENTE', 'PENDIENTE')).toBe('ok');
  });

  it('reads the dossier state written in the session token, tolerating junk', () => {
    expect(sessionDossierState(tokenWith({ estadoLegajo: 'PENDIENTE' }))).toBe('PENDIENTE');
    expect(sessionDossierState(tokenWith({}))).toBeNull();
    expect(sessionDossierState('not-a-jwt')).toBeNull();
  });

  it('asks each role for its data and says what is left', () => {
    expect(dossierFieldsFor('VENDEDOR').map((f) => f.name)).toEqual(['dni', 'telefono', 'direccion']);
    expect(dossierFieldsFor('OWNER').map((f) => f.name)).toEqual(['cuit', 'razonSocial', 'condicionIva']);
    expect(dossierProgress('PENDIENTE', ['dni']).hint).toBe('Para que el Owner pueda aprobarlo, falta: DNI.');
    expect(dossierProgress('PENDIENTE', []).label).toBe('Esperando aprobación');
    expect(dossierProgress('APROBADO', []).label).toBe('Legajo aprobado');
  });
});

describe('Mi legajo route', () => {
  let api: ReturnType<typeof stubApi>;
  beforeEach(() => {
    api = stubApi('VENDEDOR');
  });
  afterEach(() => vi.unstubAllGlobals());

  const post = async (form: FormData) =>
    (await action({
      request: new Request('http://app.test/es/dashboard/mi-legajo', {
        method: 'POST',
        body: form,
        headers: { Cookie: await sessionCookie() },
      }),
      params: { lang: 'es' },
      context: {},
    })) as Response;

  it('saves only the data that was filled in', async () => {
    api.mockResolvedValueOnce(ok({}));
    const form = new FormData();
    form.append('intent', 'save');
    form.append('dni', ' 30111222 ');
    form.append('telefono', '');
    form.append('direccion', 'Av. Siempre Viva 742');
    const response = await post(form);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(api.mock.calls[0][0]).toBe('http://api.test/legajo/mi-legajo');
    expect(JSON.parse(String(api.mock.calls[0][1]?.body))).toEqual({ dni: '30111222', direccion: 'Av. Siempre Viva 742' });
  });

  it('uploads the document to the API as multipart, with its type and expiry', async () => {
    api.mockResolvedValueOnce(ok({ id: 'doc-1' }));
    const form = new FormData();
    form.append('intent', 'upload');
    form.append('tipo', 'CONSTANCIA_CUIL');
    form.append('vencimiento', '2027-12-31');
    form.append('archivo', new File(['%PDF-1.4 test'], 'cuil.pdf', { type: 'application/pdf' }));
    const response = await post(form);
    await expect(response.json()).resolves.toMatchObject({ ok: true, message: 'Documento subido.' });
    const [url, init] = api.mock.calls[0];
    expect(url).toBe('http://api.test/legajo/mi-legajo/documentos');
    const sent = init?.body as FormData;
    expect(sent.get('tipo')).toBe('CONSTANCIA_CUIL');
    expect(sent.get('vencimiento')).toBe('2027-12-31');
    expect((sent.get('archivo') as File).name).toBe('cuil.pdf');
    expect((init?.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('asks for the file and the expiry before calling the API', async () => {
    const form = new FormData();
    form.append('intent', 'upload');
    form.append('tipo', 'CONSTANCIA_CUIL');
    form.append('vencimiento', '');
    form.append('archivo', new File(['x'], 'a.pdf', { type: 'application/pdf' }));
    expect((await post(form)).status).toBe(400);
    expect(api).not.toHaveBeenCalled();
  });
});
