import { Prisma } from '@prisma/client';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantPrismaService } from '../../src/prisma/tenant-prisma.service';

/**
 * ADR-DAT-020 (INIT-019 PR 4, module 1: sales and orders). The lines of sales, orders, customer
 * returns and carts carry their business, and every reference of the module is composite:
 * (empresaId, ventaId) → Venta (empresaId, id). The database rejects a row that points to another
 * business, whichever role writes it, and a referenced row can be neither deleted nor moved to
 * another business.
 */
const MODULE_TABLES = [
  'Venta',
  'VentaItem',
  'Pedido',
  'PedidoItem',
  'Entrega',
  'DevolucionCliente',
  'DevolucionClienteItem',
  'Reembolso',
  'Cart',
  'CartItem',
];
/** Header → lines: deleting the header still deletes its lines, as before. */
const CASCADE = new Set([
  'CartItem_businessId_cartId_fkey',
  'DevolucionClienteItem_empresaId_devolucionClienteId_fkey',
  'Reembolso_empresaId_devolucionClienteId_fkey',
]);

type Business = Awaited<ReturnType<typeof createBusiness>>;

async function createBusiness(prisma: PrismaService, label: string, suffix: number) {
  const { id } = await prisma.empresa.create({
    data: {
      nombre: `P18-4 ${label} ${suffix}`,
      slug: `p18-4-${label}-${suffix}`,
      configuracion: {},
    },
    select: { id: true },
  });
  const familia = await prisma.familia.create({
    data: { empresaId: id, nombre: `P18-4 F ${label}`, prefijo: `F${label}` },
  });
  const subfamilia = await prisma.subfamilia.create({
    data: {
      empresaId: id,
      familiaId: familia.id,
      nombre: `P18-4 S ${label}`,
      prefijo: `S${label}`,
    },
  });
  const tipo = await prisma.tipo.create({
    data: {
      empresaId: id,
      subfamiliaId: subfamilia.id,
      nombre: `P18-4 T ${label}`,
      prefijo: `T${label}`,
    },
  });
  const subtipo = await prisma.subtipo.create({
    data: { empresaId: id, tipoId: tipo.id, nombre: `P18-4 X ${label}`, prefijo: `X${label}` },
  });
  const user = await prisma.usuario.create({
    data: {
      empresaId: id,
      nombre: `P18-4 U ${label}`,
      email: `p18-4-${label}-${suffix}@example.test`,
    },
  });
  const product = await prisma.producto.create({
    data: {
      empresaId: id,
      nombre: `P18-4 P ${label}`,
      codigoInterno: `P184${label}${suffix}`,
      familiaId: familia.id,
      subfamiliaId: subfamilia.id,
      tipoId: tipo.id,
      subtipoId: subtipo.id,
      unidadBase: 'UNIDAD',
      costo: 5,
      precioMinorista: 10,
    },
  });
  const customer = await prisma.cliente.create({
    data: {
      empresaId: id,
      nombre: `P18-4 C ${label}`,
      email: `p18-4-c-${label}-${suffix}@example.test`,
    },
  });
  const rule = await prisma.reglaFidelizacion.create({
    data: {
      empresaId: id,
      nombre: `P18-4 R ${label}`,
      nivelRequerido: 'VIP',
      descuentoPorcentaje: 10,
    },
  });
  return { id, user: user.id, product: product.id, customer: customer.id, rule: rule.id };
}

