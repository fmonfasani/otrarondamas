import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 tenant isolation — execution candidates', () => {
  let prisma: PrismaService;
  let scopedPrisma: EmpresaScopedPrismaService;
  let empresaA: { id: string };
  let empresaB: { id: string };
  let usuarioA: { id: string };
  let usuarioB: { id: string };
  let productoA: { id: string };
  let productoB: { id: string };
  let clienteA: { id: string };
  let clienteB: { id: string };
  let proveedorA: { id: string };
  let proveedorB: { id: string };
  let reglaA: { id: string };
  let reglaB: { id: string };
  let familiaA: { id: string };
  let familiaB: { id: string };
  let subfamiliaA: { id: string };
  let subfamiliaB: { id: string };
  let tipoA: { id: string };
  let tipoB: { id: string };
  let subtipoA: { id: string };
  let subtipoB: { id: string };
  const transientUsuarioIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new EmpresaScopedPrismaService(prisma);

    const suffix = Date.now();

    empresaA = await prisma.empresa.create({
      data: { nombre: `B3 Exec A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    empresaB = await prisma.empresa.create({
      data: { nombre: `B3 Exec B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    familiaA = await prisma.familia.create({
      data: {
        empresaId: empresaA.id,
        nombre: `B3 Familia A ${suffix}`,
        prefijo: 'BFA',
      },
      select: { id: true },
    });
    subfamiliaA = await prisma.subfamilia.create({
      data: {
        empresaId: empresaA.id,
        familiaId: familiaA.id,
        nombre: `B3 Subfamilia A ${suffix}`,
        prefijo: 'BSA',
      },
      select: { id: true },
    });
    tipoA = await prisma.tipo.create({
      data: {
        empresaId: empresaA.id,
        subfamiliaId: subfamiliaA.id,
        nombre: `B3 Tipo A ${suffix}`,
        prefijo: 'BTA',
      },
      select: { id: true },
    });
    subtipoA = await prisma.subtipo.create({
      data: {
        empresaId: empresaA.id,
        tipoId: tipoA.id,
        nombre: `B3 Subtipo A ${suffix}`,
        prefijo: 'BXA',
      },
      select: { id: true },
    });

    familiaB = await prisma.familia.create({
      data: {
        empresaId: empresaB.id,
        nombre: `B3 Familia B ${suffix}`,
        prefijo: 'BFB',
      },
      select: { id: true },
    });
    subfamiliaB = await prisma.subfamilia.create({
      data: {
        empresaId: empresaB.id,
        familiaId: familiaB.id,
        nombre: `B3 Subfamilia B ${suffix}`,
        prefijo: 'BSB',
      },
      select: { id: true },
    });
    tipoB = await prisma.tipo.create({
      data: {
        empresaId: empresaB.id,
        subfamiliaId: subfamiliaB.id,
        nombre: `B3 Tipo B ${suffix}`,
        prefijo: 'BTB',
      },
      select: { id: true },
    });
    subtipoB = await prisma.subtipo.create({
      data: {
        empresaId: empresaB.id,
        tipoId: tipoB.id,
        nombre: `B3 Subtipo B ${suffix}`,
        prefijo: 'BXB',
      },
      select: { id: true },
    });

    usuarioA = await prisma.usuario.create({
      data: {
        empresaId: empresaA.id,
        nombre: 'B3 User A',
        email: `b3-user-a-${suffix}@example.test`,
      },
      select: { id: true },
    });
    usuarioB = await prisma.usuario.create({
      data: {
        empresaId: empresaB.id,
        nombre: 'B3 User B',
        email: `b3-user-b-${suffix}@example.test`,
      },
      select: { id: true },
    });

    productoA = await prisma.producto.create({
      data: {
        empresaId: empresaA.id,
        nombre: 'B3 Product A',
        codigoInterno: `B3PA${suffix}`,
        familiaId: familiaA.id,
        subfamiliaId: subfamiliaA.id,
        tipoId: tipoA.id,
        subtipoId: subtipoA.id,
        unidadBase: 'UNIDAD',
        costo: 5,
        precioMinorista: 10,
      },
      select: { id: true },
    });
    productoB = await prisma.producto.create({
      data: {
        empresaId: empresaB.id,
        nombre: 'B3 Product B',
        codigoInterno: `B3PB${suffix}`,
        familiaId: familiaB.id,
        subfamiliaId: subfamiliaB.id,
        tipoId: tipoB.id,
        subtipoId: subtipoB.id,
        unidadBase: 'UNIDAD',
        costo: 10,
        precioMinorista: 20,
      },
      select: { id: true },
    });

    clienteA = await prisma.cliente.create({
      data: { empresaId: empresaA.id, nombre: 'B3 Cliente A', email: `b3-cliente-a-${suffix}@example.test` },
      select: { id: true },
    });
    clienteB = await prisma.cliente.create({
      data: { empresaId: empresaB.id, nombre: 'B3 Cliente B', email: `b3-cliente-b-${suffix}@example.test` },
      select: { id: true },
    });

    proveedorA = await prisma.proveedor.create({ data: { empresaId: empresaA.id, nombre: `B3 Proveedor A ${suffix}` }, select: { id: true } });
    proveedorB = await prisma.proveedor.create({ data: { empresaId: empresaB.id, nombre: `B3 Proveedor B ${suffix}` }, select: { id: true } });

    reglaA = await prisma.reglaFidelizacion.create({ data: { empresaId: empresaA.id, nombre: 'B3 Regla A', nivelRequerido: 'VIP', descuentoPorcentaje: 10 }, select: { id: true } });
    reglaB = await prisma.reglaFidelizacion.create({ data: { empresaId: empresaB.id, nombre: 'B3 Regla B', nivelRequerido: 'VIP', descuentoPorcentaje: 20 }, select: { id: true } });
  });

  afterAll(async () => {
    if (!empresaA || !empresaB) {
      await prisma.$disconnect();
      return;
    }

    await prisma.pedidoItem.deleteMany({ where: { pedido: { empresaId: { in: [empresaA.id, empresaB.id] } } } });
    await prisma.pedido.deleteMany({ where: { empresaId: { in: [empresaA.id, empresaB.id] } } });
    await prisma.ventaItem.deleteMany({
      where: { venta: { empresaId: { in: [empresaA.id, empresaB.id] } } },
    });
    await prisma.venta.deleteMany({
      where: { empresaId: { in: [empresaA.id, empresaB.id] } },
    });
    await prisma.reglaFidelizacion.deleteMany({ where: { id: { in: [reglaA.id, reglaB.id] } } });
    await prisma.cliente.deleteMany({ where: { id: { in: [clienteA.id, clienteB.id] } } });
    await prisma.compraItem.deleteMany({ where: { compra: { empresaId: { in: [empresaA.id, empresaB.id] } } } });
    await prisma.compra.deleteMany({ where: { empresaId: { in: [empresaA.id, empresaB.id] } } });
    await prisma.proveedor.deleteMany({ where: { id: { in: [proveedorA.id, proveedorB.id] } } });
    await prisma.producto.deleteMany({
      where: { id: { in: [productoA.id, productoB.id] } },
    });
    await prisma.subtipo.deleteMany({
      where: { id: { in: [subtipoA.id, subtipoB.id] } },
    });
    await prisma.tipo.deleteMany({
      where: { id: { in: [tipoA.id, tipoB.id] } },
    });
    await prisma.subfamilia.deleteMany({
      where: { id: { in: [subfamiliaA.id, subfamiliaB.id] } },
    });
    await prisma.familia.deleteMany({
      where: { id: { in: [familiaA.id, familiaB.id] } },
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [usuarioA.id, usuarioB.id, ...transientUsuarioIds] } },
    });
    await prisma.empresa.deleteMany({
      where: { id: { in: [empresaA.id, empresaB.id] } },
    });
    await prisma.$disconnect();
  });

  it('TE-ID-006: server Business context overrides a client empresaId', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);

    const created = await db.usuario.create({
      data: {
        empresaId: empresaB.id,
        nombre: 'B3 Override',
        email: `b3-override-${Date.now()}@example.test`,
      },
      select: { id: true, empresaId: true },
    });

    expect(created.empresaId).toBe(empresaA.id);
    transientUsuarioIds.push(created.id);
  });

  it('TE-ID-008: a Business A record is not returned through Business B context', async () => {
    const db = scopedPrisma.forEmpresa(empresaB.id);

    const result = await db.usuario.findUnique({
      where: { id: usuarioA.id },
      select: { id: true, empresaId: true },
    });

    expect(result).toBeNull();
  });

  it('TE-ID-009: update through another Business does not mutate the target record', async () => {
    const db = scopedPrisma.forEmpresa(empresaB.id);

    await db.usuario.updateMany({
      where: { id: usuarioA.id },
      data: { nombre: 'SHOULD-NOT-CHANGE' },
    });

    const persisted = await prisma.usuario.findUnique({
      where: { id: usuarioA.id },
      select: { nombre: true, empresaId: true },
    });

    expect(persisted).toEqual({
      nombre: 'B3 User A',
      empresaId: empresaA.id,
    });
  });

  it('TE-B3-001: nested relation identifiers cannot link Business A to a Business B product', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);

    await expect(
      db.venta.create({
        data: {
          empresaId: empresaA.id,
          usuarioId: usuarioA.id,
          estado: 'CONFIRMADA',
          canal: 'b3-test',
          total: 20,
          ventaItems: {
            create: {
              productoId: productoB.id,
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
        productoId: productoB.id,
        venta: { empresaId: empresaA.id },
      },
    });

    expect(crossBusinessItems).toBe(0);
  });

  it('TE-B3-006: Business scope survives an interactive transaction', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const email = `b3-tx-${Date.now()}@example.test`;

    await db.$transaction(async (tx) => {
      const created = await tx.usuario.create({
        data: {
          empresaId: empresaB.id,
          nombre: 'B3 Transaction',
          email,
        },
        select: { id: true, empresaId: true },
      });

      expect(created.empresaId).toBe(empresaA.id);

      const hidden = await tx.usuario.findUnique({
        where: { id: usuarioB.id },
        select: { id: true, empresaId: true },
      });

      expect(hidden).toBeNull();
    });

    const persisted = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, empresaId: true },
    });

    expect(persisted?.empresaId).toBe(empresaA.id);
    if (persisted) transientUsuarioIds.push(persisted.id);
  });

  it('TE-B3-007: unsupported persistence operations fail closed', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);

    await expect(
      db.usuario.upsert({
        where: { id: usuarioA.id },
        update: { nombre: 'SHOULD-NOT-CHANGE' },
        create: {
          empresaId: empresaB.id,
          nombre: 'SHOULD-NOT-CREATE',
          email: `b3-upsert-${Date.now()}@example.test`,
        },
      }),
    ).rejects.toThrow(/no tiene manejo de aislamiento/);

    const persisted = await prisma.usuario.findUnique({
      where: { id: usuarioA.id },
      select: { nombre: true, empresaId: true },
    });

    expect(persisted).toEqual({
      nombre: 'B3 User A',
      empresaId: empresaA.id,
    });
  });

  describe('relation isolation — Venta → VentaItem → Producto', () => {
    const itemDe = (productoId: string) => ({
      productoId,
      cantidad: 1,
      precioUnitario: 10,
    });

    const ventaDe = (canal: string, items: ReturnType<typeof itemDe>[]) => ({
      empresaId: empresaA.id,
      usuarioId: usuarioA.id,
      estado: 'CONFIRMADA' as const,
      canal,
      total: 10,
      ventaItems: { create: items },
    });

    const contarVentas = (canal: string) => prisma.venta.count({ where: { canal } });

    const contarItemsDeProducto = (productoId: string) =>
      prisma.ventaItem.count({ where: { productoId } });

    it('RI-03: Business A + Product A persists the Venta and its VentaItem', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const canal = 'ri-positive';

      const creada = await db.venta.create({
        data: ventaDe(canal, [itemDe(productoA.id)]),
        include: { ventaItems: true },
      });

      expect(creada.empresaId).toBe(empresaA.id);
      const persisted = await prisma.venta.findUnique({
        where: { id: creada.id },
        include: { ventaItems: true },
      });
      expect(persisted?.empresaId).toBe(empresaA.id);
      expect(persisted?.ventaItems).toHaveLength(1);
      expect(persisted?.ventaItems[0].productoId).toBe(productoA.id);
    });

    it('RI-04/RI-05: Business A + Product B is rejected as not found and persists nothing', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const canal = 'ri-negative';

      await expect(
        db.venta.create({ data: ventaDe(canal, [itemDe(productoB.id)]) }),
      ).rejects.toMatchObject({
        code: 'P2025',
      });

      expect(await contarVentas(canal)).toBe(0);
      expect(await contarItemsDeProducto(productoB.id)).toBe(0);
    });

    it('RI-05: a cross-Business item among valid items rejects the whole Venta', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const canal = 'ri-mixed';

      await expect(
        db.venta.create({ data: ventaDe(canal, [itemDe(productoA.id), itemDe(productoB.id)]) }),
      ).rejects.toMatchObject({ code: 'P2025' });

      expect(await contarVentas(canal)).toBe(0);
      expect(await prisma.ventaItem.count({ where: { venta: { canal } } })).toBe(0);
    });

    it('RI-04: producto.connect to a Business B product is rejected', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const canal = 'ri-connect';

      await expect(
        db.venta.create({
          data: {
            empresaId: empresaA.id,
            usuarioId: usuarioA.id,
            canal,
            total: 10,
            ventaItems: {
              create: {
                cantidad: 1,
                precioUnitario: 10,
                producto: { connect: { id: productoB.id } },
              },
            },
          },
        }),
      ).rejects.toMatchObject({ code: 'P2025' });

      expect(await contarVentas(canal)).toBe(0);
      expect(await contarItemsDeProducto(productoB.id)).toBe(0);
    });

    it('RI-06: an unverifiable nested form on the relation fails closed', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const canal = 'ri-unsupported';

      await expect(
        db.venta.create({
          data: {
            empresaId: empresaA.id,
            usuarioId: usuarioA.id,
            canal,
            total: 10,
            ventaItems: {
              create: {
                cantidad: 1,
                precioUnitario: 10,
                producto: {
                  connectOrCreate: {
                    where: { id: productoB.id },
                    create: {
                      empresaId: empresaB.id,
                      nombre: 'SHOULD-NOT-CREATE',
                      codigoInterno: `B3RI${Date.now()}`,
                      familiaId: familiaB.id,
                      subfamiliaId: subfamiliaB.id,
                      tipoId: tipoB.id,
                      subtipoId: subtipoB.id,
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

      expect(await contarVentas(canal)).toBe(0);
    });

    it('RI-02: a VentaItem cannot be created directly against a Business B product', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const venta = await prisma.venta.create({
        data: {
          empresaId: empresaA.id,
          usuarioId: usuarioA.id,
          canal: 'ri-direct-child',
          total: 10,
        },
        select: { id: true },
      });

      await expect(
        db.ventaItem.create({ data: { ventaId: venta.id, ...itemDe(productoB.id) } }),
      ).rejects.toMatchObject({ code: 'P2025' });
      await expect(
        db.ventaItem.createMany({ data: [{ ventaId: venta.id, ...itemDe(productoB.id) }] }),
      ).rejects.toMatchObject({ code: 'P2025' });
      expect(await prisma.ventaItem.count({ where: { ventaId: venta.id } })).toBe(0);

      await db.ventaItem.create({ data: { ventaId: venta.id, ...itemDe(productoA.id) } });
      expect(await prisma.ventaItem.count({ where: { ventaId: venta.id } })).toBe(1);
    });

    it('RI-02: a nested create through Venta.update cannot link a Business B product', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const venta = await prisma.venta.create({
        data: {
          empresaId: empresaA.id,
          usuarioId: usuarioA.id,
          canal: 'ri-update',
          total: 10,
        },
        select: { id: true },
      });

      await expect(
        db.venta.update({
          where: { id: venta.id },
          data: { ventaItems: { create: itemDe(productoB.id) } },
        }),
      ).rejects.toMatchObject({ code: 'P2025' });

      expect(await prisma.ventaItem.count({ where: { ventaId: venta.id } })).toBe(0);
    });

    it('RI-08: the relation check applies inside an interactive transaction', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const canalNegativo = 'ri-tx-negative';
      const canalPositivo = 'ri-tx-positive';

      await expect(
        db.$transaction(async (tx) => {
          await tx.venta.create({ data: ventaDe(canalNegativo, [itemDe(productoB.id)]) });
        }),
      ).rejects.toMatchObject({ code: 'P2025' });
      expect(await contarVentas(canalNegativo)).toBe(0);

      await db.$transaction(async (tx) => {
        await tx.venta.create({ data: ventaDe(canalPositivo, [itemDe(productoA.id)]) });
      });
      expect(await contarVentas(canalPositivo)).toBe(1);
      expect(await prisma.ventaItem.count({ where: { venta: { canal: canalPositivo } } })).toBe(1);
    });
  });

  describe('relation isolation — Pedido → PedidoItem → Producto (Gate 6.1)', () => {
    const pedidoBase = (canalOrigen: string) => ({
      empresaId: empresaA.id, clienteId: clienteA.id, usuarioId: null,
      estado: 'RECIBIDO' as const, canalOrigen, total: 10, descuento: 0,
    });
    const itemDe = (productoId: string) => ({
      productoId, cantidad: 1, precioUnitario: 10,
      descuentoFidelizacionPorcentaje: null, reglaFidelizacionId: null,
    });
    const contarPedidos = (canalOrigen: string) => prisma.pedido.count({ where: { canalOrigen } });
    const contarItemsDePedido = (pedidoId: string) => prisma.pedidoItem.count({ where: { pedidoId } });

    it('P-01: Business A + Product A persists Pedido and PedidoItem', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id), canalOrigen = 'g61-positive';
      const pedido = await db.pedido.create({ data: { ...pedidoBase(canalOrigen), pedidoItems: { create: [itemDe(productoA.id)] } }, include: { pedidoItems: true } });
      expect(pedido.empresaId).toBe(empresaA.id);
      expect(pedido.pedidoItems).toHaveLength(1);
      expect(pedido.pedidoItems[0].productoId).toBe(productoA.id);
      const persisted = await prisma.pedido.findUnique({ where: { id: pedido.id }, include: { pedidoItems: true } });
      expect(persisted?.empresaId).toBe(empresaA.id);
      expect(persisted?.pedidoItems).toHaveLength(1);
      expect(persisted?.pedidoItems[0].productoId).toBe(productoA.id);
    });

    it('P-02: nested Pedido.create cannot link Business A to Product B', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id), canalOrigen = 'g61-negative-nested';
      await expect(db.pedido.create({ data: { ...pedidoBase(canalOrigen), pedidoItems: { create: [itemDe(productoB.id)] } } })).rejects.toThrow();
      expect(await contarPedidos(canalOrigen)).toBe(0);
      expect(await prisma.pedidoItem.count({ where: { productoId: productoB.id } })).toBe(0);
    });

    it('P-03: direct PedidoItem.create cannot link an A Pedido to Product B', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const pedido = await prisma.pedido.create({ data: pedidoBase('g61-direct-create'), select: { id: true } });
      await expect(db.pedidoItem.create({ data: { pedidoId: pedido.id, ...itemDe(productoB.id) } })).rejects.toThrow();
      expect(await contarItemsDePedido(pedido.id)).toBe(0);
    });

    it('P-04: direct PedidoItem.createMany cannot link an A Pedido to Product B', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const pedido = await prisma.pedido.create({ data: pedidoBase('g61-direct-create-many'), select: { id: true } });
      await expect(db.pedidoItem.createMany({ data: [{ pedidoId: pedido.id, ...itemDe(productoB.id) }] })).rejects.toThrow();
      expect(await contarItemsDePedido(pedido.id)).toBe(0);
    });

    it('P-05: one cross-Business item rejects the whole mixed nested Pedido', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id), canalOrigen = 'g61-mixed';
      await expect(db.pedido.create({ data: { ...pedidoBase(canalOrigen), pedidoItems: { create: [itemDe(productoA.id), itemDe(productoB.id)] } } })).rejects.toThrow();
      expect(await contarPedidos(canalOrigen)).toBe(0);
      expect(await prisma.pedidoItem.count({ where: { pedido: { canalOrigen } } })).toBe(0);
    });

    it('P-06: nested Pedido.update cannot add Product B to an A Pedido', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const pedido = await prisma.pedido.create({ data: pedidoBase('g61-update'), select: { id: true } });
      await expect(db.pedido.update({ where: { id: pedido.id }, data: { pedidoItems: { create: itemDe(productoB.id) } } })).rejects.toThrow();
      expect(await contarItemsDePedido(pedido.id)).toBe(0);
    });

    it('P-07: relation isolation holds inside an interactive transaction', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const canalNegativo = 'g61-tx-negative', canalPositivo = 'g61-tx-positive';
      await expect(db.$transaction(async (tx) => {
        await tx.pedido.create({ data: { ...pedidoBase(canalNegativo), pedidoItems: { create: [itemDe(productoB.id)] } } });
      })).rejects.toThrow();
      expect(await contarPedidos(canalNegativo)).toBe(0);
      await db.$transaction(async (tx) => {
        await tx.pedido.create({ data: { ...pedidoBase(canalPositivo), pedidoItems: { create: [itemDe(productoA.id)] } } });
      });
      expect(await contarPedidos(canalPositivo)).toBe(1);
      const persisted = await prisma.pedido.findFirst({ where: { canalOrigen: canalPositivo }, include: { pedidoItems: true } });
      expect(persisted?.pedidoItems).toHaveLength(1);
      expect(persisted?.pedidoItems[0].productoId).toBe(productoA.id);
    });

  describe('relation isolation — Pedido → PedidoItem → ReglaFidelizacion (Gate 6.2)', () => {
    const pedidoBase = (canalOrigen: string) => ({ empresaId: empresaA.id, clienteId: clienteA.id, usuarioId: null, estado: 'RECIBIDO' as const, canalOrigen, total: 10, descuento: 0 });
    const itemDe = (reglaFidelizacionId: string | null) => ({ productoId: productoA.id, cantidad: 1, precioUnitario: 10, descuentoFidelizacionPorcentaje: reglaFidelizacionId ? 10 : null, reglaFidelizacionId });
    const contarPedidos = (canalOrigen: string) => prisma.pedido.count({ where: { canalOrigen } });
    const contarItemsDePedido = (pedidoId: string) => prisma.pedidoItem.count({ where: { pedidoId } });
    it('R-01: Business A + Rule A persists Pedido and PedidoItem', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id), canalOrigen = 'g62-positive';
      const pedido = await db.pedido.create({ data: { ...pedidoBase(canalOrigen), pedidoItems: { create: [itemDe(reglaA.id)] } }, include: { pedidoItems: true } });
      expect(pedido.empresaId).toBe(empresaA.id); expect(pedido.pedidoItems).toHaveLength(1); expect(pedido.pedidoItems[0].reglaFidelizacionId).toBe(reglaA.id);
      const persisted = await prisma.pedido.findUnique({ where: { id: pedido.id }, include: { pedidoItems: true } });
      expect(persisted?.pedidoItems[0].reglaFidelizacionId).toBe(reglaA.id);
    });
    it('R-02: nested Pedido.create cannot link Business A to Rule B', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id), canalOrigen = 'g62-negative-nested';
      await expect(db.pedido.create({ data: { ...pedidoBase(canalOrigen), pedidoItems: { create: [itemDe(reglaB.id)] } } })).rejects.toThrow();
      expect(await contarPedidos(canalOrigen)).toBe(0);
    });
    it('R-03: direct PedidoItem.create cannot link an A Pedido to Rule B', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id); const pedido = await prisma.pedido.create({ data: pedidoBase('g62-direct-create'), select: { id: true } });
      await expect(db.pedidoItem.create({ data: { pedidoId: pedido.id, ...itemDe(reglaB.id) } })).rejects.toThrow();
      expect(await contarItemsDePedido(pedido.id)).toBe(0);
    });
    it('R-04: direct PedidoItem.createMany cannot link an A Pedido to Rule B', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id); const pedido = await prisma.pedido.create({ data: pedidoBase('g62-direct-create-many'), select: { id: true } });
      await expect(db.pedidoItem.createMany({ data: [{ pedidoId: pedido.id, ...itemDe(reglaB.id) }] })).rejects.toThrow();
      expect(await contarItemsDePedido(pedido.id)).toBe(0);
    });
    it('R-05: one cross-Business rule rejects the whole mixed nested Pedido', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id), canalOrigen = 'g62-mixed';
      await expect(db.pedido.create({ data: { ...pedidoBase(canalOrigen), pedidoItems: { create: [itemDe(reglaA.id), itemDe(reglaB.id)] } } })).rejects.toThrow();
      expect(await contarPedidos(canalOrigen)).toBe(0);
    });
    it('R-06: nested Pedido.update cannot add Rule B to an A Pedido', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id); const pedido = await prisma.pedido.create({ data: { ...pedidoBase('g62-update'), pedidoItems: { create: [itemDe(reglaA.id)] } }, select: { id: true } });
      await expect(db.pedido.update({ where: { id: pedido.id }, data: { pedidoItems: { create: itemDe(reglaB.id) } } })).rejects.toThrow();
      expect(await contarItemsDePedido(pedido.id)).toBe(1);
    });
    it('R-07: null reglaFidelizacionId remains valid', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id); const pedido = await db.pedido.create({ data: { ...pedidoBase('g62-null'), pedidoItems: { create: [itemDe(null)] } }, include: { pedidoItems: true } });
      expect(pedido.pedidoItems[0].reglaFidelizacionId).toBeNull(); expect(await contarItemsDePedido(pedido.id)).toBe(1);
    });
    it('R-08: relation isolation applies inside an interactive transaction', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id), negative = 'g62-tx-negative', positive = 'g62-tx-positive';
      await expect(db.$transaction(async (tx) => { await tx.pedido.create({ data: { ...pedidoBase(negative), pedidoItems: { create: [itemDe(reglaB.id)] } } }); })).rejects.toThrow();
      expect(await contarPedidos(negative)).toBe(0);
      await db.$transaction(async (tx) => { await tx.pedido.create({ data: { ...pedidoBase(positive), pedidoItems: { create: [itemDe(reglaA.id)] } } }); });
      expect(await contarPedidos(positive)).toBe(1);
    });
  });
  });


  describe('relation isolation — Compra → CompraItem → Producto (Gate 6.4)', () => {
    const compraBase = (numeroFactura: string) => ({
      empresaId: empresaA.id,
      proveedorId: proveedorA.id,
      usuarioId: usuarioA.id,
      estado: 'BORRADOR' as const,
      total: 10,
      numeroFactura,
    });
    const itemDe = (productoId: string) => ({
      productoId,
      cantidadPedida: 1,
      cantidadRecibida: 0,
      costoUnitario: 10,
    });
    const contarCompras = (numeroFactura: string) =>
      prisma.compra.count({ where: { numeroFactura } });

    it('C-01: Business A + Product A persists Compra and CompraItem', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const compra = await db.compra.create({
        data: { ...compraBase('g64-positive'), items: { create: [itemDe(productoA.id)] } },
        include: { items: true },
      });
      expect(compra.empresaId).toBe(empresaA.id);
      expect(compra.items).toHaveLength(1);
      expect(compra.items[0].productoId).toBe(productoA.id);
      const persisted = await prisma.compra.findUnique({ where: { id: compra.id }, include: { items: true } });
      expect(persisted?.empresaId).toBe(empresaA.id);
      expect(persisted?.items).toHaveLength(1);
      expect(persisted?.items[0].productoId).toBe(productoA.id);
    });

    it('C-02: nested Compra.create cannot link Business A to Product B', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      await expect(
        db.compra.create({
          data: { ...compraBase('g64-negative-nested'), items: { create: [itemDe(productoB.id)] } },
        }),
      ).rejects.toThrow();
      expect(await contarCompras('g64-negative-nested')).toBe(0);
      expect(await prisma.compraItem.count({ where: { productoId: productoB.id } })).toBe(0);
    });

    it('C-03: direct CompraItem.create and createMany cannot link an A Compra to Product B', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const compra = await prisma.compra.create({ data: compraBase('g64-direct'), select: { id: true } });

      await expect(
        db.compraItem.create({ data: { compraId: compra.id, ...itemDe(productoB.id) } }),
      ).rejects.toThrow();
      await expect(
        db.compraItem.createMany({ data: [{ compraId: compra.id, ...itemDe(productoB.id) }] }),
      ).rejects.toThrow();

      expect(await prisma.compraItem.count({ where: { compraId: compra.id } })).toBe(0);
    });

    it('C-05: one cross-Business item rejects the whole mixed nested Compra', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      await expect(
        db.compra.create({
          data: {
            ...compraBase('g64-mixed'),
            items: { create: [itemDe(productoA.id), itemDe(productoB.id)] },
          },
        }),
      ).rejects.toThrow();
      expect(await contarCompras('g64-mixed')).toBe(0);
      expect(await prisma.compraItem.count({ where: { compra: { numeroFactura: 'g64-mixed' } } })).toBe(0);
    });

    it('C-06: relation isolation applies inside an interactive transaction', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      await expect(
        db.$transaction(async (tx) => {
          await tx.compra.create({
            data: { ...compraBase('g64-tx-negative'), items: { create: [itemDe(productoB.id)] } },
          });
        }),
      ).rejects.toThrow();
      expect(await contarCompras('g64-tx-negative')).toBe(0);

      await db.$transaction(async (tx) => {
        await tx.compra.create({
          data: { ...compraBase('g64-tx-positive'), items: { create: [itemDe(productoA.id)] } },
        });
      });
      expect(await contarCompras('g64-tx-positive')).toBe(1);
      const persisted = await prisma.compra.findFirst({
        where: { numeroFactura: 'g64-tx-positive' },
        include: { items: true },
      });
      expect(persisted?.items).toHaveLength(1);
      expect(persisted?.items[0].productoId).toBe(productoA.id);
    });
  });

  describe('relation isolation — Venta → VentaItem → ReglaFidelizacion (Gate 6.3)', () => {
    const itemDe = (reglaFidelizacionId: string | null) => ({
      productoId: productoA.id,
      cantidad: 1,
      precioUnitario: 10,
      descuentoFidelizacionPorcentaje: reglaFidelizacionId ? 10 : null,
      reglaFidelizacionId,
    });

    const ventaBase = (canal: string) => ({
      empresaId: empresaA.id,
      usuarioId: usuarioA.id,
      estado: 'CONFIRMADA' as const,
      canal,
      total: 10,
    });

    const contarVentas = (canal: string) => prisma.venta.count({ where: { canal } });
    const contarItemsDeVenta = (ventaId: string) => prisma.ventaItem.count({ where: { ventaId } });

    it('V-01: Business A + Rule A persists Venta and VentaItem', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const canal = 'g63-positive';
      const venta = await db.venta.create({
        data: { ...ventaBase(canal), ventaItems: { create: [itemDe(reglaA.id)] } },
        include: { ventaItems: true },
      });

      expect(venta.empresaId).toBe(empresaA.id);
      expect(venta.ventaItems).toHaveLength(1);
      expect(venta.ventaItems[0].reglaFidelizacionId).toBe(reglaA.id);

      const persisted = await prisma.venta.findUnique({
        where: { id: venta.id },
        include: { ventaItems: true },
      });
      expect(persisted?.ventaItems[0].reglaFidelizacionId).toBe(reglaA.id);
    });

    it('V-02: nested Venta.create cannot link Business A to Rule B', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const canal = 'g63-negative-nested';

      await expect(
        db.venta.create({
          data: { ...ventaBase(canal), ventaItems: { create: [itemDe(reglaB.id)] } },
        }),
      ).rejects.toThrow();

      expect(await contarVentas(canal)).toBe(0);
    });

    it('V-03: direct VentaItem.create cannot link an A Venta to Rule B', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const venta = await prisma.venta.create({
        data: ventaBase('g63-direct-create'),
        select: { id: true },
      });

      await expect(
        db.ventaItem.create({
          data: { ventaId: venta.id, ...itemDe(reglaB.id) },
        }),
      ).rejects.toThrow();

      expect(await contarItemsDeVenta(venta.id)).toBe(0);
    });

    it('V-04: direct VentaItem.createMany cannot link an A Venta to Rule B', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const venta = await prisma.venta.create({
        data: ventaBase('g63-direct-create-many'),
        select: { id: true },
      });

      await expect(
        db.ventaItem.createMany({
          data: [{ ventaId: venta.id, ...itemDe(reglaB.id) }],
        }),
      ).rejects.toThrow();

      expect(await contarItemsDeVenta(venta.id)).toBe(0);
    });

    it('V-05: one cross-Business rule rejects the whole mixed nested Venta', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const canal = 'g63-mixed';

      await expect(
        db.venta.create({
          data: {
            ...ventaBase(canal),
            ventaItems: {
              create: [itemDe(reglaA.id), itemDe(reglaB.id)],
            },
          },
        }),
      ).rejects.toThrow();

      expect(await contarVentas(canal)).toBe(0);
    });

    it('V-06: nested Venta.update cannot add Rule B to an A Venta', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const venta = await prisma.venta.create({
        data: { ...ventaBase('g63-update'), ventaItems: { create: [itemDe(reglaA.id)] } },
        select: { id: true },
      });

      await expect(
        db.venta.update({
          where: { id: venta.id },
          data: { ventaItems: { create: itemDe(reglaB.id) } },
        }),
      ).rejects.toThrow();

      expect(await contarItemsDeVenta(venta.id)).toBe(1);
    });

    it('V-07: null reglaFidelizacionId remains valid', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const venta = await db.venta.create({
        data: { ...ventaBase('g63-null'), ventaItems: { create: [itemDe(null)] } },
        include: { ventaItems: true },
      });

      expect(venta.ventaItems[0].reglaFidelizacionId).toBeNull();
      expect(await contarItemsDeVenta(venta.id)).toBe(1);
    });

    it('V-08: relation isolation applies inside an interactive transaction', async () => {
      const db = scopedPrisma.forEmpresa(empresaA.id);
      const negative = 'g63-tx-negative';
      const positive = 'g63-tx-positive';

      await expect(
        db.$transaction(async (tx) => {
          await tx.venta.create({
            data: { ...ventaBase(negative), ventaItems: { create: [itemDe(reglaB.id)] } },
          });
        }),
      ).rejects.toThrow();

      expect(await contarVentas(negative)).toBe(0);

      await db.$transaction(async (tx) => {
        await tx.venta.create({
          data: { ...ventaBase(positive), ventaItems: { create: [itemDe(reglaA.id)] } },
        });
      });

      expect(await contarVentas(positive)).toBe(1);
      expect(await prisma.ventaItem.count({ where: { venta: { canal: positive } } })).toBe(1);
    });
  });

});
