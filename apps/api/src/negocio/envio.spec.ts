import { DEFAULT_DELIVERY, deliveryOf, deliveryQuote, straightKm, WAPSELL_DELIVERY } from './envio';
import type { StoreLocation } from './ubicacion';

// OR-B4-054 — delivery fee: $ 2.500 + $ 500 per km or fraction, straight line, inside the radius.
const store: StoreLocation = {
  lat: -32.946812,
  lng: -60.639347,
  zona: false,
  direccion: 'Córdoba 1000',
  confirmadaAt: '2026-11-27T00:00:00.000Z',
};
const delivers = { ...DEFAULT_DELIVERY, envio: true };
// About 0,01° of latitude per 1,11 km.
const north = (km: number) => ({ lat: store.lat + km / 111.2, lng: store.lng });

describe('envío', () => {
  it('starts with pickup only, at Wapsell’s fee', () => {
    expect(deliveryOf(null)).toEqual({
      envio: false,
      retiro: true,
      radioKm: 5,
      base: 2500,
      porKm: 500,
    });
    expect(WAPSELL_DELIVERY).toEqual({ base: 2500, porKm: 500 });
  });

  it('never goes below Wapsell’s fee, and always offers something', () => {
    expect(
      deliveryOf({ envios: { envio: true, retiro: false, radioKm: 900, base: 100, porKm: 50 } }),
    ).toEqual({ envio: true, retiro: false, radioKm: 50, base: 2500, porKm: 500 });
    expect(deliveryOf({ envios: { envio: false, retiro: false } }).retiro).toBe(true);
    expect(deliveryOf({ envios: { envio: true, base: 3000, porKm: 700 } })).toMatchObject({
      base: 3000,
      porKm: 700,
    });
  });

  it('charges every km or fraction: 2,1 km is 3 km, $ 4.000', () => {
    const quote = deliveryQuote(store, delivers, north(2.1));
    expect(quote).toEqual({
      disponible: true,
      km: 2.1,
      kmCobrados: 3,
      base: 2500,
      porKm: 500,
      costo: 4000,
    });
    expect(deliveryQuote(store, delivers, north(0.2))).toMatchObject({
      kmCobrados: 1,
      costo: 3000,
    });
    expect(deliveryQuote(store, { ...delivers, base: 3000, porKm: 600 }, north(2.1))).toMatchObject(
      {
        costo: 4800,
      },
    );
  });

  it('says why it cannot deliver: no delivery, no pin, too far', () => {
    expect(deliveryQuote(store, DEFAULT_DELIVERY, north(1))).toMatchObject({ disponible: false });
    expect(deliveryQuote(null, delivers, north(1))).toMatchObject({
      disponible: false,
      motivo: expect.stringContaining('todavía no marcó'),
    });
    expect(deliveryQuote(store, delivers, north(7.3))).toEqual({
      disponible: false,
      km: 7.3,
      motivo: 'Tu dirección está a 7,3 km y el negocio envía hasta 5 km.',
    });
  });

  it('measures a home store from its public zone, never from the door', () => {
    const home = { ...store, zona: true };
    const near = north(0.3);
    const fromZone = deliveryQuote(home, delivers, near);
    const fromDoor = straightKm(store, near);
    expect(fromDoor).toBeCloseTo(0.3, 1);
    // The zone point is rounded to 0,01°: the distance is measured from there.
    expect(fromZone).toMatchObject({ disponible: true });
    if (fromZone.disponible) {
      expect(fromZone.km).toBe(
        Math.round(straightKm({ lat: -32.95, lng: -60.64 }, near) * 10) / 10,
      );
    }
  });
});
