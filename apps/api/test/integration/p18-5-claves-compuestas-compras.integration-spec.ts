import { Prisma } from '@prisma/client';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantPrismaService } from '../../src/prisma/tenant-prisma.service';

/**
 * ADR-DAT-020 (INIT-019 PR 4, module 2: purchases and stock). Purchase lines and supplier return
 * lines carry their business, and every reference of the module is composite:
 * (empresaId, compraId) → Compra (empresaId, id). The database rejects a purchase, a reception, a
 * supplier payment or return, a lot or a stock movement that points to another business, whichever
 * role writes it, and a referenced row can be neither deleted nor moved to another business.
 */
const MODULE_TABLES = [
  'Compra',
  'CompraItem',
  'RecepcionCompra',
  'PagoProveedor',
  'DevolucionProveedor',
  'DevolucionProveedorItem',
  'ProductoProveedor',
  'Lote',
  'MovimientoStock',
];

type Business = Awaited<ReturnType<typeof createBusiness>>;

async function createBusiness(prisma: PrismaService, label: string, suffix: number) {
  const { id } = await prisma.empresa.create({
    data: {
      nombre: `P18-5 ${label} ${suffix}`,
      slug: `p18-5-${label}-${suffix}`,
      configuracion: {},
    },
    select: { id: true },
  });
  const familia = await prisma.familia.create({
    data: { empresaId: id, nombre: `P18-5 F ${label}`, prefijo: `F${label}` },
  });
  const subfamilia = await prisma.subfamilia.create({
    data: {
      empresaId: id,
      familiaId: familia.id,
      nombre: `P18-5 S ${label}`,
      prefijo: `S${label}`,
    },
  });
  const tipo = await prisma.tipo.create({
    data: {
      empresaId: id,
      subfamiliaId: subfamilia.id,
      nombre: `P18-5 T ${label}`,
      prefijo: `T${label}`,
    },
  });
  const subtipo = await prisma.subtipo.create({
    data: { empresaId: id, tipoId: tipo.id, nombre: `P18-5 X ${label}`, prefijo: `X${label}` },
  });
  const user = await prisma.usuario.create({
    data: {
      empresaId: id,
      nombre: `P18-5 U ${label}`,
      email: `p18-5-${label}-${suffix}@example.test`,
    },
  });
  const product = await prisma.producto.create({
    data: {
      empresaId: id,
      nombre: `P18-5 P ${label}`,
      codigoInterno: `P185${label}${suffix}`,
      familiaId: familia.id,
      subfamiliaId: subfamilia.id,
      tipoId: tipo.id,
      subtipoId: subtipo.id,
      unidadBase: 'UNIDAD',
      costo: 5,
      precioMinorista: 10,
    },
  });
  const supplier = await prisma.proveedor.create({
    data: { empresaId: id, nombre: `P18-5 Proveedor ${label} ${suffix}` },
  });
  const lot = await prisma.lote.create({
    data: {
      empresaId: id,
      productoId: product.id,
      numeroLote: `L-${label}-${suffix}`,
      vencimiento: new Date('2099-01-01'),
      cantidad: 10,
    },
  });
  return { id, user: user.id, product: product.id, supplier: supplier.id, lot: lot.id };
}

