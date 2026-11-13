import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formBody, ok, sessionCookie, stubApi } from './helpers/route';
import { action as newAction } from '../app/routes/_business.$lang.dashboard.devoluciones_.nueva';
import { action as detailAction } from '../app/routes/_business.$lang.dashboard.devoluciones_.$id';
import {
  destinationsFrom,
  exchangeItemsFrom,
  exchangeSummary,
  refundAmountFrom,
  refundDescription,
  returnState,
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
    const cancelled = { estado: 'RECHAZADO', metodo: null, monto: '0', resultado: 'Cancelada: x' };
    const withCancelled = returnedBySaleItem(
      [
        { ventaId: 'v-1', items: [{ ...item('a', 'Yerba'), ventaItemId: 'vi-1', cantidad: 2 }] },
        { ventaId: 'v-1', items: [{ ...item('b', 'Yerba'), ventaItemId: 'vi-1', cantidad: 1 }], reembolso: cancelled },
      ],
      'v-1',
    );
    expect(withCancelled.get('vi-1')).toBe(2);
  });

  it('shows cancelled and rejected returns as such', () => {
    const closed = (resultado: string) => ({ estado: 'PROCESADA', reembolso: { estado: 'RECHAZADO', metodo: null, monto: '0', resultado } });
    expect(returnState(closed('Cancelada: se arrepintió')).label).toBe('Cancelada');
    expect(returnState(closed('Rechazada tras inspección: roto por el cliente')).label).toBe('Rechazada');
    expect(returnState({ estado: 'PROCESADA', reembolso: { estado: 'EXITO', metodo: 'efectivo', monto: '1', resultado: null } }).label).toBe('Terminada');
    expect(returnState({ estado: 'SOLICITADA', reembolso: null }).label).toBe('Por autorizar');
  });

  it('reads the products taken in exchange and explains the result', () => {
    expect(exchangeItemsFrom(formOf([['intent', 'exchange'], ['cambio-p1', '2'], ['cambio-p2', '0'], ['medio', 'QR']]))).toEqual({
      ok: true,
      items: [{ productoId: 'p1', cantidad: 2 }],
    });
    expect(exchangeItemsFrom(formOf([['cambio-p1', '0']]))).toMatchObject({ ok: false });
    expect(exchangeItemsFrom(formOf([['cambio-p1', '1.5']]))).toMatchObject({ ok: false });
    const base = { numero: 9, diferencia: '0', resto: '0', pendiente: '0' };
    expect(exchangeSummary({ ...base, diferencia: '20' })).toMatch(/pagó \$\s20,00 de diferencia/);
    expect(exchangeSummary({ ...base, resto: '5' })).toMatch(/devolvieron \$\s5,00/);
    expect(exchangeSummary({ ...base, diferencia: '20', pendiente: '20' })).toContain('Falta cobrar');
    expect(exchangeSummary(base)).toBe('Cambio hecho con la venta #9.');
  });

  it('reads the refund amount: all of it by default, a part when lower, never more', () => {
    expect(refundAmountFrom(formOf([]), 20)).toEqual({ ok: true });
    expect(refundAmountFrom(formOf([['amount', '20']]), 20)).toEqual({ ok: true });
    expect(refundAmountFrom(formOf([['amount', '5,50']]), 20)).toEqual({ ok: true, amount: 5.5 });
    expect(refundAmountFrom(formOf([['amount', '1.500']]), 2000)).toEqual({ ok: true, amount: 1500 });
    expect(refundAmountFrom(formOf([['amount', '25']]), 20)).toMatchObject({ ok: false, message: expect.stringContaining('como máximo') });
    expect(refundAmountFrom(formOf([['amount', '0']]), 20)).toMatchObject({ ok: false });
  });

  it('reads the products to return: whole units, within what is left, each with a reason from the list', () => {
    const lines = [{ ventaItemId: 'vi-1', nombre: 'Yerba', available: 2 }, { ventaItemId: 'vi-2', nombre: 'Agua', available: 1 }];
    expect(
      returnItemsFrom(formOf([['cantidad-vi-1', '2'], ['razon-vi-1', 'ROTO'], ['motivo-vi-1', 'Rota'], ['cantidad-vi-2', '0']]), lines),
    ).toEqual({
      ok: true,
      items: [{ ventaItemId: 'vi-1', cantidad: 2, motivoCodigo: 'ROTO', motivo: 'Rota' }],
    });
    expect(returnItemsFrom(formOf([['cantidad-vi-1', '1'], ['razon-vi-1', 'VENCIDO']]), lines)).toEqual({
      ok: true,
      items: [{ ventaItemId: 'vi-1', cantidad: 1, motivoCodigo: 'VENCIDO' }],
    });
    expect(returnItemsFrom(formOf([['cantidad-vi-1', '3'], ['razon-vi-1', 'ROTO']]), lines)).toMatchObject({ ok: false, message: expect.stringContaining('como máximo 2') });
    expect(returnItemsFrom(formOf([['cantidad-vi-1', '1'], ['motivo-vi-1', 'Rota']]), lines)).toMatchObject({ ok: false, message: expect.stringContaining('Elegí') });
    expect(returnItemsFrom(formOf([['cantidad-vi-1', '1'], ['razon-vi-1', 'OTRO']]), lines)).toMatchObject({ ok: false, message: expect.stringContaining('Contá') });
    expect(returnItemsFrom(formOf([['cantidad-vi-1', '1.5'], ['razon-vi-1', 'ROTO']]), lines)).toMatchObject({ ok: false });
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
      ['ventaId', 'v-1'], ['cantidad-vi-1', '2'], ['razon-vi-1', 'ROTO'], ['motivo-vi-1', 'Rota'], ['clienteId', 'c-1'], ['motivo_general', ''],
    ]);
    expect(response.headers.get('Location')).toBe('/es/dashboard/devoluciones/d-1?nueva=1');
    expect(JSON.parse(String(api.mock.calls[2][1]?.body))).toEqual({
      ventaId: 'v-1',
      items: [{ ventaItemId: 'vi-1', cantidad: 2, motivoCodigo: 'ROTO', motivo: 'Rota' }],
      clienteId: 'c-1',
    });
  });

  it('receives with each product’s destination', async () => {
    api.mockResolvedValueOnce(ok({ id: 'd-1', items: [item('a', 'Yerba')] })).mockResolvedValueOnce(ok({}));
    await post(detailAction, 'devoluciones/d-1', [['intent', 'receive'], ['destino-a', 'DESCARTE'], ['condition_check', 'Dañado']], 'd-1');
    expect(api.mock.calls[1][0]).toBe('http://api.test/devoluciones/d-1/receive');
    expect(JSON.parse(String(api.mock.calls[1][1]?.body))).toEqual({ items: [{ itemId: 'a', destino: 'DESCARTE' }], condition_check: 'Dañado' });
  });

  it('sends a partial refund amount only when it is lower than the total', async () => {
    api.mockResolvedValueOnce(ok({ id: 'd-1', montoReembolsable: '20', items: [] })).mockResolvedValueOnce(ok({}));
    await post(detailAction, 'devoluciones/d-1', [['intent', 'refund'], ['amount', '7,5']], 'd-1');
    expect(api.mock.calls[1][0]).toBe('http://api.test/devoluciones/d-1/process-refund');
    expect(JSON.parse(String(api.mock.calls[1][1]?.body))).toEqual({ amount: 7.5 });
  });

  it('makes the exchange with the products and the method for the difference', async () => {
    api.mockResolvedValueOnce(ok({ ventaNueva: { id: 'v-9', numero: 9, diferencia: '20', resto: '0', pendiente: '0' } }));
    const response = await post(detailAction, 'devoluciones/d-1', [['intent', 'exchange'], ['cambio-p1', '3'], ['medio', 'transferencia']], 'd-1');
    expect(api.mock.calls[0][0]).toBe('http://api.test/devoluciones/d-1/exchange');
    expect(JSON.parse(String(api.mock.calls[0][1]?.body))).toEqual({ items: [{ productoId: 'p1', cantidad: 3 }], medio: 'transferencia' });
    await expect(response.json()).resolves.toMatchObject({ ok: true, saleId: 'v-9' });
  });

  it('cancels and rejects with the reason given', async () => {
    api.mockImplementation(async () => ok({}));
    const missing = await post(detailAction, 'devoluciones/d-1', [['intent', 'cancel'], ['motivo', ' ']], 'd-1');
    expect(missing.status).toBe(400);
    expect(api).not.toHaveBeenCalled();
    await post(detailAction, 'devoluciones/d-1', [['intent', 'cancel'], ['motivo', 'Se arrepintió']], 'd-1');
    await post(detailAction, 'devoluciones/d-1', [['intent', 'reject'], ['motivo', 'Lo rompió']], 'd-1');
    expect(api.mock.calls.map((c) => [c[0], JSON.parse(String(c[1]?.body))])).toEqual([
      ['http://api.test/devoluciones/d-1/cancel', { motivo: 'Se arrepintió' }],
      ['http://api.test/devoluciones/d-1/reject', { motivo: 'Lo rompió' }],
    ]);
  });

  it('says to open the register when a cash refund finds it closed', async () => {
    api
      .mockResolvedValueOnce(ok({ id: 'd-1', montoReembolsable: '20', items: [] }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'CAJA_CERRADA' }), { status: 409 }));
    const response = await post(detailAction, 'devoluciones/d-1', [['intent', 'refund']], 'd-1');
    await expect(response.json()).resolves.toEqual({ ok: false, message: 'La caja está cerrada. Abrila en Caja para devolver en efectivo.' });
  });
});
