import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, sessionCookie, stubApi } from './helpers/route';
import { proxyFile } from '../app/services/api.server';
import { action as uploadAction } from '../app/routes/_business.$lang.dashboard.mensajes_.adjuntar';
import { fileAttachments, fileSize } from '../app/utils/messaging';

/** OR-B4-037 — photos and PDFs in the conversation. */
describe('chat files helpers', () => {
  it('separates files from product cards and formats sizes', () => {
    const photo = { tipo: 'imagen' as const, id: 'a', nombre: 'f.jpg', mimeType: 'image/jpeg', tamano: 2048 };
    const card = { tipo: 'producto' as const, id: 'b', productoId: 'p', nombre: 'Yerba', precio: '1' };
    expect(fileAttachments({ adjuntos: [photo, card] })).toEqual([photo]);
    expect(fileSize(350 * 1024)).toBe('350 KB');
    expect(fileSize(1.25 * 1024 * 1024)).toBe('1,3 MB');
  });
});

describe('file proxy', () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
  });

  it('passes the file with the API’s safe headers and the session token', async () => {
    const fetchMock = vi.fn(async () =>
      new Response('img', {
        status: 200,
        headers: { 'Content-Type': 'image/jpeg', 'Content-Disposition': 'inline; filename="f.jpg"', 'Set-Cookie': 'x=1' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const response = await proxyFile('jwt-token', '/messaging/conversations/attachments/a-1');
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/messaging/conversations/attachments/a-1', {
      headers: { Authorization: 'Bearer jwt-token' },
    });
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('set-cookie')).toBeNull();
    await expect(response.text()).resolves.toBe('img');
  });

  it('answers 404 when the API refuses access', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 403 })));
    expect((await proxyFile('jwt', '/x')).status).toBe(404);
  });
});

describe('panel upload', () => {
  let api: ReturnType<typeof stubApi>;
  beforeEach(() => {
    api = stubApi('VENDEDOR');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends the file to the conversation with a new retry key', async () => {
    api.mockResolvedValueOnce(ok({}));
    const form = new FormData();
    form.append('conversationId', 'c-1');
    form.append('archivo', new File([new Uint8Array([0xff, 0xd8, 0xff])], 'foto.jpg', { type: 'image/jpeg' }));
    const response = (await uploadAction({
      request: new Request('http://app.test/es/dashboard/mensajes/adjuntar', { method: 'POST', body: form, headers: { Cookie: await sessionCookie() } }),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    await expect(response.json()).resolves.toEqual({ ok: true, message: '' });
    expect(api.mock.calls[0][0]).toBe('http://api.test/messaging/conversations/c-1/attachments');
    const sent = api.mock.calls[0][1]?.body as FormData;
    expect(sent.get('clientMessageId')).toEqual(expect.any(String));
    expect((sent.get('archivo') as File).name).toBe('foto.jpg');
  });

  it('asks for a file when none came', async () => {
    const form = new FormData();
    form.append('conversationId', 'c-1');
    const response = (await uploadAction({
      request: new Request('http://app.test/es/dashboard/mensajes/adjuntar', { method: 'POST', body: form, headers: { Cookie: await sessionCookie() } }),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    expect(response.status).toBe(400);
    expect(api).not.toHaveBeenCalled();
  });
});
