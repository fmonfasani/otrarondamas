import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * ADR-DAT-020 (INIT-019 PR 4, module 4a: cash and payments). Cash openings, counts, closings and
 * movements, authorizations, current accounts, debts, payments and their applications reference their
 * parents with the business in the key, Restrict both ways: (empresaId, cajaId) → Caja (empresaId, id).
 * The database refuses a row that points to another business's cash register, user, customer, debt or
 * payment, whichever role writes it (the system role included), and a referenced row can be neither
 * deleted nor moved to another business.
 */
const MODULE_TABLES = [
  'Caja',
  'AperturaCaja',
  'ArqueoCaja',
  'CierreCaja',
  'MovimientoCaja',
  'Autorizacion',
  'CuentaCorriente',
  'Deuda',
  'Pago',
  'AplicacionPago',
];

type Business = Awaited<ReturnType<typeof createBusiness>>;

async function createBusiness(prisma: PrismaService, label: string, suffix: number) {
  const { id } = await prisma.empresa.create({
    data: {
      nombre: `P18-7 ${label} ${suffix}`,
      slug: `p18-7-${label}-${suffix}`,
      configuracion: {},
    },
    select: { id: true },
  });
  const user = await prisma.usuario.create({
    data: {
      empresaId: id,
      nombre: `P18-7 User ${label}`,
      email: `p18-7-${label}-${suffix}@example.test`,
    },
  });
  const customer = await prisma.cliente.create({
    data: { empresaId: id, nombre: `P18-7 Customer ${label}` },
  });
  const register = await prisma.caja.create({ data: { empresaId: id, fondoFijo: 0 } });
  const opening = await prisma.aperturaCaja.create({
    data: { empresaId: id, cajaId: register.id, usuarioId: user.id, montoInicial: 100 },
  });
  const authorization = await prisma.autorizacion.create({
    data: { empresaId: id, autorizadorId: user.id, operacion: 'P18-7' },
  });
  const account = await prisma.cuentaCorriente.create({
    data: { empresaId: id, clienteId: customer.id },
  });
  const debt = await prisma.deuda.create({
    data: {
      empresaId: id,
      clienteId: customer.id,
      cuentaCorrienteId: account.id,
      montoTotal: 50,
      montoPendiente: 50,
    },
  });
  const payment = await prisma.pago.create({
    data: { empresaId: id, usuarioId: user.id, monto: 20, medio: 'efectivo' },
  });
  return {
    id,
    user: user.id,
    customer: customer.id,
    register: register.id,
    opening: opening.id,
    authorization: authorization.id,
    account: account.id,
    debt: debt.id,
    payment: payment.id,
  };
}

