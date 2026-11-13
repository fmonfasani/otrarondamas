import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formBody, ok, sessionCookie, stubApi } from './helpers/route';
import { action as newAction } from '../app/routes/_business.$lang.dashboard.devoluciones_.nueva';
import { action as detailAction } from '../app/routes/_business.$lang.dashboard.devoluciones_.$id';
import {
  destinationsFrom,
  refundDescription,
  returnItemsFrom,
  returnWindow,
  returnedBySaleItem,
  type ReturnItem,
} from '../app/utils/returns';

const formOf = (pairs: Array<[string, string]>) => {
  const form = new FormData();
  for (const [k, v] of pairs) form.append(k, v);
  return form;
};
const item = (id: string, producto: string): ReturnItem => ({
  id, ventaItemId: `vi-${id}`, productoId: 'p', producto, cantidad: 1, precioDevuelto: '10', monto: '10', motivo: 'x', destino: null,
});

describe('returns helpers (OR-B4-034)', () => {
  it('counts the 10-day window from the sale', () => {
    const now = new Date('2026-11-13T12:00:00Z');
    expect(returnWindow('2026-11-05T12:00:00Z', now)).toEqual({ days: 8, open: true, left: 2 });
    expect(returnWindow('2026-11-02T12:00:00Z', now)).toMatchObject({ days: 11, open: false });
  });

  it('sums what earlier returns of the same sale took back', () => {
    const returned = returnedBySaleItem(
      [
        { ventaId: 'v-1', items: [{ ...item('a', 'Yerba'), ventaItemId: 'vi-1', cantidad: 2 }] },
        { ventaId: 'v-1', items: [{ ...item('b', 'Yerba'), ventaItemId: 'vi-1', cantidad: 1 }] },
        { ventaId: 'v-2', items: [{ ...item('c', 'Agua'), ventaItemId: 'vi-1', cantidad: 5 }] },
      ],
      'v-1',
    );
    expect(returned.get('vi-1')).toBe(3);
  });

  it('reads the products to return: whole units, within what is left, each with a reason', () => {
    const lines = [{ ventaItemId: 'vi-1', nombre: 'Yerba', available: 2 }, { ventaItemId: 'vi-2', nombre: 'Agua', available: 1 }];
    expect(returnItemsFrom(formOf([['cantidad-vi-1', '2'], ['motivo-vi-1', 'Rota'], ['cantidad-vi-2', '0']]), lines)).toEqual({
      ok: true,
      items: [{ ventaItemId: 'vi-1', cantidad: 2, motivo: 'Rota' }],
    });
    expect(returnItemsFrom(formOf([['cantidad-vi-1', '3'], ['motivo-vi-1', 'Rota']]), lines)).toMatchObject({ ok: false, message: expect.stringContaining('como máximo 2') });
    expect(returnItemsFrom(formOf([['cantidad-vi-1', '1'], ['motivo-vi-1', '']]), lines)).toMatchObject({ ok: false });
    expect(returnItemsFrom(formOf([['cantidad-vi-1', '1.5'], ['motivo-vi-1', 'x']]), lines)).toMatchObject({ ok: false });
    expect(returnItemsFrom(formOf([]), lines)).toMatchObject({ ok: false, message: 'Indicá qué productos se devuelven.' });
  });

  it('asks where every received product goes', () => {
    const items = [item('a', 'Yerba'), item('b', 'Agua')];
    expect(destinationsFrom(formOf([['destino-a', 'REINGRESO'], ['destino-b', 'DESCARTE']]), items)).toEqual({
      ok: true,
      items: [{ itemId: 'a', destino: 'REINGRESO' }, { itemId: 'b', destino: 'DESCARTE' }],
    });
    expect(destinationsFrom(formOf([['destino-a', 'REINGRESO']]), items)).toEqual({ ok: false, message: 'Elegí qué pasa con Agua.' });
  });

  it('explains the refund by the original method', () => {
    expect(refundDescription({ reembolso: null, montoReembolsable: '20' }, 'efectivo')).toContain('caja abierta');
    expect(refundDescription({ reembolso: null, montoReembolsable: '20' }, 'transferencia')).toContain('fuera de Wapsell');
    expect(refundDescription({ reembolso: null, montoReembolsable: '20' }, null)).toContain('no hay dinero');
    expect(
      refundDescription({ reembolso: { estado: 'PENDIENTE_MANUAL', metodo: 'QR', monto: '20', resultado: null }, montoReembolsable: '20' }, 'QR'),
    ).toMatch(/devolvé \$\s20,00 por QR/);
  });
});

describe('returns routes', () => {
  let api: ReturnType<typeof stubApi>;
  beforeEach(() => {
    api = stubApi('OWNER');
  });
  afterEach(() => vi.unstubAllGlobals());

  const post = async (handler: typeof newAction | typeof detailAction, path: string, pairs: Array<[string, string]>, id?: string) =>
    (await handler({
      request: new Request(`http://app.test/es/dashboard/${path}`, { method: 'POST', body: formBody(pairs), headers: { Cookie: await sessionCookie() } }),
      params: { lang: 'es', ...(id ? { id } : {}) },
      context: {},
    })) as Response;

  const sale = { id: 'v-1', ventaItems: [{ id: 'vi-1', nombre: 'Yerba', cantidad: '3', precioUnitario: '10', descuentoFidelizacionPorcentaje: null }] };

  it('registers the return with the customer when the sale had none, then opens it', async () => {
    api
      .mockResolvedValueOnce(ok(sale))
      .mockResolvedValueOnce(ok({ items: [] }))
      .mockResolvedValueOnce(ok({ id: 'd-1' }));
    const response = await post(newAction, 'devoluciones/nueva', [
      ['ventaId', 'v-1'], ['cantidad-vi-1', '2'], ['motivo-vi-1', 'Rota'], ['clienteId', 'c-1'], ['motivo_general', ''],
    ]);
    expect(response.headers.get('Location')).toBe('/es/dashboard/devoluciones/d-1?nueva=1');
    expect(JSON.parse(String(api.mock.calls[2][1]?.body))).toEqual({
      ventaId: 'v-1',
      items: [{ ventaItemId: 'vi-1', cantidad: 2, motivo: 'Rota' }],
      clienteId: 'c-1',
    });
  });

  it('receives with each product’s destination', async () => {
    api.mockResolvedValueOnce(ok({ id: 'd-1', items: [item('a', 'Yerba')] })).mockResolvedValueOnce(ok({}));
    await post(detailAction, 'devoluciones/d-1', [['intent', 'receive'], ['destino-a', 'DESCARTE'], ['condition_check', 'Dañado']], 'd-1');
    expect(api.mock.calls[1][0]).toBe('http://api.test/devoluciones/d-1/receive');
    expect(JSON.parse(String(api.mock.calls[1][1]?.body))).toEqual({ items: [{ itemId: 'a', destino: 'DESCARTE' }], condition_check: 'Dañado' });
  });

  it('says to open the register when a cash refund finds it closed', async () => {
    api.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'CAJA_CERRADA' }), { status: 409 }));
    const response = await post(detailAction, 'devoluciones/d-1', [['intent', 'refund']], 'd-1');
    await expect(response.json()).resolves.toEqual({ ok: false, message: 'La caja está cerrada. Abrila en Caja para devolver en efectivo.' });
  });
});
