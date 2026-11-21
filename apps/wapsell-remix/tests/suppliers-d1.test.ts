import { describe, expect, it } from 'vitest';
import { formatCuit, paymentTerms, suggestionItemsFrom, supplierBody } from '../app/utils/inventory';

// OR-B4-052 (stage D1): the supplier's tax data and the purchase suggestion, in the panel.
const form = (entries: Array<[string, string]>) => {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
};

describe('supplier data', () => {
  it('reads the tax data, and clears empty fields on edit', () => {
    expect(
      supplierBody(form([['nombre', ' Molino del Sur '], ['cuit', '30-71234567-1'], ['condicionIva', 'MONOTRIBUTO'], ['plazoPagoDias', '30']]), false),
    ).toEqual({
      ok: true,
      body: { nombre: 'Molino del Sur', cuit: '30-71234567-1', condicionIva: 'MONOTRIBUTO', plazoPagoDias: 30 },
    });
    expect(supplierBody(form([['nombre', 'Molino'], ['cuit', ''], ['telefono', '']]), true)).toMatchObject({
      ok: true,
      body: { nombre: 'Molino', cuit: '', telefono: '', direccion: '' },
    });
  });

  it('refuses a CUIT that is not 11 numbers, or a payment term out of range', () => {
    expect(supplierBody(form([['nombre', 'X'], ['cuit', '30-7123']]), false)).toEqual({
      ok: false,
      message: 'El CUIT son 11 números (con o sin guiones).',
    });
    expect(supplierBody(form([['nombre', 'X'], ['plazoPagoDias', '400']]), false)).toEqual({
      ok: false,
      message: 'El plazo de pago va de 0 (contado) a 365 días.',
    });
    expect(supplierBody(form([['nombre', '']]), false).ok).toBe(false);
  });

  it('shows the CUIT with its dashes and the payment terms in words', () => {
    expect(formatCuit('30712345671')).toBe('30-71234567-1');
    expect(formatCuit(null)).toBe('');
    expect(paymentTerms(0)).toBe('Contado');
    expect(paymentTerms(30)).toBe('30 días');
    expect(paymentTerms(null)).toBeNull();
  });
});

describe('purchase suggestion', () => {
  it('keeps the products with a quantity, 0 takes one out', () => {
    expect(
      suggestionItemsFrom(form([['productoId', 'p-1'], ['cantidad', '13'], ['productoId', 'p-2'], ['cantidad', '0'], ['productoId', 'p-3'], ['cantidad', '2,5']])),
    ).toEqual({ ok: true, items: [{ productoId: 'p-1', cantidad: 13 }, { productoId: 'p-3', cantidad: 2.5 }] });
    expect(suggestionItemsFrom(form([['productoId', 'p-1'], ['cantidad', '0']]))).toEqual({
      ok: false,
      message: 'Dejá al menos un producto con cantidad.',
    });
    expect(suggestionItemsFrom(form([['productoId', 'p-1'], ['cantidad', '-2']])).ok).toBe(false);
  });
});