describe('P18-4 — claves compuestas: ventas y pedidos (ADR-DAT-020)', () => {
  let prisma: PrismaService;
  let tenant: TenantPrismaService;
  let scoped: CompanyScopedPrismaService;
  let A: Business;
  let B: Business;

  const line = (productoId: string) => ({ productoId, cantidad: 1, precioUnitario: 10 });
  const sale = (b: Business, lines: string[] = []) =>
    prisma.venta.create({
      data: {
        empresaId: b.id,
        usuarioId: b.user,
        clienteId: b.customer,
        canal: 'p18-4',
        total: 10,
        VentaItem: { create: lines.map(line) },
      },
      include: { VentaItem: true },
    });
  const order = (b: Business, lines: string[] = []) =>
    prisma.pedido.create({
      data: {
        empresaId: b.id,
        clienteId: b.customer,
        canalOrigen: 'p18-4',
        total: 10,
        PedidoItem: { create: lines.map(line) },
      },
      include: { PedidoItem: true },
    });
  const customerReturn = (b: Business, ventaId: string, ventaItemId?: string) =>
    prisma.devolucionCliente.create({
      data: {
        empresaId: b.id,
        clienteId: b.customer,
        ventaId,
        creadoPorId: b.user,
        ventaFecha: new Date(),
        montoTotal: 10,
        montoReembolsable: 10,
        motivo: 'p18-4',
        DevolucionClienteItem: ventaItemId
          ? {
              create: [
                {
                  ventaItemId,
                  productoId: b.product,
                  cantidad: 1,
                  precioUnitarioOriginal: 10,
                  precioDevuelto: 10,
                  montoLineaDevuelto: 10,
                },
              ],
            }
          : undefined,
      },
      include: { DevolucionClienteItem: true },
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
      await prisma.cartItem.deleteMany({ where: { businessId: empresaId } });
      await prisma.cart.deleteMany({ where: { businessId: empresaId } });
      await prisma.reembolso.deleteMany({ where: { empresaId } });
      await prisma.devolucionClienteItem.deleteMany({ where: { empresaId } });
      await prisma.devolucionCliente.deleteMany({ where: { empresaId } });
      await prisma.entrega.deleteMany({ where: { empresaId } });
      await prisma.pedidoItem.deleteMany({ where: { empresaId } });
      await prisma.pedido.deleteMany({ where: { empresaId } });
      await prisma.ventaItem.deleteMany({ where: { empresaId } });
      await prisma.venta.deleteMany({ where: { empresaId } });
      await prisma.reglaFidelizacion.deleteMany({ where: { empresaId } });
      await prisma.cliente.deleteMany({ where: { empresaId } });
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

    // Stage C3 (OR-B4-046 §4.4) adds VentaItem → Oferta and PedidoItem → Oferta: 23 + 2. The
    // property below holds for them too: they carry the business and restrict both ways.
    expect(fks).toHaveLength(25);
    expect(fks.map((fk) => fk.name)).toEqual(
      expect.arrayContaining([
        'VentaItem_empresaId_ofertaId_fkey',
        'PedidoItem_empresaId_ofertaId_fkey',
      ]),
    );
    const wrong = fks
      .filter((fk) => {
        const at = fk.columns.findIndex((c) => c === 'empresaId' || c === 'businessId');
        const carries = at >= 0 && ['empresaId', 'businessId'].includes(fk.referenced_columns[at]);
        const onDelete = CASCADE.has(fk.name) ? 'c' : 'r';
        return !carries || fk.on_delete !== onDelete || fk.on_update !== 'r';
      })
      .map((fk) => fk.name);
    expect(wrong).toEqual([]);
  });

  it('each line takes its business from its header', async () => {
    const venta = await sale(A, [A.product]);
    const pedido = await order(A, [A.product]);
    const devolucion = await customerReturn(A, venta.id, venta.VentaItem[0].id);
    const cart = await prisma.cart.create({
      data: {
        businessId: A.id,
        customerId: A.customer,
        CartItem: { create: [{ productoId: A.product, cantidad: 1 }] },
      },
      include: { CartItem: true },
    });

    expect(venta.VentaItem.map((i) => i.empresaId)).toEqual([A.id]);
    expect(pedido.PedidoItem.map((i) => i.empresaId)).toEqual([A.id]);
    expect(devolucion.DevolucionClienteItem.map((i) => i.empresaId)).toEqual([A.id]);
    expect(cart.CartItem.map((i) => i.businessId)).toEqual([A.id]);
  });

  it('the database rejects a reference to another business, even for the system role', async () => {
    const saleA = await sale(A);
    const saleB = await sale(B, [B.product]);
    const orderA = await order(A);
    const orderB = await order(B);
    const returnA = await customerReturn(A, saleA.id);
    const returnB = await customerReturn(B, saleB.id);
    const cartA = await prisma.cart.findFirstOrThrow({ where: { businessId: A.id } });
    const returnLine = (ventaItemId: string) => ({
      ventaItemId,
      productoId: A.product,
      cantidad: 1,
      precioUnitarioOriginal: 10,
      precioDevuelto: 10,
      montoLineaDevuelto: 10,
    });

    const attempts: Array<[string, () => Promise<unknown>]> = [
      [
        'a sale line with a product of B',
        () =>
          prisma.ventaItem.create({
            data: { empresaId: A.id, ventaId: saleA.id, ...line(B.product) },
          }),
      ],
      [
        'a sale line of A on a sale of B',
        () =>
          prisma.ventaItem.create({
            data: { empresaId: A.id, ventaId: saleB.id, ...line(A.product) },
          }),
      ],
      [
        'a sale line with a loyalty rule of B',
        () =>
          prisma.ventaItem.create({
            data: {
              empresaId: A.id,
              ventaId: saleA.id,
              ...line(A.product),
              reglaFidelizacionId: B.rule,
            },
          }),
      ],
      [
        'a sale of A for a customer of B',
        () =>
          prisma.venta.create({
            data: {
              empresaId: A.id,
              usuarioId: A.user,
              clienteId: B.customer,
              canal: 'x',
              total: 1,
            },
          }),
      ],
      [
        'a sale of A by a user of B',
        () =>
          prisma.venta.create({
            data: { empresaId: A.id, usuarioId: B.user, canal: 'x', total: 1 },
          }),
      ],
      [
        'an order line with a product of B',
        () =>
          prisma.pedidoItem.create({
            data: { empresaId: A.id, pedidoId: orderA.id, ...line(B.product) },
          }),
      ],
      [
        'an order line with a loyalty rule of B',
        () =>
          prisma.pedidoItem.create({
            data: {
              empresaId: A.id,
              pedidoId: orderA.id,
              ...line(A.product),
              reglaFidelizacionId: B.rule,
            },
          }),
      ],
      [
        'an order of A for a customer of B',
        () =>
          prisma.pedido.create({
            data: { empresaId: A.id, clienteId: B.customer, canalOrigen: 'x', total: 1 },
          }),
      ],
      [
        'an order of A taken by a user of B',
        () => prisma.pedido.update({ where: { id: orderA.id }, data: { usuarioId: B.user } }),
      ],
      [
        'a delivery of A for an order of B',
        () => prisma.entrega.create({ data: { empresaId: A.id, pedidoId: orderB.id } }),
      ],
      [
        'a delivery of A prepared by a user of B',
        () =>
          prisma.entrega.create({
            data: { empresaId: A.id, pedidoId: orderA.id, preparadorId: B.user },
          }),
      ],
      ['a return of A on a sale of B', () => customerReturn(A, saleB.id)],
      [
        'a return line of A on a sale line of B',
        () =>
          prisma.devolucionClienteItem.create({
            data: {
              empresaId: A.id,
              devolucionClienteId: returnA.id,
              ...returnLine(saleB.VentaItem[0].id),
            },
          }),
      ],
      [
        'a refund of A for a return of B',
        () =>
          prisma.reembolso.create({
            data: {
              empresaId: A.id,
              devolucionClienteId: returnB.id,
              montoReembolsable: 1,
              montoActual: 1,
            },
          }),
      ],
      [
        'a cart of A for a customer of B',
        () => prisma.cart.create({ data: { businessId: A.id, customerId: B.customer } }),
      ],
      [
        'a cart line with a product of B',
        () =>
          prisma.cartItem.create({
            data: { businessId: A.id, cartId: cartA.id, productoId: B.product, cantidad: 1 },
          }),
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
    const venta = await sale(A, [A.product]);

    await expect(prisma.producto.delete({ where: { id: A.product } })).rejects.toMatchObject({
      code: 'P2003',
    });
    await expect(prisma.venta.delete({ where: { id: venta.id } })).rejects.toMatchObject({
      code: 'P2003',
    });
    await expect(
      prisma.cliente.update({ where: { id: A.customer }, data: { empresaId: B.id } }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(
      prisma.usuario.update({ where: { id: A.user }, data: { empresaId: B.id } }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('a header still takes its lines with it where it did before', async () => {
    const customer = await prisma.cliente.create({ data: { empresaId: A.id, nombre: 'P18-4 C2' } });
    const cart = await prisma.cart.create({
      data: {
        businessId: A.id,
        customerId: customer.id,
        CartItem: { create: [{ productoId: A.product, cantidad: 1 }] },
      },
    });
    await prisma.cart.delete({ where: { id: cart.id } });
    expect(await prisma.cartItem.count({ where: { cartId: cart.id } })).toBe(0);
  });

  it('the scoped client gives its business to lines written on their own', async () => {
    const venta = await sale(A);
    // No empresaId: companyScopeExtension adds the business of the scoped client.
    const withoutBusiness = {
      ventaId: venta.id,
      ...line(A.product),
    } as unknown as Prisma.VentaItemCreateManyInput;

    await scoped.forCompany(A.id).ventaItem.createMany({ data: [withoutBusiness] });
    expect(
      (await prisma.ventaItem.findFirstOrThrow({ where: { ventaId: venta.id } })).empresaId,
    ).toBe(A.id);

    // Business B cannot hang a line on a sale of A, even with its own product.
    await expect(
      scoped.forCompany(B.id).ventaItem.create({
        data: {
          ventaId: venta.id,
          ...line(B.product),
        } as unknown as Prisma.VentaItemUncheckedCreateInput,
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });
});
