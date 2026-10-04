import { PrismaService } from '../../src/prisma/prisma.service';
import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { ComprasService } from '../../src/compras/compras.service';

describe('B3 characterization — PagoProveedor / DevolucionProveedor ownership', () => {
  let prisma: PrismaService;
  let scopedPrisma: EmpresaScopedPrismaService;
  let comprasService: ComprasService;

  let empresaA: { id: string };
  let empresaB: { id: string };
  let usuarioA: { id: string };
  let usuarioB: { id: string };
  let proveedorA: { id: string };
  let proveedorB: { id: string };
  let compraA: { id: string };
  let compraB: { id: string };
  let pagoA: { id: string };
  let pagoB: { id: string };
  let devolucionA: { id: string };
  let devolucionB: { id: string };

  const unique = () => Date.now().toString();

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new EmpresaScopedPrismaService(prisma);
    comprasService = new ComprasService(scopedPrisma);

    const suffix = unique();

    empresaA = await prisma.empresa.create({
      data: { nombre: `B3 characterization A ${suffix}`, configuracion: {} },
      select: { id: true },
    });
    empresaB = await prisma.empresa.create({
      data: { nombre: `B3 characterization B ${suffix}`, configuracion: {} },
      select: { id: true },
    });

    usuarioA = await prisma.usuario.create({
      data: {
        empresaId: empresaA.id,
        nombre: 'B3 Characterization User A',
        email: `b3-characterization-a-${suffix}@example.test`,
      },
      select: { id: true },
    });
    usuarioB = await prisma.usuario.create({
      data: {
        empresaId: empresaB.id,
        nombre: 'B3 Characterization User B',
        email: `b3-characterization-b-${suffix}@example.test`,
      },
      select: { id: true },
    });

    proveedorA = await prisma.proveedor.create({
      data: { empresaId: empresaA.id, nombre: `B3 Characterization Supplier A ${suffix}` },
      select: { id: true },
    });
    proveedorB = await prisma.proveedor.create({
      data: { empresaId: empresaB.id, nombre: `B3 Characterization Supplier B ${suffix}` },
      select: { id: true },
    });

    compraA = await prisma.compra.create({
      data: {
        empresaId: empresaA.id,
        proveedorId: proveedorA.id,
        usuarioId: usuarioA.id,
        estado: 'BORRADOR',
        total: 100,
        totalPagado: 0,
        saldo: 100,
      },
      select: { id: true },
    });
    compraB = await prisma.compra.create({
      data: {
        empresaId: empresaB.id,
        proveedorId: proveedorB.id,
        usuarioId: usuarioB.id,
        estado: 'BORRADOR',
        total: 200,
        totalPagado: 0,
        saldo: 200,
      },
      select: { id: true },
    });

    pagoA = await prisma.pagoProveedor.create({
      data: {
        empresaId: empresaA.id,
        compraId: compraA.id,
        proveedorId: proveedorA.id,
        usuarioId: usuarioA.id,
        monto: 10,
        medioPago: 'Transferencia',
      },
      select: { id: true },
    });
    pagoB = await prisma.pagoProveedor.create({
      data: {
        empresaId: empresaB.id,
        compraId: compraB.id,
        proveedorId: proveedorB.id,
        usuarioId: usuarioB.id,
        monto: 20,
        medioPago: 'Transferencia',
      },
      select: { id: true },
    });

    devolucionA = await prisma.devolucionProveedor.create({
      data: {
        empresaId: empresaA.id,
        compraId: compraA.id,
        proveedorId: proveedorA.id,
        usuarioId: usuarioA.id,
        motivo: 'A original',
      },
      select: { id: true },
    });
    devolucionB = await prisma.devolucionProveedor.create({
      data: {
        empresaId: empresaB.id,
        compraId: compraB.id,
        proveedorId: proveedorB.id,
        usuarioId: usuarioB.id,
        motivo: 'B original',
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.devolucionProveedor.deleteMany({
      where: { id: { in: [devolucionA.id, devolucionB.id] } },
    });
    await prisma.pagoProveedor.deleteMany({
      where: { id: { in: [pagoA.id, pagoB.id] } },
    });
    await prisma.compra.deleteMany({
      where: { id: { in: [compraA.id, compraB.id] } },
    });
    await prisma.proveedor.deleteMany({
      where: { id: { in: [proveedorA.id, proveedorB.id] } },
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [usuarioA.id, usuarioB.id] } },
    });
    await prisma.empresa.deleteMany({
      where: { id: { in: [empresaA.id, empresaB.id] } },
    });
    await prisma.$disconnect();
  });

  it('PAY-01: scoped read of PagoProveedor currently reaches Business B', async () => {
    const record = await scopedPrisma.forEmpresa(empresaA.id).pagoProveedor.findUnique({
      where: { id: pagoB.id },
      select: { id: true, empresaId: true },
    });

    expect(record).toEqual({ id: pagoB.id, empresaId: empresaB.id });
  });

  it('PAY-02: scoped update of PagoProveedor currently mutates Business B', async () => {
    await scopedPrisma.forEmpresa(empresaA.id).pagoProveedor.update({
      where: { id: pagoB.id },
      data: { notas: 'mutated through A scoped client' },
    });

    const record = await prisma.pagoProveedor.findUnique({
      where: { id: pagoB.id },
      select: { notas: true, empresaId: true },
    });
    expect(record).toEqual({
      notas: 'mutated through A scoped client',
      empresaId: empresaB.id,
    });
  });

  it('PAY-03: public service listing remains bounded by an A-owned Compra', async () => {
    const records = await comprasService.listarPagos(empresaA.id, compraA.id);

    expect(records.map((record) => record.id)).toEqual([pagoA.id]);
  });

  it('DEV-01: scoped read of DevolucionProveedor currently reaches Business B', async () => {
    const record = await scopedPrisma.forEmpresa(empresaA.id).devolucionProveedor.findUnique({
      where: { id: devolucionB.id },
      select: { id: true, empresaId: true },
    });

    expect(record).toEqual({ id: devolucionB.id, empresaId: empresaB.id });
  });

  it('DEV-02: scoped update of DevolucionProveedor currently mutates Business B', async () => {
    await scopedPrisma.forEmpresa(empresaA.id).devolucionProveedor.update({
      where: { id: devolucionB.id },
      data: { motivo: 'mutated through A scoped client' },
    });

    const record = await prisma.devolucionProveedor.findUnique({
      where: { id: devolucionB.id },
      select: { motivo: true, empresaId: true },
    });
    expect(record).toEqual({
      motivo: 'mutated through A scoped client',
      empresaId: empresaB.id,
    });
  });

  it('DEV-03: public service listing remains bounded by an A-owned Compra', async () => {
    const records = await comprasService.listarDevoluciones(empresaA.id, compraA.id);

    expect(records.map((record) => record.id)).toEqual([devolucionA.id]);
  });
});