describe('P18-5 — claves compuestas: compras y stock (ADR-DAT-020)', () => {
  let prisma: PrismaService;
  let tenant: TenantPrismaService;
  let scoped: CompanyScopedPrismaService;
  let A: Business;
  let B: Business;

  const line = (productoId: string) => ({ productoId, cantidadPedida: 2, costoUnitario: 5 });
  const purchase = (b: Business, lines: string[] = []) =>
    prisma.compra.create({
      data: {
        empresaId: b.id,
        proveedorId: b.supplier,
        usuarioId: b.user,
        total: 10,
        CompraItem: { create: lines.map(line) },
      },
      include: { CompraItem: true },
    });
  const supplierReturn = (b: Business, compraId: string, lines: string[] = []) =>
    prisma.devolucionProveedor.create({
      data: {
        empresaId: b.id,
        compraId,
        proveedorId: b.supplier,
        usuarioId: b.user,
        motivo: 'p18-5',
        DevolucionProveedorItem: {
          create: lines.map((productoId) => ({ productoId, cantidad: 1, costoUnitario: 5 })),
        },
      },
      include: { DevolucionProveedorItem: true },
    });

  beforeAll(async () => {
    prisma = new PrismaService();
    tenant = new TenantPrismaService();
    await Promise.all([prisma.$connect(), tenant.$connect()]);
    scoped = new CompanyScopedPrismaService(tenant);
    const suffix = Date.now();
    A = await createBusiness(prisma, 'a', suffix);
    B = await createBusiness(prisma, 'b', suffix);
  });

  afterAll(async () => {
    const ids = [A?.id, B?.id].filter(Boolean) as string[];
    if (ids.length) {
      const empresaId = { in: ids };
      await prisma.movimientoStock.deleteMany({ where: { empresaId } });
      await prisma.devolucionProveedorItem.deleteMany({ where: { empresaId } });
      await prisma.devolucionProveedor.deleteMany({ where: { empresaId } });
      await prisma.pagoProveedor.deleteMany({ where: { empresaId } });
      await prisma.recepcionCompra.deleteMany({ where: { empresaId } });
      await prisma.compraItem.deleteMany({ where: { empresaId } });
      await prisma.compra.deleteMany({ where: { empresaId } });
      await prisma.productoProveedor.deleteMany({ where: { empresaId } });
      await prisma.lote.deleteMany({ where: { empresaId } });
      await prisma.proveedor.deleteMany({ where: { empresaId } });
      await prisma.producto.deleteMany({ where: { empresaId } });
      await prisma.subtipo.deleteMany({ where: { empresaId } });
      await prisma.tipo.deleteMany({ where: { empresaId } });
      await prisma.subfamilia.deleteMany({ where: { empresaId } });
      await prisma.familia.deleteMany({ where: { empresaId } });
      await prisma.usuario.deleteMany({ where: { empresaId } });
      await prisma.empresa.deleteMany({ where: { id: empresaId } });
    }
    await Promise.all([prisma?.$disconnect(), tenant?.$disconnect()]);
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

    expect(fks).toHaveLength(22);
    const wrong = fks
      .filter((fk) => {
        const at = fk.columns.indexOf('empresaId');
        const carries = at >= 0 && fk.referenced_columns[at] === 'empresaId';
        return !carries || fk.on_delete !== 'r' || fk.on_update !== 'r';
      })
      .map((fk) => fk.name);
    expect(wrong).toEqual([]);
  });

  it('each line takes its business from its header', async () => {
    const compra = await purchase(A, [A.product]);
    const devolucion = await supplierReturn(A, compra.id, [A.product]);
    expect(compra.CompraItem.map((i) => i.empresaId)).toEqual([A.id]);
    expect(devolucion.DevolucionProveedorItem.map((i) => i.empresaId)).toEqual([A.id]);
  });

  it('the database rejects a reference to another business, even for the system role', async () => {
    const purchaseA = await purchase(A);
    const purchaseB = await purchase(B);
    const receptionB = await prisma.recepcionCompra.create({
      data: { empresaId: B.id, compraId: purchaseB.id, usuarioId: B.user },
    });
    const returnA = await supplierReturn(A, purchaseA.id);
    const returnB = await supplierReturn(B, purchaseB.id);
    const movement = (extra: Record<string, string>) => ({
      empresaId: A.id,
      productoId: A.product,
      tipoMovimiento: 'AJUSTE',
      cantidad: 1,
      motivo: 'p18-5',
      ...extra,
    });

    const attempts: Array<[string, () => Promise<unknown>]> = [
      [
        'a purchase of A from a supplier of B',
        () =>
          prisma.compra.create({
            data: { empresaId: A.id, proveedorId: B.supplier, usuarioId: A.user, total: 1 },
          }),
      ],
      [
        'a purchase of A by a user of B',
        () =>
          prisma.compra.create({
            data: { empresaId: A.id, proveedorId: A.supplier, usuarioId: B.user, total: 1 },
          }),
      ],
      [
        'a purchase line with a product of B',
        () =>
          prisma.compraItem.create({
            data: { empresaId: A.id, compraId: purchaseA.id, ...line(B.product) },
          }),
      ],
      [
        'a purchase line of A on a purchase of B',
        () =>
          prisma.compraItem.create({
            data: { empresaId: A.id, compraId: purchaseB.id, ...line(A.product) },
          }),
      ],
      [
        'a reception of A for a purchase of B',
        () =>
          prisma.recepcionCompra.create({
            data: { empresaId: A.id, compraId: purchaseB.id, usuarioId: A.user },
          }),
      ],
      [
        'a reception of A by a user of B',
        () =>
          prisma.recepcionCompra.create({
            data: { empresaId: A.id, compraId: purchaseA.id, usuarioId: B.user },
          }),
      ],
      [
        'a supplier payment of A for a purchase of B',
        () =>
          prisma.pagoProveedor.create({
            data: {
              empresaId: A.id,
              compraId: purchaseB.id,
              proveedorId: A.supplier,
              usuarioId: A.user,
              monto: 1,
              medioPago: 'EFECTIVO',
            },
          }),
      ],
      [
        'a supplier payment of A to a supplier of B',
        () =>
          prisma.pagoProveedor.create({
            data: {
              empresaId: A.id,
              compraId: purchaseA.id,
              proveedorId: B.supplier,
              usuarioId: A.user,
              monto: 1,
              medioPago: 'EFECTIVO',
            },
          }),
      ],
      [
        'a supplier payment of A by a user of B',
        () =>
          prisma.pagoProveedor.create({
            data: {
              empresaId: A.id,
              compraId: purchaseA.id,
              proveedorId: A.supplier,
              usuarioId: B.user,
              monto: 1,
              medioPago: 'EFECTIVO',
            },
          }),
      ],
      ['a supplier return of A on a purchase of B', () => supplierReturn(A, purchaseB.id)],
      [
        'a supplier return line of A on a return of B',
        () =>
          prisma.devolucionProveedorItem.create({
            data: {
              empresaId: A.id,
              devolucionId: returnB.id,
              productoId: A.product,
              cantidad: 1,
              costoUnitario: 5,
            },
          }),
      ],
      [
        'a supplier return line with a lot of B',
        () =>
          prisma.devolucionProveedorItem.create({
            data: {
              empresaId: A.id,
              devolucionId: returnA.id,
              productoId: A.product,
              loteId: B.lot,
              cantidad: 1,
              costoUnitario: 5,
            },
          }),
      ],
      [
        'a supplier of B for a product of A',
        () =>
          prisma.productoProveedor.create({
            data: { empresaId: A.id, productoId: A.product, proveedorId: B.supplier },
          }),
      ],
      [
        'a lot of A for a product of B',
        () =>
          prisma.lote.create({
            data: {
              empresaId: A.id,
              productoId: B.product,
              numeroLote: 'x',
              vencimiento: new Date('2099-01-01'),
              cantidad: 1,
            },
          }),
      ],
      [
        'a stock movement of A on a lot of B',
        () => prisma.movimientoStock.create({ data: movement({ loteId: B.lot }) }),
      ],
      [
        'a stock movement of A with a product of B',
        () => prisma.movimientoStock.create({ data: movement({ productoId: B.product }) }),
      ],
      [
        'a stock movement of A from a reception of B',
        () =>
          prisma.movimientoStock.create({ data: movement({ recepcionCompraId: receptionB.id }) }),
      ],
      [
        'a stock movement of A by a user of B',
        () => prisma.movimientoStock.create({ data: movement({ usuarioId: B.user }) }),
      ],
    ];

    const accepted: string[] = [];
    for (const [what, attempt] of attempts) {
      try {
        await attempt();
        accepted.push(`${what}: accepted`);
      } catch (error) {
        const code = (error as Prisma.PrismaClientKnownRequestError).code;
        if (code !== 'P2003') accepted.push(`${what}: ${code ?? (error as Error).message}`);
      }
    }
    expect(accepted).toEqual([]);
  });

  it('a referenced row can be neither deleted nor moved to another business', async () => {
    const compra = await purchase(A, [A.product]);

    await expect(prisma.proveedor.delete({ where: { id: A.supplier } })).rejects.toMatchObject({
      code: 'P2003',
    });
    await expect(prisma.compra.delete({ where: { id: compra.id } })).rejects.toMatchObject({
      code: 'P2003',
    });
    await expect(
      prisma.lote.update({ where: { id: A.lot }, data: { empresaId: B.id } }),
    ).rejects.toMatchObject({
      code: 'P2003',
    });
    await expect(
      prisma.proveedor.update({ where: { id: A.supplier }, data: { empresaId: B.id } }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('the scoped client gives its business to lines written on their own', async () => {
    const compra = await purchase(A);
    // No empresaId: companyScopeExtension adds the business of the scoped client.
    const withoutBusiness = {
      compraId: compra.id,
      ...line(A.product),
    } as unknown as Prisma.CompraItemCreateManyInput;

    await scoped.forCompany(A.id).compraItem.createMany({ data: [withoutBusiness] });
    expect(
      (await prisma.compraItem.findFirstOrThrow({ where: { compraId: compra.id } })).empresaId,
    ).toBe(A.id);

    // Business B cannot hang a line on a purchase of A, even with its own product.
    await expect(
      scoped.forCompany(B.id).compraItem.create({
        data: {
          compraId: compra.id,
          ...line(B.product),
        } as unknown as Prisma.CompraItemUncheckedCreateInput,
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });
});
