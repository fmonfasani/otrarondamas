import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, sessionCookie } from './helpers/route';
import { action as photosAction } from '../app/routes/_business.panel.mercaderia_.fotos';
import { loader as panelPhoto } from '../app/routes/_business.panel.mercaderia_.foto.$productoId.$fotoId';
import { loader as storePhoto } from '../app/routes/_customer.tienda_.$slug_.foto.$productoId.$fotoId';
import { panelPhotoSrc, photosNotice } from '../app/utils/catalog';
import { storePhotoSrc } from '../app/utils/store-browse';

// OR-B4-046 rule 12 — product photos: the editor's actions and the two ways a photo is shown.
type Handler = (args: { request: Request; params: Record<string, string>; context: Record<string, never> }) => Promise<Response>;

describe('product photos', () => {
  let api: ReturnType<typeof vi.fn<(input: string, init?: RequestInit) => Promise<Response>>>;

  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        // The session check of requireAuth.
        if (url.endsWith('/auth/me')) return ok({ id: 'u-1', rol: 'OWNER' });
        return api(url, init);
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const post = async (body: FormData | URLSearchParams) =>
    (photosAction as unknown as Handler)({
      request: new Request('http://app.test/panel/mercaderia/fotos', {
        method: 'POST',
        body,
        headers: { Cookie: await sessionCookie() },
      }),
      params: {},
      context: {},
    });

  const photoForm = (pairs: Array<[string, string | File]>) => {
    const form = new FormData();
    for (const [key, value] of pairs) form.append(key, value);
    return form;
  };
  const jpg = (name: string) => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], name, { type: 'image/jpeg' });

  it('uploads each photo to the API and comes back to the product', async () => {
    api.mockImplementation(async () => ok({ id: 'f1', orden: 0 }));
    const response = await post(photoForm([['intent', 'upload'], ['productoId', 'p-1'], ['archivo', jpg('a.jpg')], ['archivo', jpg('b.jpg')]]));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/panel/mercaderia?p=p-1&fotos=ok');
    expect(api).toHaveBeenCalledTimes(2);
    const [url, init] = api.mock.calls[0];
    expect(url).toBe('http://api.test/catalogo/productos/p-1/fotos');
    expect(init?.method).toBe('POST');
    expect((init?.body as FormData).get('archivo')).toBeInstanceOf(File);
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer jwt-token');
  });

  it('answers JSON to the page script, with the API reason when it refuses', async () => {
    api.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Cada producto lleva hasta 5 fotos.' }), { status: 400 }));
    const response = await post(photoForm([['intent', 'upload'], ['productoId', 'p-1'], ['respuesta', 'json'], ['archivo', jpg('a.jpg')]]));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, message: 'Cada producto lleva hasta 5 fotos.' });
  });

  it('makes a photo the main one and removes another', async () => {
    api.mockImplementation(async () => ok([]));
    const first = await post(new URLSearchParams({ intent: 'first', productoId: 'p-1', fotoId: 'f3' }));
    expect(first.headers.get('Location')).toBe('/panel/mercaderia?p=p-1&fotos=ok');
    expect(api.mock.calls[0]).toEqual([
      'http://api.test/catalogo/productos/p-1/fotos/orden',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ ids: ['f3'] }) }),
    ]);
    await post(new URLSearchParams({ intent: 'remove', productoId: 'p-1', fotoId: 'f2' }));
    expect(api.mock.calls[1]).toEqual(['http://api.test/catalogo/productos/p-1/fotos/f2', expect.objectContaining({ method: 'DELETE' })]);
  });

  it('comes back with the reason when something fails without JavaScript', async () => {
    api.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Foto no encontrada' }), { status: 404 }));
    const response = await post(new URLSearchParams({ intent: 'remove', productoId: 'p-1', fotoId: 'x' }));
    expect(response.headers.get('Location')).toBe(`/panel/mercaderia?p=p-1&fotos=${encodeURIComponent('Foto no encontrada')}`);
    expect(photosNotice('Foto no encontrada')).toEqual({ ok: false, message: 'Foto no encontrada' });
    expect(photosNotice('ok')).toEqual({ ok: true, message: 'Fotos actualizadas.' });
    expect(photosNotice(null)).toBeNull();
  });

  it('shows a photo in the panel with the session, and in the store without one, keeping its cache', async () => {
    api.mockResolvedValueOnce(new Response('jpg', { status: 200, headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' } }));
    const inPanel = await (panelPhoto as unknown as Handler)({
      request: new Request('http://app.test/panel/mercaderia/foto/p-1/f-1', { headers: { Cookie: await sessionCookie() } }),
      params: { productoId: 'p-1', fotoId: 'f-1' },
      context: {},
    });
    expect(inPanel.status).toBe(200);
    expect(api.mock.calls[0][0]).toBe('http://api.test/catalogo/productos/p-1/fotos/f-1');
    expect((api.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer jwt-token');

    api.mockResolvedValueOnce(
      new Response('webp', { status: 200, headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' } }),
    );
    const inStore = await (storePhoto as unknown as Handler)({
      request: new Request('http://app.test/tienda/demo/foto/p-1/f-1'),
      params: { slug: 'demo', productoId: 'p-1', fotoId: 'f-1' },
      context: {},
    });
    expect(api.mock.calls[1][0]).toBe('http://api.test/demo/tienda/productos/p-1/fotos/f-1');
    expect(inStore.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(inStore.headers.get('X-Content-Type-Options')).toBe('nosniff');

    api.mockResolvedValueOnce(new Response('{}', { status: 404 }));
    const missing = await (storePhoto as unknown as Handler)({
      request: new Request('http://app.test/tienda/demo/foto/p-1/x'),
      params: { slug: 'demo', productoId: 'p-1', fotoId: 'x' },
      context: {},
    });
    expect(missing.status).toBe(404);
  });

  it('builds the photo addresses', () => {
    expect(panelPhotoSrc('p 1', 'f1')).toBe('/panel/mercaderia/foto/p%201/f1');
    expect(storePhotoSrc('demo', 'p1', 'f 1')).toBe('/tienda/demo/foto/p1/f%201');
  });
});
