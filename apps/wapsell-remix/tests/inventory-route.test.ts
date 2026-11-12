import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commitSession, getSession } from '../app/services/auth.server';
import { action as inventoryAction } from '../app/routes/_business.$lang.dashboard.inventario';
import { action as purchasesAction } from '../app/routes/_business.$lang.dashboard.compras';
import {
  adjustmentFrom,
  daysUntil,
  expiryLabel,
  inventoryAbilities,
  pendingOf,
  purchaseItemsFrom,
  receiptItemsFrom,
  suggestedBatchNumber,
} from '../app/utils/inventory';

const formOf = (pairs: Array<[string, string]>) => {
  const form = new FormData();
  for (const [k, v] of pairs) form.append(k, v);
  return form;
};

describe('inventory helpers', () => {
  it('mirrors the matrix: stock roles adjust and buy, Vendedor only views', () => {
    expect(inventoryAbilities('GESTOR_DE_STOCK')).toEqual({ adjust: true, setMinimum: true, purchases: true });
    expect(inventoryAbilities('VENDEDOR')).toEqual({ adjust: false, setMinimum: false, purchases: false });
  });

  it('turns direction + quantity + reason into a signed integer adjustment', () => {
    expect(adjustmentFrom(formOf([['direccion', 'salida'], ['cantidad', '3'], ['motivo', 'Rotura'], ['detalle', '']]))).toEqual({
      ok: true,
      cantidad: -3,
      motivo: 'Rotura',
    });
    expect(adjustmentFrom(formOf([['direccion', 'entrada'], ['cantidad', '2'], ['motivo', 'Conteo físico'], ['detalle', 'góndola']]))).toEqual({
      ok: true,
      cantidad: 2,
      motivo: 'Conteo físico: góndola',
    });
    expect(adjustmentFrom(formOf([['cantidad', '1,5'], ['motivo', 'Rotura']]))).toMatchObject({ ok: false });
    expect(adjustmentFrom(formOf([['cantidad', '1'], ['motivo', 'Otro'], ['detalle', '']]))).toMatchObject({ ok: false });
  });

  it('reads purchase rows, skips blank ones and rejects duplicates', () => {
    const parsed = purchaseItemsFrom(
      formOf([
        ['productoId', 'p1'], ['cantidad', '12'], ['costo', '450,50'],
        ['productoId', ''], ['cantidad', ''], ['costo', ''],
      ]),
    );
    expect(parsed).toEqual({ ok: true, items: [{ productoId: 'p1', cantidadPedida: 12, costoUnitario: 450.5 }] });
    expect(
      purchaseItemsFrom(formOf([['productoId', 'p1'], ['cantidad', '1'], ['costo', '1'], ['productoId', 'p1'], ['cantidad', '2'], ['costo', '1']])),
    ).toMatchObject({ ok: false });
    expect(purchaseItemsFrom(formOf([['productoId', 'p1'], ['cantidad', '0'], ['costo', '1']]))).toMatchObject({ ok: false });
  });

  it('reads receipt rows, skipping items with nothing received', () => {
    const parsed = receiptItemsFrom(
      formOf([
        ['compraItemId', 'i1'], ['recibido', '10'], ['lote', 'L-1'], ['vencimiento', '2027-03-01'],
        ['compraItemId', 'i2'], ['recibido', '0'], ['lote', 'L-1'], ['vencimiento', ''],
      ]),
    );
    expect(parsed).toEqual({ ok: true, items: [{ compraItemId: 'i1', cantidadRecibida: 10, numeroLote: 'L-1', vencimiento: '2027-03-01' }] });
    expect(receiptItemsFrom(formOf([['compraItemId', 'i1'], ['recibido', '5'], ['lote', 'L'], ['vencimiento', '']]))).toMatchObject({ ok: false });
  });

  it('labels expiry relative to today and computes pending quantities', () => {
    const now = new Date(2026, 10, 12, 15, 0);
    expect(daysUntil('2026-11-15T00:00:00.000Z', now)).toBe(3);
    expect(expiryLabel('2026-11-10T00:00:00.000Z', now)).toEqual({ label: 'Vencido hace 2 días', tone: 'warning' });
    expect(expiryLabel('2026-11-12T00:00:00.000Z', now).label).toBe('Vence hoy');
    expect(pendingOf({ id: 'i', productoId: 'p', cantidadPedida: '10', cantidadRecibida: '4', costoUnitario: '1' })).toBe(6);
    expect(suggestedBatchNumber({ id: 'ab12cd34-0000', RecepcionCompra: [{ id: 'r', createdAt: '' }] })).toBe('CAB12CD-2');
  });
});

