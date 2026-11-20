import { Prisma } from '@prisma/client';
import { describeRule, priceUnder } from './bulk-pricing';

const product = (costo: number, precio: number) => ({
  costo: new Prisma.Decimal(costo),
  precioMinorista: new Prisma.Decimal(precio),
});

describe('bulk price update (OR-B4-046 §4.3, stage C2)', () => {
  it('raises or lowers the current price by a percent', () => {
    expect(
      priceUnder(product(900, 1500), { modo: 'porcentaje', valor: 10, redondeo: 1 })?.toNumber(),
    ).toBe(1650);
    expect(
      priceUnder(product(900, 1500), { modo: 'porcentaje', valor: -5, redondeo: 1 })?.toNumber(),
    ).toBe(1425);
  });

  it('sets the price as the cost plus a markup', () => {
    expect(
      priceUnder(product(1080, 1500), { modo: 'margen', valor: 40, redondeo: 1 })?.toNumber(),
    ).toBe(1512);
  });

  it('rounds to whole pesos, tens or hundreds', () => {
    const rule = { modo: 'porcentaje' as const, valor: 7 };
    expect(priceUnder(product(1, 1234), { ...rule, redondeo: 1 })?.toNumber()).toBe(1320); // 1320.38
    expect(priceUnder(product(1, 1234), { ...rule, redondeo: 10 })?.toNumber()).toBe(1320);
    expect(priceUnder(product(1, 1234), { ...rule, redondeo: 100 })?.toNumber()).toBe(1300);
    expect(
      priceUnder(product(1, 1250), { modo: 'porcentaje', valor: 0, redondeo: 100 })?.toNumber(),
    ).toBe(1300);
  });

  it('has no price for a margin without cost, or for a price that would not be above zero', () => {
    expect(priceUnder(product(0, 1500), { modo: 'margen', valor: 40, redondeo: 1 })).toBeNull();
    expect(priceUnder(product(1, 4), { modo: 'porcentaje', valor: -90, redondeo: 10 })).toBeNull();
  });

  it('reads the rule', () => {
    expect(describeRule({ modo: 'porcentaje', valor: 10, redondeo: 1 })).toBe('+10 %');
    expect(describeRule({ modo: 'porcentaje', valor: -5.5, redondeo: 10 })).toBe(
      '−5,5 %, redondeado a $ 10',
    );
    expect(describeRule({ modo: 'margen', valor: 40, redondeo: 100 })).toBe(
      'costo + 40 %, redondeado a $ 100',
    );
  });
});
