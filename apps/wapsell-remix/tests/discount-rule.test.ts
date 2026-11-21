import { describe, expect, it } from 'vitest';
import { customerAbilities, customerBody } from '../app/routes/_business.panel.clientes';
import { paymentDiscountsFrom, paymentDiscountsMessage } from '../app/utils/settings';
import { quotedLine, saleErrorMessage } from '../app/utils/sales';

// OR-B4-051 (stage C4): the payment-method discounts in Ajustes, the wholesale mark on a customer,
// and what the counter says when a discounted sale is paid another way.
const form = (entries: Array<[string, string]>) => {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
};

describe('payment-method discounts', () => {
  it('reads both percents, empty as none', () => {
    expect(paymentDiscountsFrom(form([['descuentoEfectivo', '10'], ['descuentoTransferencia', '']]))).toEqual({
      ok: true,
      body: { descuentoEfectivo: 10, descuentoTransferencia: 0 },
    });
    expect(paymentDiscountsFrom(form([['descuentoEfectivo', '7,5 %'], ['descuentoTransferencia', '3']]))).toEqual({
      ok: true,
      body: { descuentoEfectivo: 7.5, descuentoTransferencia: 3 },
    });
  });

  it('refuses what is not a percent from 0 to 50', () => {
    expect(paymentDiscountsFrom(form([['descuentoEfectivo', '60'], ['descuentoTransferencia', '0']]))).toEqual({
      ok: false,
      message: 'Cada descuento va de 0 a 50 %.',
    });
    expect(paymentDiscountsFrom(form([['descuentoEfectivo', 'mucho'], ['descuentoTransferencia', '0']])).ok).toBe(false);
  });

  it('says what the counter will take off', () => {
    expect(paymentDiscountsMessage({ descuentoEfectivo: 10, descuentoTransferencia: 2.5 })).toBe(
      'Listo: el mostrador descuenta 10 % en efectivo y 2,5 % por transferencia.',
    );
    expect(paymentDiscountsMessage({ descuentoEfectivo: 0, descuentoTransferencia: 0 })).toBe('Listo: sin descuentos por medio de pago.');
  });
});

describe('wholesale customers', () => {
  it('only the Owner and the Admin mark them', () => {
    expect(customerAbilities('OWNER').wholesale).toBe(true);
    expect(customerAbilities('ADMIN').wholesale).toBe(true);
    expect(customerAbilities('VENDEDOR')).toEqual({ manage: true, wholesale: false });
  });

  it('sends the mark only when the form shows it', () => {
    const base: Array<[string, string]> = [['nombre', 'Almacén Don Pepe']];
    expect(customerBody(form(base), true)).toMatchObject({ ok: true, body: expect.not.objectContaining({ esMayorista: expect.anything() }) });
    expect(customerBody(form([...base, ['esMayorista', 'false'], ['esMayorista', 'true']]), true)).toMatchObject({
      ok: true,
      body: { esMayorista: true },
    });
    expect(customerBody(form([...base, ['esMayorista', 'false']]), true)).toMatchObject({ ok: true, body: { esMayorista: false } });
  });
});

describe('counter', () => {
  it("shows each line at the API's quoted price, with the reason", () => {
    const line = { productoId: 'p', nombre: 'Avena', precio: '1425.00', cantidad: 2, stock: 9 };
    expect(quotedLine(line, [{ productoId: 'p', cantidad: '2', subtotal: '2200.00', origenPrecio: 'MAYORISTA' }])).toEqual({
      unit: 1100,
      total: 2200,
      reason: 'Mayorista',
    });
    expect(quotedLine(line, [{ productoId: 'p', cantidad: '2', subtotal: '3000.00', origenPrecio: 'LISTA' }])?.reason).toBeNull();
    // A quote for another quantity is stale: the line keeps its preview.
    expect(quotedLine(line, [{ productoId: 'p', cantidad: '1', subtotal: '1100.00' }])).toBeNull();
    expect(quotedLine(line, undefined)).toBeNull();
  });

  it('explains a discounted sale paid another way', () => {
    expect(saleErrorMessage('MEDIO_PAGO_DEL_DESCUENTO')).toBe('Esta venta tiene el descuento de un medio de pago: cobrala con ese medio.');
  });
});
