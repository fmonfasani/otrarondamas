import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 tenant isolation — execution candidates', () => {
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let companyA: { id: string };
  let companyB: { id: string };
  let userA: { id: string };
  let userB: { id: string };
  let productA: { id: string };
  let productB: { id: string };
  let customerA: { id: string };
  let customerB: { id: string };
  let supplierA: { id: string };
  let supplierB: { id: string };
  let ruleA: { id: string };
  let ruleB: { id: string };
  let familyA: { id: string };
  let familyB: { id: string };
  let subfamilyA: { id: string };
  let subfamilyB: { id: string };
  let typeA: { id: string };
  let typeB: { id: string };
  let subtypeA: { id: string };
  let subtypeB: { id: string };
  const transientUserIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new CompanyScopedPrismaService(prisma);

    const suffix = Date.now();

    companyA = await prisma.empresa.create({
      data: { nombre: `B3 Exec A ${suffix}`, slug: `b3-exec-a-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `B3 Exec B ${suffix}`, slug: `b3-exec-b-${suffix}`, configuracion: {} },
      select: { id: true },
    });

    familyA = await prisma.familia.create({
      data: {
        empresaId: companyA.id,
        nombre: `B3 Familia A ${suffix}`,
        prefijo: 'BFA',
      },
      select: { id: true },
    });
    subfamilyA = await prisma.subfamilia.create({
      data: {
        empresaId: companyA.id,
        familiaId: familyA.id,
        nombre: `B3 Subfamilia A ${suffix}`,
        prefijo: 'BSA',
      },
      select: { id: true },
    });
    typeA = await prisma.tipo.create({
      data: {
        empresaId: companyA.id,
        subfamiliaId: subfamilyA.id,
        nombre: `B3 Tipo A ${suffix}`,
        prefijo: 'BTA',
      },
      select: { id: true },
    });
    subtypeA = await prisma.subtipo.create({
      data: {
        empresaId: companyA.id,
        tipoId: typeA.id,
        nombre: `B3 Subtipo A ${suffix}`,
        prefijo: 'BXA',
      },
      select: { id: true },
    });

    familyB = await prisma.familia.create({
      data: {
        empresaId: companyB.id,
        nombre: `B3 Familia B ${suffix}`,
        prefijo: 'BFB',
      },
      select: { id: true },
    });
    subfamilyB = await prisma.subfamilia.create({
      data: {
        empresaId: companyB.id,
        familiaId: familyB.id,
        nombre: `B3 Subfamilia B ${suffix}`,
        prefijo: 'BSB',
      },
      select: { id: true },
    });
    typeB = await prisma.tipo.create({
      data: {
        empresaId: companyB.id,
        subfamiliaId: subfamilyB.id,
        nombre: `B3 Tipo B ${suffix}`,
        prefijo: 'BTB',
      },
      select: { id: true },
    });
    subtypeB = await prisma.subtipo.create({
      data: {
        empresaId: companyB.id,
        tipoId: typeB.id,
        nombre: `B3 Subtipo B ${suffix}`,
        prefijo: 'BXB',
      },
      select: { id: true },
    });

    userA = await prisma.usuario.create({
      data: {
        empresaId: companyA.id,
        nombre: 'B3 User A',
        email: `b3-user-a-${suffix}@example.test`,
      },
      select: { id: true },
    });
    userB = await prisma.usuario.create({
      data: {
        empresaId: companyB.id,
        nombre: 'B3 User B',
        email: `b3-user-b-${suffix}@example.test`,
      },
      select: { id: true },
    });

    productA = await prisma.producto.create({
      data: {
        empresaId: companyA.id,
        nombre: 'B3 Product A',
        codigoInterno: `B3PA${suffix}`,
        familiaId: familyA.id,
        subfamiliaId: subfamilyA.id,
        tipoId: typeA.id,
        subtipoId: subtypeA.id,
        unidadBase: 'UNIDAD',
        costo: 5,
        precioMinorista: 10,
      },
      select: { id: true },
    });
    productB = await prisma.producto.create({
      data: {
        empresaId: companyB.id,
        nombre: 'B3 Product B',
        codigoInterno: `B3PB${suffix}`,
        familiaId: familyB.id,
        subfamiliaId: subfamilyB.id,
        tipoId: typeB.id,
        subtipoId: subtypeB.id,
        unidadBase: 'UNIDAD',
        costo: 10,
        precioMinorista: 20,
      },
      select: { id: true },
    });

    customerA = await prisma.cliente.create({
      data: {
        empresaId: companyA.id,
        nombre: 'B3 Cliente A',
        email: `b3-cliente-a-${suffix}@example.test`,
      },
      select: { id: true },
    });
    customerB = await prisma.cliente.create({
      data: {
        empresaId: companyB.id,
        nombre: 'B3 Cliente B',
        email: `b3-cliente-b-${suffix}@example.test`,
      },
      select: { id: true },
    });

    supplierA = await prisma.proveedor.create({
      data: { empresaId: companyA.id, nombre: `B3 Proveedor A ${suffix}` },
      select: { id: true },
    });
    supplierB = await prisma.proveedor.create({
      data: { empresaId: companyB.id, nombre: `B3 Proveedor B ${suffix}` },
      select: { id: true },
    });

    ruleA = await prisma.reglaFidelizacion.create({
      data: {
        empresaId: companyA.id,
        nombre: 'B3 Regla A',
        nivelRequerido: 'VIP',
        descuentoPorcentaje: 10,
      },
      select: { id: true },
    });
    ruleB = await prisma.reglaFidelizacion.create({
      data: {
        empresaId: companyB.id,
        nombre: 'B3 Regla B',
        nivelRequerido: 'VIP',
        descuentoPorcentaje: 20,
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    if (!companyA || !companyB) {
      await prisma.$disconnect();
      return;
    }

    await prisma.pedidoItem.deleteMany({
      where: { pedido: { empresaId: { in: [companyA.id, companyB.id] } } },
    });
    await prisma.pedido.deleteMany({ where: { empresaId: { in: [companyA.id, companyB.id] } } });
    await prisma.ventaItem.deleteMany({
      where: { venta: { empresaId: { in: [companyA.id, companyB.id] } } },
    });
    await prisma.venta.deleteMany({
      where: { empresaId: { in: [companyA.id, companyB.id] } },
    });
    await prisma.reglaFidelizacion.deleteMany({ where: { id: { in: [ruleA.id, ruleB.id] } } });
    await prisma.cliente.deleteMany({ where: { id: { in: [customerA.id, customerB.id] } } });
    await prisma.compraItem.deleteMany({
      where: { compra: { empresaId: { in: [companyA.id, companyB.id] } } },
    });
    await prisma.compra.deleteMany({ where: { empresaId: { in: [companyA.id, companyB.id] } } });
    await prisma.proveedor.deleteMany({ where: { id: { in: [supplierA.id, supplierB.id] } } });
    await prisma.producto.deleteMany({
      where: { id: { in: [productA.id, productB.id] } },
    });
    await prisma.subtipo.deleteMany({
      where: { id: { in: [subtypeA.id, subtypeB.id] } },
    });
    await prisma.tipo.deleteMany({
      where: { id: { in: [typeA.id, typeB.id] } },
    });
    await prisma.subfamilia.deleteMany({
      where: { id: { in: [subfamilyA.id, subfamilyB.id] } },
    });
    await prisma.familia.deleteMany({
      where: { id: { in: [familyA.id, familyB.id] } },
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [userA.id, userB.id, ...transientUserIds] } },
    });
    await prisma.empresa.deleteMany({
      where: { id: { in: [companyA.id, companyB.id] } },
    });
    await prisma.$disconnect();
  });

  it('TE-ID-006: server Business context overrides a client empresaId', async () => {
    const db = scopedPrisma.forCompany(companyA.id);

    const created = await db.usuario.create({
      data: {
        empresaId: companyB.id,
        nombre: 'B3 Override',
        email: `b3-override-${Date.now()}@example.test`,
      },
      select: { id: true, empresaId: true },
    });

    expect(created.empresaId).toBe(companyA.id);
    transientUserIds.push(created.id);
  });

  it('TE-ID-008: a Business A record is not returned through Business B context', async () => {
    const db = scopedPrisma.forCompany(companyB.id);

    const result = await db.usuario.findUnique({
      where: { id: userA.id },
      select: { id: true, empresaId: true },
    });

    expect(result).toBeNull();
  });

  it('TE-ID-009: update through another Business does not mutate the target record', async () => {
    const db = scopedPrisma.forCompany(companyB.id);

    await db.usuario.updateMany({
      where: { id: userA.id },
      data: { nombre: 'SHOULD-NOT-CHANGE' },
    });

    const persisted = await prisma.usuario.findUnique({
      where: { id: userA.id },
      select: { nombre: true, empresaId: true },
    });

    expect(persisted).toEqual({
      nombre: 'B3 User A',
      empresaId: companyA.id,
    });
  });

  it('TE-B3-001: nested relation identifiers cannot link Business A to a Business B product', async () => {
    const db = scopedPrisma.forCompany(companyA.id);

    await expect(
      db.venta.create({
        data: {
          usuarioId: userA.id,
          estado: 'CONFIRMADA',
          canal: 'b3-test',
          total: 20,
          ventaItems: {
            create: {
              productoId: productB.id,
              cantidad: 1,
              precioUnitario: 20,
            },
          },
        },
        include: { ventaItems: true },
      }),
    ).rejects.toThrow();

    const crossBusinessItems = await prisma.ventaItem.count({
      where: {
        productoId: productB.id,
        venta: { empresaId: companyA.id },
      },
    });

    expect(crossBusinessItems).toBe(0);
  });

  it('TE-B3-006: Business scope survives an interactive transaction', async () => {
    const db = scopedPrisma.forCompany(companyA.id);
    const email = `b3-tx-${Date.now()}@example.test`;

    await db.$transaction(async (tx) => {
      const created = await tx.usuario.create({
        data: {
          empresaId: companyB.id,
          nombre: 'B3 Transaction',
          email,
        },
        select: { id: true, empresaId: true },
      });

      expect(created.empresaId).toBe(companyA.id);

      const hidden = await tx.usuario.findUnique({
        where: { id: userB.id },
        select: { id: true, empresaId: true },
      });

      expect(hidden).toBeNull();
    });

    const persisted = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, empresaId: true },
    });

    expect(persisted?.empresaId).toBe(companyA.id);
    if (persisted) transientUserIds.push(persisted.id);
  });

  it('TE-B3-007: unsupported persistence operations fail closed', async () => {
    const db = scopedPrisma.forCompany(companyA.id);

    await expect(
      db.usuario.upsert({
        where: { id: userA.id },
        update: { nombre: 'SHOULD-NOT-CHANGE' },
        create: {
          empresaId: companyB.id,
          nombre: 'SHOULD-NOT-CREATE',
          email: `b3-upsert-${Date.now()}@example.test`,
        },
      }),
    ).rejects.toThrow(/no tiene manejo de aislamiento/);

    const persisted = await prisma.usuario.findUnique({
      where: { id: userA.id },
      select: { nombre: true, empresaId: true },
    });

    expect(persisted).toEqual({
      nombre: 'B3 User A',
      empresaId: companyA.id,
    });
  });

  describe('relation isolation — Venta → VentaItem → Producto', () => {
    const itemOf = (productId: string) => ({
      productoId: productId,
      cantidad: 1,
      precioUnitario: 10,
    });

    const saleOf = (channel: string, items: ReturnType<typeof itemOf>[]) => ({
      empresaId: companyA.id,
      usuarioId: userA.id,
      estado: 'CONFIRMADA' as const,
      canal: channel,
      total: 10,
      ventaItems: { create: items },
    });

    const countSales = (channel: string) => prisma.venta.count({ where: { canal: channel } });

    const countProductItems = (productId: string) =>
      prisma.ventaItem.count({ where: { productoId: productId } });

    it('RI-03: Business A + Product A persists the Venta and its VentaItem', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const channel = 'ri-positive';

      const created = await db.venta.create({
        data: saleOf(channel, [itemOf(productA.id)]),
        include: { ventaItems: true },
      });

      expect(created.empresaId).toBe(companyA.id);
      const persisted = await prisma.venta.findUnique({
        where: { id: created.id },
        include: { ventaItems: true },
      });
      expect(persisted?.empresaId).toBe(companyA.id);
      expect(persisted?.ventaItems).toHaveLength(1);
      expect(persisted?.ventaItems[0].productoId).toBe(productA.id);
    });

    it('RI-04/RI-05: Business A + Product B is rejected as not found and persists nothing', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const channel = 'ri-negative';

      await expect(
        db.venta.create({ data: saleOf(channel, [itemOf(productB.id)]) }),
      ).rejects.toMatchObject({
        code: 'P2025',
      });

      expect(await countSales(channel)).toBe(0);
      expect(await countProductItems(productB.id)).toBe(0);
    });

    it('RI-05: a cross-Business item among valid items rejects the whole Venta', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const channel = 'ri-mixed';

      await expect(
        db.venta.create({ data: saleOf(channel, [itemOf(productA.id), itemOf(productB.id)]) }),
      ).rejects.toMatchObject({ code: 'P2025' });

      expect(await countSales(channel)).toBe(0);
      expect(await prisma.ventaItem.count({ where: { venta: { canal: channel } } })).toBe(0);
    });

    it('RI-04: producto.connect to a Business B product is rejected', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const channel = 'ri-connect';

      await expect(
        db.venta.create({
          data: {
            empresaId: companyA.id,
            usuarioId: userA.id,
            canal: channel,
            total: 10,
            ventaItems: {
              create: {
                cantidad: 1,
                precioUnitario: 10,
                producto: { connect: { id: productB.id } },
              },
            },
          },
        }),
      ).rejects.toMatchObject({ code: 'P2025' });

      expect(await countSales(channel)).toBe(0);
      expect(await countProductItems(productB.id)).toBe(0);
    });

    it('RI-06: an unverifiable nested form on the relation fails closed', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const channel = 'ri-unsupported';

      await expect(
        db.venta.create({
          data: {
            empresaId: companyA.id,
            usuarioId: userA.id,
            canal: channel,
            total: 10,
            ventaItems: {
              create: {
                cantidad: 1,
                precioUnitario: 10,
                producto: {
                  connectOrCreate: {
                    where: { id: productB.id },
                    create: {
                      empresaId: companyB.id,
                      nombre: 'SHOULD-NOT-CREATE',
                      codigoInterno: `B3RI${Date.now()}`,
                      familiaId: familyB.id,
                      subfamiliaId: subfamilyB.id,
                      tipoId: typeB.id,
                      subtipoId: subtypeB.id,
                      unidadBase: 'UNIDAD',
                      costo: 1,
                      precioMinorista: 1,
                    },
                  },
                },
              },
            },
          },
        }),
      ).rejects.toThrow(/no tiene manejo de ownership definido/);

      expect(await countSales(channel)).toBe(0);
    });

    it('RI-02: a VentaItem cannot be created directly against a Business B product', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const sale = await prisma.venta.create({
        data: {
          empresaId: companyA.id,
          usuarioId: userA.id,
          canal: 'ri-direct-child',
          total: 10,
        },
        select: { id: true },
      });

      await expect(
        db.ventaItem.create({ data: { ventaId: sale.id, ...itemOf(productB.id) } }),
      ).rejects.toMatchObject({ code: 'P2025' });
      await expect(
        db.ventaItem.createMany({ data: [{ ventaId: sale.id, ...itemOf(productB.id) }] }),
      ).rejects.toMatchObject({ code: 'P2025' });
      expect(await prisma.ventaItem.count({ where: { ventaId: sale.id } })).toBe(0);

      await db.ventaItem.create({ data: { ventaId: sale.id, ...itemOf(productA.id) } });
      expect(await prisma.ventaItem.count({ where: { ventaId: sale.id } })).toBe(1);
    });

    it('RI-02: a nested create through Venta.update cannot link a Business B product', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const sale = await prisma.venta.create({
        data: {
          empresaId: companyA.id,
          usuarioId: userA.id,
          canal: 'ri-update',
          total: 10,
        },
        select: { id: true },
      });

      await expect(
        db.venta.update({
          where: { id: sale.id },
          data: { ventaItems: { create: itemOf(productB.id) } },
        }),
      ).rejects.toMatchObject({ code: 'P2025' });

      expect(await prisma.ventaItem.count({ where: { ventaId: sale.id } })).toBe(0);
    });

    it('RI-08: the relation check applies inside an interactive transaction', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const negativeChannel = 'ri-tx-negative';
      const positiveChannel = 'ri-tx-positive';

      await expect(
        db.$transaction(async (tx) => {
          await tx.venta.create({ data: saleOf(negativeChannel, [itemOf(productB.id)]) });
        }),
      ).rejects.toMatchObject({ code: 'P2025' });
      expect(await countSales(negativeChannel)).toBe(0);

      await db.$transaction(async (tx) => {
        await tx.venta.create({ data: saleOf(positiveChannel, [itemOf(productA.id)]) });
      });
      expect(await countSales(positiveChannel)).toBe(1);
      expect(await prisma.ventaItem.count({ where: { venta: { canal: positiveChannel } } })).toBe(
        1,
      );
    });
  });

  describe('relation isolation — Pedido → PedidoItem → Producto (Gate 6.1)', () => {
    const baseOrder = (originChannel: string) => ({
      empresaId: companyA.id,
      clienteId: customerA.id,
      usuarioId: null,
      estado: 'RECIBIDO' as const,
      canalOrigen: originChannel,
      total: 10,
      descuento: 0,
    });
    const itemOf = (productId: string) => ({
      productoId: productId,
      cantidad: 1,
      precioUnitario: 10,
      descuentoFidelizacionPorcentaje: null,
      reglaFidelizacionId: null,
    });
    const countOrders = (originChannel: string) =>
      prisma.pedido.count({ where: { canalOrigen: originChannel } });
    const countOrderItems = (orderId: string) =>
      prisma.pedidoItem.count({ where: { pedidoId: orderId } });

    it('P-01: Business A + Product A persists Pedido and PedidoItem', async () => {
      const db = scopedPrisma.forCompany(companyA.id),
        originChannel = 'g61-positive';
      const order = await db.pedido.create({
        data: { ...baseOrder(originChannel), pedidoItems: { create: [itemOf(productA.id)] } },
        include: { pedidoItems: true },
      });
      expect(order.empresaId).toBe(companyA.id);
      expect(order.pedidoItems).toHaveLength(1);
      expect(order.pedidoItems[0].productoId).toBe(productA.id);
      const persisted = await prisma.pedido.findUnique({
        where: { id: order.id },
        include: { pedidoItems: true },
      });
      expect(persisted?.empresaId).toBe(companyA.id);
      expect(persisted?.pedidoItems).toHaveLength(1);
      expect(persisted?.pedidoItems[0].productoId).toBe(productA.id);
    });

    it('P-02: nested Pedido.create cannot link Business A to Product B', async () => {
      const db = scopedPrisma.forCompany(companyA.id),
        originChannel = 'g61-negative-nested';
      await expect(
        db.pedido.create({
          data: { ...baseOrder(originChannel), pedidoItems: { create: [itemOf(productB.id)] } },
        }),
      ).rejects.toThrow();
      expect(await countOrders(originChannel)).toBe(0);
      expect(await prisma.pedidoItem.count({ where: { productoId: productB.id } })).toBe(0);
    });

    it('P-03: direct PedidoItem.create cannot link an A Pedido to Product B', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const order = await prisma.pedido.create({
        data: baseOrder('g61-direct-create'),
        select: { id: true },
      });
      await expect(
        db.pedidoItem.create({ data: { pedidoId: order.id, ...itemOf(productB.id) } }),
      ).rejects.toThrow();
      expect(await countOrderItems(order.id)).toBe(0);
    });

    it('P-04: direct PedidoItem.createMany cannot link an A Pedido to Product B', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const order = await prisma.pedido.create({
        data: baseOrder('g61-direct-create-many'),
        select: { id: true },
      });
      await expect(
        db.pedidoItem.createMany({ data: [{ pedidoId: order.id, ...itemOf(productB.id) }] }),
      ).rejects.toThrow();
      expect(await countOrderItems(order.id)).toBe(0);
    });

    it('P-05: one cross-Business item rejects the whole mixed nested Pedido', async () => {
      const db = scopedPrisma.forCompany(companyA.id),
        originChannel = 'g61-mixed';
      await expect(
        db.pedido.create({
          data: {
            ...baseOrder(originChannel),
            pedidoItems: { create: [itemOf(productA.id), itemOf(productB.id)] },
          },
        }),
      ).rejects.toThrow();
      expect(await countOrders(originChannel)).toBe(0);
      expect(
        await prisma.pedidoItem.count({ where: { pedido: { canalOrigen: originChannel } } }),
      ).toBe(0);
    });

    it('P-06: nested Pedido.update cannot add Product B to an A Pedido', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const order = await prisma.pedido.create({
        data: baseOrder('g61-update'),
        select: { id: true },
      });
      await expect(
        db.pedido.update({
          where: { id: order.id },
          data: { pedidoItems: { create: itemOf(productB.id) } },
        }),
      ).rejects.toThrow();
      expect(await countOrderItems(order.id)).toBe(0);
    });

    it('P-07: relation isolation holds inside an interactive transaction', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const negativeChannel = 'g61-tx-negative',
        positiveChannel = 'g61-tx-positive';
      await expect(
        db.$transaction(async (tx) => {
          await tx.pedido.create({
            data: { ...baseOrder(negativeChannel), pedidoItems: { create: [itemOf(productB.id)] } },
          });
        }),
      ).rejects.toThrow();
      expect(await countOrders(negativeChannel)).toBe(0);
      await db.$transaction(async (tx) => {
        await tx.pedido.create({
          data: { ...baseOrder(positiveChannel), pedidoItems: { create: [itemOf(productA.id)] } },
        });
      });
      expect(await countOrders(positiveChannel)).toBe(1);
      const persisted = await prisma.pedido.findFirst({
        where: { canalOrigen: positiveChannel },
        include: { pedidoItems: true },
      });
      expect(persisted?.pedidoItems).toHaveLength(1);
      expect(persisted?.pedidoItems[0].productoId).toBe(productA.id);
    });

    describe('relation isolation — Pedido → PedidoItem → ReglaFidelizacion (Gate 6.2)', () => {
      const baseOrder = (originChannel: string) => ({
        empresaId: companyA.id,
        clienteId: customerA.id,
        usuarioId: null,
        estado: 'RECIBIDO' as const,
        canalOrigen: originChannel,
        total: 10,
        descuento: 0,
      });
      const itemOf = (loyaltyRuleId: string | null) => ({
        productoId: productA.id,
        cantidad: 1,
        precioUnitario: 10,
        descuentoFidelizacionPorcentaje: loyaltyRuleId ? 10 : null,
        reglaFidelizacionId: loyaltyRuleId,
      });
      const countOrders = (originChannel: string) =>
        prisma.pedido.count({ where: { canalOrigen: originChannel } });
      const countOrderItems = (orderId: string) =>
        prisma.pedidoItem.count({ where: { pedidoId: orderId } });
      it('R-01: Business A + Rule A persists Pedido and PedidoItem', async () => {
        const db = scopedPrisma.forCompany(companyA.id),
          originChannel = 'g62-positive';
        const order = await db.pedido.create({
          data: { ...baseOrder(originChannel), pedidoItems: { create: [itemOf(ruleA.id)] } },
          include: { pedidoItems: true },
        });
        expect(order.empresaId).toBe(companyA.id);
        expect(order.pedidoItems).toHaveLength(1);
        expect(order.pedidoItems[0].reglaFidelizacionId).toBe(ruleA.id);
        const persisted = await prisma.pedido.findUnique({
          where: { id: order.id },
          include: { pedidoItems: true },
        });
        expect(persisted?.pedidoItems[0].reglaFidelizacionId).toBe(ruleA.id);
      });
      it('R-02: nested Pedido.create cannot link Business A to Rule B', async () => {
        const db = scopedPrisma.forCompany(companyA.id),
          originChannel = 'g62-negative-nested';
        await expect(
          db.pedido.create({
            data: { ...baseOrder(originChannel), pedidoItems: { create: [itemOf(ruleB.id)] } },
          }),
        ).rejects.toThrow();
        expect(await countOrders(originChannel)).toBe(0);
      });
      it('R-03: direct PedidoItem.create cannot link an A Pedido to Rule B', async () => {
        const db = scopedPrisma.forCompany(companyA.id);
        const order = await prisma.pedido.create({
          data: baseOrder('g62-direct-create'),
          select: { id: true },
        });
        await expect(
          db.pedidoItem.create({ data: { pedidoId: order.id, ...itemOf(ruleB.id) } }),
        ).rejects.toThrow();
        expect(await countOrderItems(order.id)).toBe(0);
      });
      it('R-04: direct PedidoItem.createMany cannot link an A Pedido to Rule B', async () => {
        const db = scopedPrisma.forCompany(companyA.id);
        const order = await prisma.pedido.create({
          data: baseOrder('g62-direct-create-many'),
          select: { id: true },
        });
        await expect(
          db.pedidoItem.createMany({ data: [{ pedidoId: order.id, ...itemOf(ruleB.id) }] }),
        ).rejects.toThrow();
        expect(await countOrderItems(order.id)).toBe(0);
      });
      it('R-05: one cross-Business rule rejects the whole mixed nested Pedido', async () => {
        const db = scopedPrisma.forCompany(companyA.id),
          originChannel = 'g62-mixed';
        await expect(
          db.pedido.create({
            data: {
              ...baseOrder(originChannel),
              pedidoItems: { create: [itemOf(ruleA.id), itemOf(ruleB.id)] },
            },
          }),
        ).rejects.toThrow();
        expect(await countOrders(originChannel)).toBe(0);
      });
      it('R-06: nested Pedido.update cannot add Rule B to an A Pedido', async () => {
        const db = scopedPrisma.forCompany(companyA.id);
        const order = await prisma.pedido.create({
          data: { ...baseOrder('g62-update'), pedidoItems: { create: [itemOf(ruleA.id)] } },
          select: { id: true },
        });
        await expect(
          db.pedido.update({
            where: { id: order.id },
            data: { pedidoItems: { create: itemOf(ruleB.id) } },
          }),
        ).rejects.toThrow();
        expect(await countOrderItems(order.id)).toBe(1);
      });
      it('R-07: null reglaFidelizacionId remains valid', async () => {
        const db = scopedPrisma.forCompany(companyA.id);
        const order = await db.pedido.create({
          data: { ...baseOrder('g62-null'), pedidoItems: { create: [itemOf(null)] } },
          include: { pedidoItems: true },
        });
        expect(order.pedidoItems[0].reglaFidelizacionId).toBeNull();
        expect(await countOrderItems(order.id)).toBe(1);
      });
      it('R-08: relation isolation applies inside an interactive transaction', async () => {
        const db = scopedPrisma.forCompany(companyA.id),
          negative = 'g62-tx-negative',
          positive = 'g62-tx-positive';
        await expect(
          db.$transaction(async (tx) => {
            await tx.pedido.create({
              data: { ...baseOrder(negative), pedidoItems: { create: [itemOf(ruleB.id)] } },
            });
          }),
        ).rejects.toThrow();
        expect(await countOrders(negative)).toBe(0);
        await db.$transaction(async (tx) => {
          await tx.pedido.create({
            data: { ...baseOrder(positive), pedidoItems: { create: [itemOf(ruleA.id)] } },
          });
        });
        expect(await countOrders(positive)).toBe(1);
      });
    });
  });

  describe('relation isolation — Compra → CompraItem → Producto (Gate 6.4)', () => {
    const basePurchase = (invoiceNumber: string) => ({
      empresaId: companyA.id,
      proveedorId: supplierA.id,
      usuarioId: userA.id,
      estado: 'BORRADOR' as const,
      total: 10,
      numeroFactura: invoiceNumber,
    });
    const itemOf = (productId: string) => ({
      productoId: productId,
      cantidadPedida: 1,
      cantidadRecibida: 0,
      costoUnitario: 10,
    });
    const countPurchases = (invoiceNumber: string) =>
      prisma.compra.count({ where: { numeroFactura: invoiceNumber } });

    it('C-01: Business A + Product A persists Compra and CompraItem', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const purchase = await db.compra.create({
        data: { ...basePurchase('g64-positive'), items: { create: [itemOf(productA.id)] } },
        include: { items: true },
      });
      expect(purchase.empresaId).toBe(companyA.id);
      expect(purchase.items).toHaveLength(1);
      expect(purchase.items[0].productoId).toBe(productA.id);
      const persisted = await prisma.compra.findUnique({
        where: { id: purchase.id },
        include: { items: true },
      });
      expect(persisted?.empresaId).toBe(companyA.id);
      expect(persisted?.items).toHaveLength(1);
      expect(persisted?.items[0].productoId).toBe(productA.id);
    });

    it('C-02: nested Compra.create cannot link Business A to Product B', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      await expect(
        db.compra.create({
          data: {
            ...basePurchase('g64-negative-nested'),
            items: { create: [itemOf(productB.id)] },
          },
        }),
      ).rejects.toThrow();
      expect(await countPurchases('g64-negative-nested')).toBe(0);
      expect(await prisma.compraItem.count({ where: { productoId: productB.id } })).toBe(0);
    });

    it('C-03: direct CompraItem.create and createMany cannot link an A Compra to Product B', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const purchase = await prisma.compra.create({
        data: basePurchase('g64-direct'),
        select: { id: true },
      });

      await expect(
        db.compraItem.create({ data: { compraId: purchase.id, ...itemOf(productB.id) } }),
      ).rejects.toThrow();
      await expect(
        db.compraItem.createMany({ data: [{ compraId: purchase.id, ...itemOf(productB.id) }] }),
      ).rejects.toThrow();

      expect(await prisma.compraItem.count({ where: { compraId: purchase.id } })).toBe(0);
    });

    it('C-05: one cross-Business item rejects the whole mixed nested Compra', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      await expect(
        db.compra.create({
          data: {
            ...basePurchase('g64-mixed'),
            items: { create: [itemOf(productA.id), itemOf(productB.id)] },
          },
        }),
      ).rejects.toThrow();
      expect(await countPurchases('g64-mixed')).toBe(0);
      expect(
        await prisma.compraItem.count({ where: { compra: { numeroFactura: 'g64-mixed' } } }),
      ).toBe(0);
    });

    it('C-06: relation isolation applies inside an interactive transaction', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      await expect(
        db.$transaction(async (tx) => {
          await tx.compra.create({
            data: { ...basePurchase('g64-tx-negative'), items: { create: [itemOf(productB.id)] } },
          });
        }),
      ).rejects.toThrow();
      expect(await countPurchases('g64-tx-negative')).toBe(0);

      await db.$transaction(async (tx) => {
        await tx.compra.create({
          data: { ...basePurchase('g64-tx-positive'), items: { create: [itemOf(productA.id)] } },
        });
      });
      expect(await countPurchases('g64-tx-positive')).toBe(1);
      const persisted = await prisma.compra.findFirst({
        where: { numeroFactura: 'g64-tx-positive' },
        include: { items: true },
      });
      expect(persisted?.items).toHaveLength(1);
      expect(persisted?.items[0].productoId).toBe(productA.id);
    });
  });

  describe('relation isolation — Venta → VentaItem → ReglaFidelizacion (Gate 6.3)', () => {
    const itemOf = (loyaltyRuleId: string | null) => ({
      productoId: productA.id,
      cantidad: 1,
      precioUnitario: 10,
      descuentoFidelizacionPorcentaje: loyaltyRuleId ? 10 : null,
      reglaFidelizacionId: loyaltyRuleId,
    });

    const baseSale = (channel: string) => ({
      empresaId: companyA.id,
      usuarioId: userA.id,
      estado: 'CONFIRMADA' as const,
      canal: channel,
      total: 10,
    });

    const countSales = (channel: string) => prisma.venta.count({ where: { canal: channel } });
    const countSaleItems = (saleId: string) =>
      prisma.ventaItem.count({ where: { ventaId: saleId } });

    it('V-01: Business A + Rule A persists Venta and VentaItem', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const channel = 'g63-positive';
      const sale = await db.venta.create({
        data: { ...baseSale(channel), ventaItems: { create: [itemOf(ruleA.id)] } },
        include: { ventaItems: true },
      });

      expect(sale.empresaId).toBe(companyA.id);
      expect(sale.ventaItems).toHaveLength(1);
      expect(sale.ventaItems[0].reglaFidelizacionId).toBe(ruleA.id);

      const persisted = await prisma.venta.findUnique({
        where: { id: sale.id },
        include: { ventaItems: true },
      });
      expect(persisted?.ventaItems[0].reglaFidelizacionId).toBe(ruleA.id);
    });

    it('V-02: nested Venta.create cannot link Business A to Rule B', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const channel = 'g63-negative-nested';

      await expect(
        db.venta.create({
          data: { ...baseSale(channel), ventaItems: { create: [itemOf(ruleB.id)] } },
        }),
      ).rejects.toThrow();

      expect(await countSales(channel)).toBe(0);
    });

    it('V-03: direct VentaItem.create cannot link an A Venta to Rule B', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const sale = await prisma.venta.create({
        data: baseSale('g63-direct-create'),
        select: { id: true },
      });

      await expect(
        db.ventaItem.create({
          data: { ventaId: sale.id, ...itemOf(ruleB.id) },
        }),
      ).rejects.toThrow();

      expect(await countSaleItems(sale.id)).toBe(0);
    });

    it('V-04: direct VentaItem.createMany cannot link an A Venta to Rule B', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const sale = await prisma.venta.create({
        data: baseSale('g63-direct-create-many'),
        select: { id: true },
      });

      await expect(
        db.ventaItem.createMany({
          data: [{ ventaId: sale.id, ...itemOf(ruleB.id) }],
        }),
      ).rejects.toThrow();

      expect(await countSaleItems(sale.id)).toBe(0);
    });

    it('V-05: one cross-Business rule rejects the whole mixed nested Venta', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const channel = 'g63-mixed';

      await expect(
        db.venta.create({
          data: {
            ...baseSale(channel),
            ventaItems: {
              create: [itemOf(ruleA.id), itemOf(ruleB.id)],
            },
          },
        }),
      ).rejects.toThrow();

      expect(await countSales(channel)).toBe(0);
    });

    it('V-06: nested Venta.update cannot add Rule B to an A Venta', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const sale = await prisma.venta.create({
        data: { ...baseSale('g63-update'), ventaItems: { create: [itemOf(ruleA.id)] } },
        select: { id: true },
      });

      await expect(
        db.venta.update({
          where: { id: sale.id },
          data: { ventaItems: { create: itemOf(ruleB.id) } },
        }),
      ).rejects.toThrow();

      expect(await countSaleItems(sale.id)).toBe(1);
    });

    it('V-07: null reglaFidelizacionId remains valid', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const sale = await db.venta.create({
        data: { ...baseSale('g63-null'), ventaItems: { create: [itemOf(null)] } },
        include: { ventaItems: true },
      });

      expect(sale.ventaItems[0].reglaFidelizacionId).toBeNull();
      expect(await countSaleItems(sale.id)).toBe(1);
    });

    it('V-08: relation isolation applies inside an interactive transaction', async () => {
      const db = scopedPrisma.forCompany(companyA.id);
      const negative = 'g63-tx-negative';
      const positive = 'g63-tx-positive';

      await expect(
        db.$transaction(async (tx) => {
          await tx.venta.create({
            data: { ...baseSale(negative), ventaItems: { create: [itemOf(ruleB.id)] } },
          });
        }),
      ).rejects.toThrow();

      expect(await countSales(negative)).toBe(0);

      await db.$transaction(async (tx) => {
        await tx.venta.create({
          data: { ...baseSale(positive), ventaItems: { create: [itemOf(ruleA.id)] } },
        });
      });

      expect(await countSales(positive)).toBe(1);
      expect(await prisma.ventaItem.count({ where: { venta: { canal: positive } } })).toBe(1);
    });
  });
});
