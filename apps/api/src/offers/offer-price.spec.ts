import { Prisma } from '@prisma/client';
import {
  bestOffer,
  offerPrice,
  offerState,
  offerWindow,
  sellingPrice,
  type OfferRow,
} from './offer-price';

const D = (v: number) => new Prisma.Decimal(v);
const until = new Date('2026-12-01T03:00:00.000Z');
const percent = (id: string, p: number): OfferRow => ({
  id,
  nombre: `${p} % off`,
  tipo: 'PORCENTAJE',
  descuentoPorcentaje: D(p),
  precioOferta: null,
  hasta: until,
});
const fixed = (id: string, price: number): OfferRow => ({
  id,
  nombre: `a ${price}`,
  tipo: 'PRECIO',
  descuentoPorcentaje: null,
  precioOferta: D(price),
  hasta: until,
});

describe('offer price (OR-B4-046 §4.4 D4, D5, stage C3)', () => {
  it('prices a percent off and a fixed offer price', () => {
    expect(offerPrice(D(1500), percent('a', 20)).toNumber()).toBe(1200);
    expect(offerPrice(D(999.99), percent('a', 15)).toNumber()).toBe(849.99);
    expect(offerPrice(D(1500), fixed('b', 999)).toNumber()).toBe(999);
  });

  it('takes the lowest offer, and none that does not lower the price', () => {
    expect(
      bestOffer(D(1500), [percent('a', 10), fixed('b', 1200), percent('c', 15)])?.offer.id,
    ).toBe('b');
    expect(bestOffer(D(1500), [fixed('b', 1600)])).toBeNull();
    expect(bestOffer(D(1500), [])).toBeNull();
  });

  it('never adds the offer and the product discount: the lowest price wins', () => {
    // Discount 10 % → 1350; offer 20 % → 1200: the offer.
    expect(sellingPrice(D(1500), D(10), [percent('a', 20)])).toEqual({
      precio: '1200.00',
      precioSinDescuento: '1500.00',
      descuentoPorcentaje: 20,
      oferta: { id: 'a', nombre: '20 % off', hasta: until.toISOString() },
    });
    // Discount 30 % → 1050 beats the offer.
    expect(sellingPrice(D(1500), D(30), [percent('a', 20)])).toEqual({
      precio: '1050.00',
      precioSinDescuento: '1500.00',
      descuentoPorcentaje: 30,
      oferta: null,
    });
    // An offer price reads as the percent it takes off, rounded.
    expect(sellingPrice(D(1500), null, [fixed('b', 999)]).descuentoPorcentaje).toBe(33);
    expect(sellingPrice(D(1500), null, [])).toEqual({
      precio: '1500.00',
      precioSinDescuento: null,
      descuentoPorcentaje: null,
      oferta: null,
    });
  });

  it('reads the days in Argentina, the last one included', () => {
    const w = offerWindow('2026-11-21', '2026-11-30');
    expect(w.desde.toISOString()).toBe('2026-11-21T03:00:00.000Z');
    expect(w.hasta.toISOString()).toBe('2026-12-01T03:00:00.000Z');
  });

  it('knows when an offer is scheduled, in force or over', () => {
    const w = { ...offerWindow('2026-11-21', '2026-11-30'), terminadaEn: null };
    expect(offerState(w, new Date('2026-11-21T02:59:59Z'))).toBe('programada');
    expect(offerState(w, new Date('2026-11-21T03:00:00Z'))).toBe('vigente');
    expect(offerState(w, new Date('2026-12-01T02:59:59Z'))).toBe('vigente');
    expect(offerState(w, new Date('2026-12-01T03:00:00Z'))).toBe('terminada');
    expect(offerState({ ...w, terminadaEn: new Date() }, new Date('2026-11-25T12:00:00Z'))).toBe(
      'terminada',
    );
  });
});
