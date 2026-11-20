import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ADR-DAT-017 — every Decimal declares the precision of its kind (FASE-2-BASE-SEGURA §6):
 * - quantities (also fractional: kg, litres), minimum stock, unit costs and conversion
 *   factors: NUMERIC(18,4);
 * - percentages and rates: NUMERIC(5,2);
 * - everything else is an amount (totals, balances, payments, commissions, change, cash,
 *   credit limits, sale prices): NUMERIC(18,2).
 * The kind comes from the field name. A new kind (an exchange rate, for example) needs a
 * decision in the ADR first, and then a rule here.
 */
const SCHEMA = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');

// costoPromedio (stage C1) is a unit cost too: the moving weighted average of ADR-DAT-009.
const QUANTITY = /^(cantidad\w*|costo|costoUnitario|costoPromedio|factor\w*|stockMinimo)$/;
const PERCENT = /(Porcentaje|^tasa\w*)$/;

function expectedPrecision(field: string): string {
  if (PERCENT.test(field)) return '5,2';
  if (QUANTITY.test(field)) return '18,4';
  return '18,2';
}

function decimalFields(): Array<{ field: string; precision: string }> {
  const fields: Array<{ field: string; precision: string }> = [];
  let model: string | null = null;
  for (const line of SCHEMA.split('\n')) {
    const header = /^model (\w+) \{/.exec(line);
    if (header) {
      model = header[1];
    } else if (line.startsWith('}')) {
      model = null;
    } else {
      const field = model ? /^\s+(\w+)\s+Decimal\??(.*)$/.exec(line) : null;
      if (field) {
        const native = /@db\.Decimal\((\d+),\s*(\d+)\)/.exec(field[2]);
        fields.push({
          field: `${model}.${field[1]}`,
          precision: native ? `${native[1]},${native[2]}` : 'none',
        });
      }
    }
  }
  return fields;
}

describe('amount precision (ADR-DAT-017)', () => {
  const fields = decimalFields();

  it('reads the Decimal fields of the schema', () => {
    expect(fields.length).toBeGreaterThan(0);
  });

  it('every Decimal has the precision of its kind', () => {
    const wrong = fields
      .filter(({ field, precision }) => precision !== expectedPrecision(field.split('.')[1]))
      .map(
        ({ field, precision }) =>
          `${field}: ${precision}, expected ${expectedPrecision(field.split('.')[1])}`,
      );
    expect(wrong).toEqual([]);
  });

  it('classifies by name', () => {
    expect(
      [
        'total',
        'precioUnitario',
        'costoTotal',
        'cantidad',
        'costoUnitario',
        'costoPromedio',
        'factorConversion',
        'stockMinimo',
        'descuentoPorcentaje',
        'tasaClick',
      ].map(expectedPrecision),
    ).toEqual(['18,2', '18,2', '18,2', '18,4', '18,4', '18,4', '18,4', '18,4', '5,2', '5,2']);
  });
});
