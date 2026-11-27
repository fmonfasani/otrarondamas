import { describe, expect, it } from 'vitest';
import { deliveryFrom, deliveryMessage, feeExample, feeFor, pesos } from '~/utils/envios';

// OR-B4-054 — the delivery settings of Ajustes, checked like the API checks them.
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const wapsell = { base: 2500, porKm: 500 };

describe('Envíos', () => {
  it('charges every km or fraction, as the API does', () => {
    expect(feeFor(2.1, wapsell)).toEqual({ kmCobrados: 3, costo: 4000 });
    expect(feeFor(3, wapsell)).toEqual({ kmCobrados: 3, costo: 4000 });
    expect(feeFor(0.2, wapsell)).toEqual({ kmCobrados: 1, costo: 3000 });
    expect(pesos(16400)).toBe('$ 16.400');
    expect(feeExample(wapsell)).toBe('a 2,1 km se cobran 3 km: $ 2.500 + 3 × $ 500 = $ 4.000');
  });

  it('reads the form, never below Wapsell’s fee and always offering something', () => {
    expect(deliveryFrom(form({ envio: 'true', retiro: 'true', radioKm: '5', base: '$ 3.000', porKm: '600' }))).toEqual({
      ok: true,
      body: { envio: true, retiro: true, radioKm: 5, base: 3000, porKm: 600 },
    });
    expect(deliveryFrom(form({ radioKm: '5', base: '2500', porKm: '500' }))).toMatchObject({ ok: false });
    expect(deliveryFrom(form({ envio: 'true', radioKm: '5', base: '2000', porKm: '500' }))).toEqual({
      ok: false,
      message: 'La base del envío es de $ 2.500 como mínimo.',
    });
    expect(deliveryFrom(form({ envio: 'true', radioKm: '0', base: '2500', porKm: '500' }))).toMatchObject({ ok: false });
    expect(deliveryFrom(form({ envio: 'true', radioKm: '5', base: '2500', porKm: '4,5' }))).toMatchObject({ ok: false });
  });

  it('says what was saved in plain words', () => {
    expect(deliveryMessage({ envio: false, retiro: true, radioKm: 5, ...wapsell })).toBe('Listo: tus clientes retiran los pedidos en el local.');
    expect(deliveryMessage({ envio: true, retiro: true, radioKm: 5, ...wapsell })).toBe(
      'Listo: enviás hasta 5 km (a 2,1 km se cobran 3 km: $ 2.500 + 3 × $ 500 = $ 4.000), y también se puede retirar en el local.',
    );
  });
});

describe('Entrega en el carrito', () => {
  it('reads what the cart sends, and refuses a broken one', async () => {
    const { deliveryChoiceFrom, kmLabel } = await import('~/utils/envios');
    expect(deliveryChoiceFrom(null)).toBeNull();
    expect(deliveryChoiceFrom('{"tipo":"RETIRO","lat":1}')).toEqual({ tipo: 'RETIRO' });
    expect(deliveryChoiceFrom(JSON.stringify({ tipo: 'ENVIO', direccion: ' Av. Pellegrini 1234 ', indicaciones: ' Timbre 4B ', lat: -32.9, lng: -60.6 }))).toEqual({
      tipo: 'ENVIO',
      direccion: 'Av. Pellegrini 1234',
      indicaciones: 'Timbre 4B',
      lat: -32.9,
      lng: -60.6,
    });
    expect(deliveryChoiceFrom(JSON.stringify({ tipo: 'ENVIO', direccion: 'x', lat: -32.9, lng: -60.6 }))).toBe('invalid');
    expect(deliveryChoiceFrom('{not json')).toBe('invalid');
    expect(kmLabel(2.14)).toBe('2,1 km');
  });
});
