import { Prisma } from '@prisma/client';
import { bestLinePrice } from './best-price';
import type { OfferRow } from './offer-price';

const D = (v: number) => new Prisma.Decimal(v);
const offer = (p: number): OfferRow => ({
  id: 'o-1',
  nombre: `${p} %`,
  tipo: 'PORCENTAJE',
  descuentoPorcentaje: D(p),
  precioOferta: null,
  hasta: new Date('2026-12-01T03:00:00Z'),
});

describe('the line price: discounts never add up (OR-B4-051, D5)', () => {
  it('charges the list price when nothing lowers it', () => {
    expect(bestLinePrice({ list: D(1000) })).toMatchObject({
      precioUnitario: D(1000),
      origen: 'LISTA',
      ofertaId: null,
      descuentoFidelizacionPorcentaje: null,
    });
  });

  it('takes the lowest candidate, never two together', () => {
    // Product 10 % → 900; offer 15 % → 850; wholesale 870; cash 12 % → 880; loyalty 5 % → 950.
    const line = bestLinePrice({
      list: D(1000),
      productDiscount: D(10),
      offers: [offer(15)],
      wholesale: D(870),
      paymentDiscount: D(12),
      loyalty: { reglaId: 'r-1', porcentaje: 5 },
    });
    expect(line.origen).toBe('OFERTA');
    expect(line.precioUnitario.toNumber()).toBe(850);
    expect(line.ofertaId).toBe('o-1');
    expect(bestLinePrice({ list: D(1000), wholesale: D(700), offers: [offer(15)] }).origen).toBe(
      'MAYORISTA',
    );
    expect(
      bestLinePrice({ list: D(1000), paymentDiscount: D(20), productDiscount: D(10) }).origen,
    ).toBe('MEDIO_PAGO');
  });

  it('keeps the list price and the percent on the line when loyalty wins', () => {
    const line = bestLinePrice({
      list: D(1000),
      productDiscount: D(10),
      loyalty: { reglaId: 'r-1', porcentaje: 25 },
    });
    expect(line).toMatchObject({
      origen: 'FIDELIZACION',
      descuentoFidelizacionPorcentaje: 25,
      reglaFidelizacionId: 'r-1',
    });
    expect(line.precioUnitario.toNumber()).toBe(1000);
    expect(line.precioEfectivo.toNumber()).toBe(750);
  });

  it('on a tie keeps the most specific reason, and ignores what does not lower the price', () => {
    expect(
      bestLinePrice({ list: D(1000), offers: [offer(10)], productDiscount: D(10) }).origen,
    ).toBe('OFERTA');
    expect(bestLinePrice({ list: D(1000), wholesale: D(1200) }).origen).toBe('LISTA');
    expect(bestLinePrice({ list: D(1000), paymentDiscount: D(0) }).origen).toBe('LISTA');
  });
});
