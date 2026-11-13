import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formBody, ok, postTo, sessionCookie, stubApi } from './helpers/route';
import { action as salesAction } from '../app/routes/_business.$lang.dashboard.ventas';
import { action as saleAction } from '../app/routes/_business.$lang.dashboard.ventas_.$id';
import { changeFor, parseNumber, parseSaleLines, paymentFrom, saleErrorMessage, startOfTodayBA } from '../app/utils/sales';

const formOf = (pairs: Array<[string, string]>) => {
  const form = new FormData();
  for (const [k, v] of pairs) form.append(k, v);
  return form;
};

describe('sales helpers', () => {
  it('reads sale lines, accepting fractional quantities (kg) and refusing bad ones', () => {
    expect(parseSaleLines('[{"productoId":"p","cantidad":1.25,"nombre":"Queso"}]')).toEqual([{ productoId: 'p', cantidad: 1.25 }]);
    expect(parseSaleLines('[]')).toBeNull();
    expect(parseSaleLines('[{"productoId":"p","cantidad":0}]')).toBeNull();
    expect(parseSaleLines('nope')).toBeNull();
  });

  it('builds the payment: cash with what was handed over, or a reference for transfers', () => {
    expect(paymentFrom(formOf([['medio', 'efectivo'], ['recibido', '5.000']]), 4200)).toEqual({ ok: true, medio: 'efectivo', monto: 4200, montoRecibido: 5000 });
    expect(paymentFrom(formOf([['medio', 'efectivo'], ['recibido', '100']]), 4200)).toMatchObject({ ok: false });
    expect(paymentFrom(formOf([['medio', 'efectivo'], ['recibido', '']]), 4200)).toEqual({ ok: true, medio: 'efectivo', monto: 4200 });
    expect(paymentFrom(formOf([['medio', 'transferencia'], ['referencia', 'OP-1']]), 900)).toEqual({ ok: true, medio: 'transferencia', monto: 900, referencia: 'OP-1' });
    expect(paymentFrom(formOf([['medio', 'cheque']]), 900)).toMatchObject({ ok: false });
  });

  it('computes change and parses Argentine amounts', () => {
    expect(changeFor(4200, 5000)).toBe(800);
    expect(changeFor(4200, 4000)).toBeNull();
    expect(parseNumber('1.234,50')).toBe(1234.5);
    expect(parseNumber('1234.5')).toBe(1234.5);
    expect(parseNumber('5.000')).toBe(5000);
    expect(parseNumber('12.500.000')).toBe(12500000);
    expect(parseNumber('2.5')).toBe(2.5);
  });

  it('turns API codes and product ids into words', () => {
    expect(saleErrorMessage('CAJA_CERRADA')).toContain('caja está cerrada');
    expect(
      saleErrorMessage('Stock insuficiente para el producto 6c16bd9a-7a59: disponible 2, requerido 5', [{ productoId: '6c16bd9a-7a59', nombre: 'Agua mineral 2 L' }]),
    ).toBe('No hay stock suficiente de Agua mineral 2 L: quedan 2.');
  });

  it('starts "today" at midnight in Buenos Aires', () => {
    expect(startOfTodayBA(new Date('2026-11-13T02:30:00Z'))).toBe('2026-11-12T03:00:00.000Z');
  });
});