describe('inventory and purchases routes', () => {
  const api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  async function post(handler: typeof inventoryAction, path: string, pairs: Array<[string, string]>) {
    const session = await getSession();
    session.set('jwt', 'jwt-token');
    const cookie = (await commitSession(session)).split(';')[0];
    const body = new URLSearchParams();
    for (const [k, v] of pairs) body.append(k, v);
    return handler({
      request: new Request(`http://app.test/es/dashboard/${path}`, { method: 'POST', body, headers: { Cookie: cookie } }),
      params: { lang: 'es' },
      context: {},
    }) as Promise<Response>;
  }
  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    api.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
        String(input).endsWith('/auth/me') ? ok({ id: 'u-1', rol: 'OWNER' }) : api(String(input), init),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('registers a stock adjustment on a batch', async () => {
    api.mockResolvedValueOnce(ok({ id: 'mov-1' }));
    const response = await post(inventoryAction, 'inventario', [
      ['intent', 'adjust'], ['loteId', 'lote-1'], ['direccion', 'salida'], ['cantidad', '2'], ['motivo', 'Rotura'], ['detalle', ''],
    ]);
    await expect(response.json()).resolves.toEqual({ ok: true, message: 'Ajuste registrado.' });
    expect(api.mock.calls[0]).toEqual([
      'http://api.test/inventario/ajustes',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ loteId: 'lote-1', cantidad: -2, motivo: 'Rotura' }) }),
    ]);
  });

  it('shows the API reason when an adjustment would go negative', async () => {
    api.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'El ajuste dejaría el lote con cantidad negativa' }), { status: 400 }));
    const response = await post(inventoryAction, 'inventario', [['intent', 'adjust'], ['loteId', 'lote-1'], ['direccion', 'salida'], ['cantidad', '99'], ['motivo', 'Rotura']]);
    await expect(response.json()).resolves.toMatchObject({ ok: false, message: expect.stringContaining('negativa') });
  });

  it('sets the low-stock threshold through the product', async () => {
    api.mockResolvedValueOnce(ok({ id: 'p-1' }));
    await post(inventoryAction, 'inventario', [['intent', 'minimum'], ['productId', 'p-1'], ['stockMinimo', '5']]);
    expect(api.mock.calls[0]).toEqual(['http://api.test/catalogo/productos/p-1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ stockMinimo: 5 }) })]);
  });

  it('creates and issues a purchase in one step, then opens it', async () => {
    api.mockResolvedValueOnce(ok({ id: 'compra-1' })).mockResolvedValueOnce(ok({ id: 'compra-1', estado: 'EMITIDA' }));
    const response = await post(purchasesAction, 'compras', [
      ['intent', 'createPurchase'], ['proveedorId', 'prov-1'], ['productoId', 'p-1'], ['cantidad', '24'], ['costo', '500'], ['emitir', '1'],
    ]);
    expect(response.headers.get('Location')).toBe('/es/dashboard/compras?c=compra-1');
    expect(JSON.parse(String(api.mock.calls[0][1]?.body))).toEqual({ proveedorId: 'prov-1', items: [{ productoId: 'p-1', cantidadPedida: 24, costoUnitario: 500 }] });
    expect(api.mock.calls[1][0]).toBe('http://api.test/compras/compra-1/emitir');
  });

  it('receives goods into stock', async () => {
    api.mockResolvedValueOnce(ok({ id: 'rec-1' }));
    const response = await post(purchasesAction, 'compras', [
      ['intent', 'receive'], ['compraId', 'compra-1'], ['compraItemId', 'i-1'], ['recibido', '24'], ['lote', 'L-1'], ['vencimiento', '2027-06-30'],
    ]);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(api.mock.calls[0][0]).toBe('http://api.test/compras/compra-1/recepciones');
    expect(JSON.parse(String(api.mock.calls[0][1]?.body))).toEqual({
      items: [{ compraItemId: 'i-1', cantidadRecibida: 24, numeroLote: 'L-1', vencimiento: '2027-06-30' }],
    });
  });

  it('adds a supplier with only the fields given', async () => {
    api.mockResolvedValueOnce(ok({ id: 'prov-1' }));
    await post(purchasesAction, 'compras', [['intent', 'createSupplier'], ['nombre', 'Distribuidora Sur'], ['telefono', '11 4444 5555'], ['email', '']]);
    expect(JSON.parse(String(api.mock.calls[0][1]?.body))).toEqual({ nombre: 'Distribuidora Sur', telefono: '11 4444 5555' });
  });
});
