import { Prisma } from '@prisma/client';
import { costAfterEntry, costAuditEntry, markupPercent, suggestedPrice } from './product-cost';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
const product = (
  costo: number,
  precio: number,
  promedio: number | null = null,
  sugerido: number | null = null,
) => ({
  costo: D(costo),
  costoPromedio: promedio === null ? null : D(promedio),
  precioMinorista: D(precio),
  precioSugerido: sugerido === null ? null : D(sugerido),
});

describe('product cost (OR-B4-046 stage C1, ADR-DAT-009, D10)', () => {
  it('averages the stock on hand with what enters, and keeps the last cost', () => {
    // 10 on hand at 100, 10 enter at 120: the average is 110, the last cost 120.
    const after = costAfterEntry(product(100, 150), 10, { cantidad: 10, costoUnitario: 120 });
    expect(after.costo.toNumber()).toBe(120);
    expect(after.costoPromedio?.toNumber()).toBe(110);
  });

  it('starts the average over when there is no stock (or less than none)', () => {
    expect(
      costAfterEntry(product(100, 150, 90), 0, {
        cantidad: 5,
        costoUnitario: 120,
      }).costoPromedio?.toNumber(),
    ).toBe(120);
    expect(
      costAfterEntry(product(100, 150, 90), -3, {
        cantidad: 5,
        costoUnitario: 120,
      }).costoPromedio?.toNumber(),
    ).toBe(120);
  });

  it('suggests the price that keeps the markup, in whole pesos, and never changes the price', () => {
    const after = costAfterEntry(product(100, 150), 0, { cantidad: 1, costoUnitario: 123 });
    expect(after.precioMinorista.toNumber()).toBe(150);
    expect(after.precioSugerido?.toNumber()).toBe(185); // 150 × 123 / 100 = 184.5
  });

  it('has nothing to suggest when the cost did not change, or the old cost was zero', () => {
    expect(
      costAfterEntry(product(100, 150), 4, { cantidad: 1, costoUnitario: 100 }).precioSugerido,
    ).toBeNull();
    expect(
      costAfterEntry(product(0, 150), 4, { cantidad: 1, costoUnitario: 100 }).precioSugerido,
    ).toBeNull();
  });

  it('keeps a pending suggestion when the cost repeats, and chains from it when the cost moves', () => {
    // The price 150 was set for cost 100; cost 120 left 180 pending, nobody reviewed it.
    const pending = product(120, 150, null, 180);
    expect(suggestedPrice(pending, D(120))?.toNumber()).toBe(180);
    // Back to 100: the markup of the price itself, so nothing to review.
    expect(suggestedPrice(pending, D(100))).toBeNull();
    expect(suggestedPrice(pending, D(132))?.toNumber()).toBe(198);
  });

  it('reads the markup over cost', () => {
    expect(markupPercent(150, 100)).toBe(50);
    expect(markupPercent(1900, 1100)).toBe(72.7);
    expect(markupPercent(10, 0)).toBeNull();
  });

  it('records a cost change with before and after, and nothing when nothing changed', () => {
    const before = product(100, 150);
    const after = costAfterEntry(before, 0, { cantidad: 2, costoUnitario: 110 });
    expect(costAuditEntry({ id: 'p', nombre: 'Yerba' }, before, after, 'Compra')).toEqual({
      accion: 'PRODUCTO_COSTO_CAMBIADO',
      entidad: 'Producto',
      entidadId: 'p',
      antes: { nombre: 'Yerba', costo: 100, costoPromedio: null, precioSugerido: null },
      despues: {
        nombre: 'Yerba',
        costo: 110,
        costoPromedio: 110,
        precioMinorista: 150,
        precioSugerido: 165,
      },
      motivo: 'Compra',
    });
    const same = product(100, 150, 100);
    expect(
      costAuditEntry(
        { id: 'p', nombre: 'Yerba' },
        same,
        costAfterEntry(same, 5, { cantidad: 1, costoUnitario: 100 }),
        'Compra',
      ),
    ).toBeNull();
  });
});
