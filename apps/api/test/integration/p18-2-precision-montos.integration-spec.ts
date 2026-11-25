import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { forCompanyWithRls } from '../../src/prisma/business-context';
import { createBusinessWithOwner } from '../../src/platform-admin/create-business';

/**
 * ADR-DAT-017 — amount precision in the migrated database (FASE-2-BASE-SEGURA §6): amounts
 * NUMERIC(18,2); quantities, unit costs and factors NUMERIC(18,4); percentages NUMERIC(5,2).
 * No numeric column is left without precision. The database rounds half away from zero when
 * it saves, the same half-up rule the application applies per line. The rule per field is
 * checked against the schema in src/prisma/decimal-precision.spec.ts.
 */
describe('P18-2 — precisión de montos (ADR-DAT-017)', () => {
  let system: PrismaService;
  let app: PrismaClient;
  let empresaId: string;
  const clienteIds: string[] = [];

  beforeAll(async () => {
    system = new PrismaService();
    app = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    await Promise.all([system.$connect(), app.$connect()]);
    ({ empresaId } = await system.$transaction((tx) =>
      createBusinessWithOwner(tx, {
        nombre: 'P18-2 Precisión',
        slug: 'p18-2-precision',
        ownerNombre: 'Dueña P18-2',
        ownerEmail: 'p18-2-owner@example.test',
      }),
    ));
  });

  afterAll(async () => {
    if (clienteIds.length > 0) {
      await system.cliente.deleteMany({ where: { id: { in: clienteIds } } });
    }
    await Promise.all([system?.$disconnect(), app?.$disconnect()]);
  });

  const numericColumns = () =>
    system.$queryRaw<Array<{ col: string; kind: string }>>`
      SELECT table_name::text || '.' || column_name::text AS col,
             coalesce(numeric_precision::text || ',' || numeric_scale::text, 'none') AS kind
      FROM information_schema.columns
      WHERE table_schema = 'public' AND data_type = 'numeric'
      ORDER BY 1`;

  it('every numeric column has the precision of an amount, a quantity or a percentage', async () => {
    const columns = await numericColumns();
    expect(columns.length).toBeGreaterThan(0);
    expect(
      columns
        .filter(({ kind }) => !['18,2', '18,4', '5,2'].includes(kind))
        .map(({ col, kind }) => `${col}: ${kind}`),
    ).toEqual([]);
  });

  it('amounts, quantities, unit costs, factors and percentages', async () => {
    const kinds = Object.fromEntries((await numericColumns()).map(({ col, kind }) => [col, kind]));
    expect({
      'Venta.total': kinds['Venta.total'],
      'VentaItem.precioUnitario': kinds['VentaItem.precioUnitario'],
      'Payment.monto': kinds['Payment.monto'],
      'VentaItem.cantidad': kinds['VentaItem.cantidad'],
      'Producto.costo': kinds['Producto.costo'],
      'Presentacion.factorConversion': kinds['Presentacion.factorConversion'],
      'Producto.descuentoPorcentaje': kinds['Producto.descuentoPorcentaje'],
    }).toEqual({
      'Venta.total': '18,2',
      'VentaItem.precioUnitario': '18,2',
      'Payment.monto': '18,2',
      'VentaItem.cantidad': '18,4',
      'Producto.costo': '18,4',
      'Presentacion.factorConversion': '18,4',
      'Producto.descuentoPorcentaje': '5,2',
    });
  });

  it('the database rounds an amount half away from zero when it saves it', async () => {
    const saved = await Promise.all(
      ['1234.565', '1234.564', '0.005'].map((limiteCredito, i) =>
        // As the API writes: wapsell_app with the business fixed for row-level security (INIT-019 PR 5).
        forCompanyWithRls(app, empresaId).cliente.create({
          data: { empresaId, nombre: `P18-2 cliente ${i}`, limiteCredito },
          select: { id: true, limiteCredito: true },
        }),
      ),
    );
    clienteIds.push(...saved.map(({ id }) => id));
    expect(saved.map(({ limiteCredito }) => limiteCredito?.toFixed(2))).toEqual([
      '1234.57',
      '1234.56',
      '0.01',
    ]);
  });
});
