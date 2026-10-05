import { ComprasService } from '../../src/compras/compras.service';
import { InventarioService } from '../../src/inventario/inventario.service';
import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('B3 relation isolation — MovimientoStock.producto ownership candidate', () => {
  let prisma: PrismaService;
  let scopedPrisma: EmpresaScopedPrismaService;
  let compras: ComprasService;
  let inventario: InventarioService;
  let suffix: number;
  let secuencia = 0;

  let empresaA: { id: string };
  let empresaB: { id: string };
  let productoA: { id: string };
  let productoB: { id: string };
  let proveedorA: { id: string };
  let usuarioA: { id: string };
  let compraA: { id: string };
  let compraItemA: { id: string };
  let loteA: { id: string };
  let loteD: { id: string };

  // Cada test usa su propio motivo: ningún conteo depende de filas de otro test.
  const motivoUnico = (id: string) => `B3MS-${id}-${suffix}-${++secuencia}`;
  const codigoUnico = (id: string) => `B3MS-${id}-${suffix}-${++secuencia}`;

  const codigoDeRechazo = async (operacion: Promise<unknown>): Promise<string> => {
    try {
      await operacion;
      return 'RESOLVED';
    } catch (error) {
      return (error as { code?: string }).code ?? 'NO_CODE';
    }
  };

  const movimientoData = (empresaId: string, productoId: string, motivo: string) => ({
    empresaId,
    productoId,
    tipoMovimiento: 'Ajuste',
    cantidad: 1,
    motivo,
  });

  const crearJerarquia = async (etiqueta: 'A' | 'B', s: number, prefijo: string) => {
    const empresa = await prisma.empresa.create({
      data: { nombre: `B3 MS ${etiqueta} ${s}`, configuracion: {} },
      select: { id: true },
    });
    const familia = await prisma.familia.create({
      data: { empresaId: empresa.id, nombre: `B3 MS Familia ${etiqueta} ${s}`, prefijo: `${prefijo}F` },
      select: { id: true },
    });
    const subfamilia = await prisma.subfamilia.create({
      data: {
        empresaId: empresa.id,
        familiaId: familia.id,
        nombre: `B3 MS Sub ${etiqueta} ${s}`,
        prefijo: `${prefijo}S`,
      },
      select: { id: true },
    });
    const tipo = await prisma.tipo.create({
      data: {
        empresaId: empresa.id,
        subfamiliaId: subfamilia.id,
        nombre: `B3 MS Tipo ${etiqueta} ${s}`,
        prefijo: `${prefijo}T`,
      },
      select: { id: true },
    });
    const subtipo = await prisma.subtipo.create({
      data: {
        empresaId: empresa.id,
        tipoId: tipo.id,
        nombre: `B3 MS Subtipo ${etiqueta} ${s}`,
        prefijo: `${prefijo}X`,
      },
      select: { id: true },
    });
    return { empresa, familia, subfamilia, tipo, subtipo };
  };

  const futuro = () => new Date(Date.now() + 365 * 24 * 3600 * 1000);

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new EmpresaScopedPrismaService(prisma);
    compras = new ComprasService(scopedPrisma);
    inventario = new InventarioService(scopedPrisma);
    suffix = Date.now();

    const jerA = await crearJerarquia('A', suffix, 'Q');
    const jerB = await crearJerarquia('B', suffix, 'W');
    empresaA = jerA.empresa;
    empresaB = jerB.empresa;

    productoA = await prisma.producto.create({
      data: {
        empresaId: empresaA.id,
        nombre: `B3 MS Producto A ${suffix}`,
        codigoInterno: `B3MSPA${suffix}`,
        familiaId: jerA.familia.id,
        subfamiliaId: jerA.subfamilia.id,
        tipoId: jerA.tipo.id,
        subtipoId: jerA.subtipo.id,
        unidadBase: 'UNIDAD',
        costo: 5,
        precioMinorista: 10,
      },
      select: { id: true },
    });
    productoB = await prisma.producto.create({
      data: {
        empresaId: empresaB.id,
        nombre: `B3 MS Producto B ${suffix}`,
        codigoInterno: `B3MSPB${suffix}`,
        familiaId: jerB.familia.id,
        subfamiliaId: jerB.subfamilia.id,
        tipoId: jerB.tipo.id,
        subtipoId: jerB.subtipo.id,
        unidadBase: 'UNIDAD',
        costo: 10,
        precioMinorista: 20,
      },
      select: { id: true },
    });

    proveedorA = await prisma.proveedor.create({
      data: { empresaId: empresaA.id, nombre: `B3 MS Proveedor A ${suffix}` },
      select: { id: true },
    });
    usuarioA = await prisma.usuario.create({
      data: {
        empresaId: empresaA.id,
        nombre: 'B3 MS User A',
        email: `b3-ms-user-a-${suffix}@example.test`,
      },
      select: { id: true },
    });

    const compra = await prisma.compra.create({
      data: {
        empresaId: empresaA.id,
        proveedorId: proveedorA.id,
        usuarioId: usuarioA.id,
        estado: 'EMITIDA',
        total: 100,
        totalPagado: 0,
        saldo: 100,
        items: {
          create: [
            {
              productoId: productoA.id,
              cantidadPedida: 10,
              cantidadRecibida: 0,
              costoUnitario: 5,
            },
          ],
        },
      },
      include: { items: true },
    });
    compraA = { id: compra.id };
    compraItemA = { id: compra.items[0].id };

    loteA = await prisma.lote.create({
      data: {
        empresaId: empresaA.id,
        productoId: productoA.id,
        numeroLote: `B3MS-LOTEA-${suffix}`,
        vencimiento: futuro(),
        cantidad: 100,
      },
      select: { id: true },
    });
    loteD = await prisma.lote.create({
      data: {
        empresaId: empresaA.id,
        productoId: productoA.id,
        numeroLote: `B3MS-LOTED-${suffix}`,
        vencimiento: futuro(),
        cantidad: 10,
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    const empresas = [empresaA.id, empresaB.id];
    await prisma.movimientoStock.deleteMany({ where: { empresaId: { in: empresas } } });
    const devoluciones = await prisma.devolucionProveedor.findMany({
      where: { empresaId: { in: empresas } },
      select: { id: true },
    });
    await prisma.devolucionProveedorItem.deleteMany({
      where: { devolucionId: { in: devoluciones.map((d) => d.id) } },
    });
    await prisma.devolucionProveedor.deleteMany({ where: { id: { in: devoluciones.map((d) => d.id) } } });
    await prisma.recepcionCompra.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.compraItem.deleteMany({ where: { compraId: compraA.id } });
    await prisma.compra.deleteMany({ where: { id: compraA.id } });
    await prisma.lote.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.producto.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.proveedor.deleteMany({ where: { id: proveedorA.id } });
    await prisma.usuario.deleteMany({ where: { id: usuarioA.id } });
    await prisma.subtipo.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.tipo.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.familia.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.empresa.deleteMany({ where: { id: { in: empresas } } });
    await prisma.$disconnect();
  });

  it('MS-P-01: same-Business Producto reference persists', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const motivo = motivoUnico('01');
    const created = await db.movimientoStock.create({
      data: movimientoData(empresaA.id, productoA.id, motivo),
      select: { empresaId: true, productoId: true },
    });

    expect(created.empresaId).toBe(empresaA.id);
    expect(created.productoId).toBe(productoA.id);
  });

  it('MS-P-02: cross-Business Producto create rejects with P2025 and no persistence', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const motivo = motivoUnico('02');

    expect(
      await codigoDeRechazo(
        db.movimientoStock.create({ data: movimientoData(empresaA.id, productoB.id, motivo) }),
      ),
    ).toBe('P2025');

    expect(await prisma.movimientoStock.count({ where: { motivo } })).toBe(0);
  });

  it('MS-P-03: cross-Business Producto update rejects with P2025 and preserves the relation', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const movimiento = await prisma.movimientoStock.create({
      data: movimientoData(empresaA.id, productoA.id, motivoUnico('03-base')),
      select: { id: true },
    });

    expect(
      await codigoDeRechazo(
        db.movimientoStock.update({ where: { id: movimiento.id }, data: { productoId: productoB.id } }),
      ),
    ).toBe('P2025');

    const persisted = await prisma.movimientoStock.findUnique({
      where: { id: movimiento.id },
      select: { productoId: true },
    });
    expect(persisted?.productoId).toBe(productoA.id);
  });

  it('MS-P-04: same-Business Producto references commit inside an interactive transaction', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const motivo1 = motivoUnico('04-a');
    const motivo2 = motivoUnico('04-b');

    await db.$transaction(async (tx) => {
      await tx.movimientoStock.create({ data: movimientoData(empresaA.id, productoA.id, motivo1) });
      await tx.movimientoStock.create({ data: movimientoData(empresaA.id, productoA.id, motivo2) });
    });

    expect(await prisma.movimientoStock.count({ where: { motivo: { in: [motivo1, motivo2] } } })).toBe(2);
  });

  it('MS-P-05: rejected cross-Business create rolls back the valid MovimientoStock of the same transaction', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const valido = motivoUnico('05-OK');
    const invalido = motivoUnico('05-BAD');

    expect(
      await codigoDeRechazo(
        db.$transaction(async (tx) => {
          await tx.movimientoStock.create({ data: movimientoData(empresaA.id, productoA.id, valido) });
          await tx.movimientoStock.create({ data: movimientoData(empresaA.id, productoB.id, invalido) });
        }),
      ),
    ).toBe('P2025');

    expect(await prisma.movimientoStock.count({ where: { motivo: { in: [valido, invalido] } } })).toBe(0);
  });

  it('MS-P-06: nonexistent Producto fails closed with P2025 and no persistence', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const motivo = motivoUnico('06');

    expect(
      await codigoDeRechazo(
        db.movimientoStock.create({
          data: movimientoData(empresaA.id, `no-existe-${suffix}`, motivo),
        }),
      ),
    ).toBe('P2025');

    expect(await prisma.movimientoStock.count({ where: { motivo } })).toBe(0);
  });

  it('MS-P-07: productive ajuste flow keeps working (registrarAjuste, W-3)', async () => {
    const motivo = motivoUnico('07');
    await inventario.registrarAjuste(empresaA.id, { loteId: loteA.id, cantidad: 5, motivo }, usuarioA.id);

    const movimientos = await prisma.movimientoStock.findMany({ where: { motivo: `AjusteManual: ${motivo}` } });
    expect(movimientos.length).toBe(1);
    expect(movimientos[0].productoId).toBe(productoA.id);
    expect(movimientos[0].tipoMovimiento).toBe('Entrada');
  });

  it('MS-P-08: productive recepcion flow keeps working (recibirCompra, W-1)', async () => {
    const numeroLote = `B3MS-R08-${suffix}`;
    const recepcion = await compras.recibirCompra(
      empresaA.id,
      compraA.id,
      {
        items: [
          {
            compraItemId: compraItemA.id,
            numeroLote,
            vencimiento: futuro().toISOString(),
            cantidadRecibida: 3,
          },
        ],
      },
      usuarioA.id,
    );

    expect(recepcion.movimientosStock.length).toBe(1);
    expect(recepcion.movimientosStock[0].productoId).toBe(productoA.id);
    expect(recepcion.movimientosStock[0].motivo).toBe('Compra');
    expect(recepcion.movimientosStock[0].tipoMovimiento).toBe('Entrada');
  });

  it('MS-P-09: productive devolucion flow keeps working (crearDevolucion, W-2)', async () => {
    const motivo = motivoUnico('09');
    await compras.crearDevolucion(
      empresaA.id,
      compraA.id,
      {
        motivo,
        items: [{ productoId: productoA.id, loteId: loteD.id, cantidad: 1, costoUnitario: 5 }],
      },
      usuarioA.id,
    );

    const movimientos = await prisma.movimientoStock.findMany({ where: { motivo: 'Devolucion' } });
    const propio = movimientos.filter((m) => m.productoId === productoA.id);
    expect(propio.length).toBeGreaterThanOrEqual(1);
    expect(propio[0].tipoMovimiento).toBe('Salida');
  });

  it('MS-P-10: productive devolucion flow with cross-Business Producto rejects with P2025 and rolls back', async () => {
    const motivo = motivoUnico('10');

    expect(
      await codigoDeRechazo(
        compras.crearDevolucion(
          empresaA.id,
          compraA.id,
          {
            motivo,
            items: [{ productoId: productoB.id, cantidad: 1, costoUnitario: 5 }],
          },
          usuarioA.id,
        ),
      ),
    ).toBe('P2025');

    expect(await prisma.devolucionProveedor.count({ where: { motivo } })).toBe(0);
    const movimientos = await prisma.movimientoStock.findMany({ where: { motivo: 'Devolucion' } });
    expect(movimientos.filter((m) => m.productoId === productoB.id).length).toBe(0);
  });

  it('MS-P-11: productive FIFO discount flow keeps working (descontarStock, W-4)', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const referencia = codigoUnico('11');

    await db.$transaction(async (tx) =>
      inventario.descontarStock(tx, empresaA.id, productoA.id, 2, 'Venta', referencia, usuarioA.id),
    );

    const movimientos = await prisma.movimientoStock.findMany({ where: { referenciaId: referencia } });
    expect(movimientos.length).toBeGreaterThanOrEqual(1);
    for (const m of movimientos) {
      expect(m.productoId).toBe(productoA.id);
      expect(m.tipoMovimiento).toBe('Salida');
    }
  });

  it('MS-P-12: control — update to a nonexistent Producto is P2025, distinguishable from the FK violation', async () => {
    const db = scopedPrisma.forEmpresa(empresaA.id);
    const movimiento = await prisma.movimientoStock.create({
      data: movimientoData(empresaA.id, productoA.id, motivoUnico('12-base')),
      select: { id: true },
    });

    expect(
      await codigoDeRechazo(
        db.movimientoStock.update({
          where: { id: movimiento.id },
          data: { productoId: `no-existe-${suffix}` },
        }),
      ),
    ).toBe('P2025');
  });
});