describe('P18-7 — claves compuestas: caja y cobros (ADR-DAT-020)', () => {
  let prisma: PrismaService;
  let suffix: number;
  let A: Business;
  let B: Business;

  const code = (error: unknown) => (error as { code?: string }).code;
  const rejection = async (promise: Promise<unknown>) => {
    try {
      await promise;
      return 'written';
    } catch (error) {
      return code(error);
    }
  };

  beforeAll(async () => {
    // The system role (wapsell_system) bypasses row security by design: the keys must hold for it too.
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    A = await createBusiness(prisma, 'A', suffix);
    B = await createBusiness(prisma, 'B', suffix);
  });

  afterAll(async () => {
    const empresaId = { in: [A?.id, B?.id].filter(Boolean) as string[] };
    await prisma.aplicacionPago.deleteMany({ where: { empresaId } });
    await prisma.pago.deleteMany({ where: { empresaId } });
    await prisma.deuda.deleteMany({ where: { empresaId } });
    await prisma.cuentaCorriente.deleteMany({ where: { empresaId } });
    await prisma.cierreCaja.deleteMany({ where: { empresaId } });
    await prisma.arqueoCaja.deleteMany({ where: { empresaId } });
    await prisma.movimientoCaja.deleteMany({ where: { empresaId } });
    await prisma.aperturaCaja.deleteMany({ where: { empresaId } });
    await prisma.autorizacion.deleteMany({ where: { empresaId } });
    await prisma.caja.deleteMany({ where: { empresaId } });
    await prisma.cliente.deleteMany({ where: { empresaId } });
    await prisma.usuario.deleteMany({ where: { empresaId } });
    await prisma.empresa.deleteMany({ where: { id: empresaId } });
    await prisma.$disconnect();
  });

  it('every foreign key of the module carries the business and restricts delete and update', async () => {
    type Fk = {
      name: string;
      on_delete: string;
      on_update: string;
      columns: string[];
      referenced_columns: string[];
    };
    const fks = await prisma.$queryRaw<Fk[]>`
      SELECT c.conname::text AS name, c.confdeltype::text AS on_delete, c.confupdtype::text AS on_update,
             ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY AS k(n, i)
                   JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.n ORDER BY k.i) AS columns,
             ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY AS k(n, i)
                   JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.n ORDER BY k.i)
               AS referenced_columns
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_class r ON r.oid = c.confrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace AND n.nspname = 'public'
      WHERE c.contype = 'f' AND t.relname::text = ANY(${MODULE_TABLES}) AND r.relname <> 'Empresa'
      ORDER BY 1`;

    // AperturaCaja 2, ArqueoCaja 5, CierreCaja 2, MovimientoCaja 3, Autorizacion 1,
    // CuentaCorriente 1, Deuda 3, Pago 4, AplicacionPago 2.
    expect(fks).toHaveLength(23);
    const wrong = fks
      .filter((fk) => {
        const at = fk.columns.indexOf('empresaId');
        const carries = at >= 0 && fk.referenced_columns[at] === 'empresaId';
        return !carries || fk.on_delete !== 'r' || fk.on_update !== 'r';
      })
      .map((fk) => fk.name);
    expect(wrong).toEqual([]);
  });

  it("the database refuses another business's cash register, user, customer, debt or payment, even for the system role", async () => {
    // A cash opening of A on B's register, and a movement of A recorded by B's user.
    expect(
      await rejection(
        prisma.aperturaCaja.create({
          data: { empresaId: A.id, cajaId: B.register, usuarioId: A.user, montoInicial: 0 },
        }),
      ),
    ).toBe('P2003');
    expect(
      await rejection(
        prisma.movimientoCaja.create({
          data: {
            empresaId: A.id,
            cajaId: A.register,
            aperturaCajaId: A.opening,
            usuarioId: B.user,
            tipo: 'Ingreso',
            monto: 1,
          },
        }),
      ),
    ).toBe('P2003');
    // A cash count of A that cites B's authorization.
    expect(
      await rejection(
        prisma.arqueoCaja.create({
          data: {
            empresaId: A.id,
            cajaId: A.register,
            aperturaCajaId: A.opening,
            usuarioId: A.user,
            usuarioEntranteId: A.user,
            autorizacionId: B.authorization,
            fondoFijoContado: 0,
            efectivoVentasContado: 0,
            efectivoDeudasContado: 0,
            gastosRetirosRegistrados: 0,
            efectivoEsperado: 0,
            efectivoContado: 0,
            diferencia: 0,
          },
        }),
      ),
    ).toBe('P2003');
    // A closing of A on B's opening.
    expect(
      await rejection(
        prisma.cierreCaja.create({
          data: { empresaId: A.id, aperturaCajaId: B.opening, usuarioId: A.user, montoFinal: 0 },
        }),
      ),
    ).toBe('P2003');
    // A current account and a debt of A for B's customer; a payment of A to B's account.
    expect(
      await rejection(
        prisma.cuentaCorriente.create({ data: { empresaId: A.id, clienteId: B.customer } }),
      ),
    ).toBe('P2003');
    expect(
      await rejection(
        prisma.deuda.create({
          data: { empresaId: A.id, clienteId: B.customer, montoTotal: 1, montoPendiente: 1 },
        }),
      ),
    ).toBe('P2003');
    expect(
      await rejection(
        prisma.pago.create({
          data: { empresaId: A.id, deudaId: B.account, monto: 1, medio: 'efectivo' },
        }),
      ),
    ).toBe('P2003');
    // A payment of A applied to B's debt.
    expect(
      await rejection(
        prisma.aplicacionPago.create({
          data: { empresaId: A.id, pagoId: A.payment, deudaId: B.debt, montoAplicado: 1 },
        }),
      ),
    ).toBe('P2003');
    // The same application inside A is fine.
    expect(
      await rejection(
        prisma.aplicacionPago.create({
          data: { empresaId: A.id, pagoId: A.payment, deudaId: A.debt, montoAplicado: 1 },
        }),
      ),
    ).toBe('written');
  });

  it('a referenced row can be neither deleted nor moved to another business', async () => {
    expect(await rejection(prisma.caja.delete({ where: { id: A.register } }))).toBe('P2003');
    expect(await rejection(prisma.usuario.delete({ where: { id: A.user } }))).toBe('P2003');
    expect(await rejection(prisma.cliente.delete({ where: { id: A.customer } }))).toBe('P2003');
    expect(
      await rejection(
        prisma.aperturaCaja.update({ where: { id: A.opening }, data: { empresaId: B.id } }),
      ),
    ).toBe('P2003');
    expect(
      await rejection(prisma.pago.update({ where: { id: A.payment }, data: { empresaId: B.id } })),
    ).toBe('P2003');
  });
});