describe('sales routes', () => {
  let api: ReturnType<typeof stubApi>;
  const items = JSON.stringify([{ productoId: 'p-1', nombre: 'Agua mineral 2 L', cantidad: 2 }]);
  beforeEach(() => {
    api = stubApi('VENDEDOR');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('does not create a cash sale while the register is closed', async () => {
    api.mockResolvedValueOnce(ok({ caja: { estado: 'CERRADA' }, aperturaVigente: null }));
    const response = await postTo(salesAction, 'ventas', [['intent', 'sell'], ['items', items], ['medio', 'efectivo']]);
    expect(response.status).toBe(409);
    expect(api.mock.calls.map(([url]) => url)).toEqual(['http://api.test/caja/estado']);
  });

  it('sells by transfer: quotes, creates the sale with its key, charges the sale total, opens it', async () => {
    api
      .mockResolvedValueOnce(ok({ total: '2200.00' }))
      .mockResolvedValueOnce(ok({ id: 'venta-1', total: '2200.00' }))
      .mockResolvedValueOnce(ok({ saldo: '0' }));
    const response = await postTo(salesAction, 'ventas', [
      ['intent', 'sell'], ['items', items], ['medio', 'transferencia'], ['referencia', 'OP-9'], ['idempotencyKey', 'key-1'],
    ]);
    expect(response.headers.get('Location')).toBe('/es/dashboard/ventas/venta-1?nueva=1');
    expect(api.mock.calls[1][0]).toBe('http://api.test/ventas');
    expect(JSON.parse(String(api.mock.calls[1][1]?.body))).toEqual({
      canal: 'presencial',
      items: [{ productoId: 'p-1', cantidad: 2 }],
      idempotencyKey: 'key-1',
    });
    expect(api.mock.calls[2][0]).toBe('http://api.test/ventas/venta-1/pagos');
    expect(JSON.parse(String(api.mock.calls[2][1]?.body))).toEqual({ medio: 'transferencia', monto: 2200, referencia: 'OP-9' });
  });

  it('sends to the sale to finish charging when the payment fails after the sale', async () => {
    api
      .mockResolvedValueOnce(ok({ total: '2200.00' }))
      .mockResolvedValueOnce(ok({ id: 'venta-1', total: '2200.00' }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'PAGO_EXCEDE_SALDO' }), { status: 400 }));
    const response = await postTo(salesAction, 'ventas', [['intent', 'sell'], ['items', items], ['medio', 'QR']]);
    expect(response.headers.get('Location')).toMatch(/^\/es\/dashboard\/ventas\/venta-1\?pago=pendiente&motivo=/);
  });

  it('names the product when there is not enough stock', async () => {
    api
      .mockResolvedValueOnce(ok({ total: '2200.00' }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Stock insuficiente para el producto p-1: disponible 1, requerido 2' }), { status: 400 }));
    const response = await postTo(salesAction, 'ventas', [['intent', 'sell'], ['items', items], ['medio', 'transferencia']]);
    await expect(response.json()).resolves.toMatchObject({ ok: false, message: 'No hay stock suficiente de Agua mineral 2 L: quedan 1.' });
  });

  it('charges what is left of a sale from its page', async () => {
    api.mockResolvedValueOnce(ok({ id: 'venta-1', saldo: '700.00' })).mockResolvedValueOnce(ok({ saldo: '0' }));
    const response = (await saleAction({
      request: new Request('http://app.test/es/dashboard/ventas/venta-1', {
        method: 'POST',
        body: formBody([['medio', 'efectivo'], ['recibido', '1000']]),
        headers: { Cookie: await sessionCookie() },
      }),
      params: { lang: 'es', id: 'venta-1' },
      context: {},
    })) as Response;
    await expect(response.json()).resolves.toEqual({ ok: true, message: 'Pago registrado.' });
    expect(JSON.parse(String(api.mock.calls[1][1]?.body))).toEqual({ medio: 'efectivo', monto: 700, montoRecibido: 1000 });
  });
});

describe('Argentine numbers in every form (was: "5.000" read as 5)', () => {
  it('reads thousands, decimals and junk the same way everywhere', async () => {
    const { parseArsNumber } = await import('../app/utils/format');
    const { parseAmount } = await import('../app/utils/catalog');
    expect(parseArsNumber('5.000')).toBe(5000);
    expect(parseArsNumber('$ 1.234,50')).toBe(1234.5);
    expect(parseArsNumber('2.5')).toBe(2.5);
    expect(parseArsNumber('1234.56')).toBe(1234.56);
    expect(parseArsNumber('')).toBeNull();
    expect(parseArsNumber('abc')).toBeNaN();
    expect(parseAmount('1.500')).toBe(1500);
  });
});
