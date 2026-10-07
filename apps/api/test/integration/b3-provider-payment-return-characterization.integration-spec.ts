import { PrismaService } from '../../src/prisma/prisma.service';
import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PurchasesService } from '../../src/purchases/purchases.service';

describe('B3 ownership — PagoProveedor / DevolucionProveedor', () => {
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let purchasesService: PurchasesService;

  let companyA: { id: string };
  let companyB: { id: string };
  let userA: { id: string };
  let userB: { id: string };
  let supplierA: { id: string };
  let supplierB: { id: string };
  let purchaseA: { id: string };
  let purchaseB: { id: string };
  let paymentA: { id: string };
  let paymentB: { id: string };
  let returnRecordA: { id: string };
  let returnRecordB: { id: string };

  const unique = () => Date.now().toString();

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new CompanyScopedPrismaService(prisma);
    purchasesService = new PurchasesService(scopedPrisma);

    const suffix = unique();

    companyA = await prisma.empresa.create({
      data: { nombre: `B3 characterization A ${suffix}`, slug: `b3-provider-payment-return-characterization-a-${suffix}`, configuracion: {} },
      select: { id: true },
    });
    companyB = await prisma.empresa.create({
      data: { nombre: `B3 characterization B ${suffix}`, slug: `b3-provider-payment-return-characterization-b-${suffix}`, configuracion: {} },
      select: { id: true },
    });

    userA = await prisma.usuario.create({
      data: {
        empresaId: companyA.id,
        nombre: 'B3 Characterization User A',
        email: `b3-characterization-a-${suffix}@example.test`,
      },
      select: { id: true },
    });
    userB = await prisma.usuario.create({
      data: {
        empresaId: companyB.id,
        nombre: 'B3 Characterization User B',
        email: `b3-characterization-b-${suffix}@example.test`,
      },
      select: { id: true },
    });

    supplierA = await prisma.proveedor.create({
      data: { empresaId: companyA.id, nombre: `B3 Characterization Supplier A ${suffix}` },
      select: { id: true },
    });
    supplierB = await prisma.proveedor.create({
      data: { empresaId: companyB.id, nombre: `B3 Characterization Supplier B ${suffix}` },
      select: { id: true },
    });

    purchaseA = await prisma.compra.create({
      data: {
        empresaId: companyA.id,
        proveedorId: supplierA.id,
        usuarioId: userA.id,
        estado: 'BORRADOR',
        total: 100,
        totalPagado: 0,
        saldo: 100,
      },
      select: { id: true },
    });
    purchaseB = await prisma.compra.create({
      data: {
        empresaId: companyB.id,
        proveedorId: supplierB.id,
        usuarioId: userB.id,
        estado: 'BORRADOR',
        total: 200,
        totalPagado: 0,
        saldo: 200,
      },
      select: { id: true },
    });

    paymentA = await prisma.pagoProveedor.create({
      data: {
        empresaId: companyA.id,
        compraId: purchaseA.id,
        proveedorId: supplierA.id,
        usuarioId: userA.id,
        monto: 10,
        medioPago: 'Transferencia',
      },
      select: { id: true },
    });
    paymentB = await prisma.pagoProveedor.create({
      data: {
        empresaId: companyB.id,
        compraId: purchaseB.id,
        proveedorId: supplierB.id,
        usuarioId: userB.id,
        monto: 20,
        medioPago: 'Transferencia',
      },
      select: { id: true },
    });

    returnRecordA = await prisma.devolucionProveedor.create({
      data: {
        empresaId: companyA.id,
        compraId: purchaseA.id,
        proveedorId: supplierA.id,
        usuarioId: userA.id,
        motivo: 'A original',
      },
      select: { id: true },
    });
    returnRecordB = await prisma.devolucionProveedor.create({
      data: {
        empresaId: companyB.id,
        compraId: purchaseB.id,
        proveedorId: supplierB.id,
        usuarioId: userB.id,
        motivo: 'B original',
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.devolucionProveedor.deleteMany({
      where: { id: { in: [returnRecordA.id, returnRecordB.id] } },
    });
    await prisma.pagoProveedor.deleteMany({
      where: { id: { in: [paymentA.id, paymentB.id] } },
    });
    await prisma.compra.deleteMany({
      where: { id: { in: [purchaseA.id, purchaseB.id] } },
    });
    await prisma.proveedor.deleteMany({
      where: { id: { in: [supplierA.id, supplierB.id] } },
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });
    await prisma.empresa.deleteMany({
      where: { id: { in: [companyA.id, companyB.id] } },
    });
    await prisma.$disconnect();
  });

  it('PAY-01: scoped read of PagoProveedor hides Business B', async () => {
    const record = await scopedPrisma.forCompany(companyA.id).pagoProveedor.findUnique({
      where: { id: paymentB.id },
      select: { id: true, empresaId: true },
    });

    expect(record).toBeNull();
  });

  it('PAY-02: scoped update of PagoProveedor rejects Business B', async () => {
    await expect(
      scopedPrisma.forCompany(companyA.id).pagoProveedor.update({
        where: { id: paymentB.id },
        data: { notas: 'must not mutate through A scoped client' },
      }),
    ).rejects.toMatchObject({ code: 'P2025' });

    const record = await prisma.pagoProveedor.findUnique({
      where: { id: paymentB.id },
      select: { notas: true, empresaId: true },
    });
    expect(record).toEqual({ notas: null, empresaId: companyB.id });
  });

  it('PAY-03: public service listing remains bounded by an A-owned Compra', async () => {
    const records = await purchasesService.listPayments(companyA.id, purchaseA.id);

    expect(records.map((record) => record.id)).toEqual([paymentA.id]);
  });

  it('DEV-01: scoped read of DevolucionProveedor hides Business B', async () => {
    const record = await scopedPrisma.forCompany(companyA.id).devolucionProveedor.findUnique({
      where: { id: returnRecordB.id },
      select: { id: true, empresaId: true },
    });

    expect(record).toBeNull();
  });

  it('DEV-02: scoped update of DevolucionProveedor rejects Business B', async () => {
    await expect(
      scopedPrisma.forCompany(companyA.id).devolucionProveedor.update({
        where: { id: returnRecordB.id },
        data: { motivo: 'must not mutate through A scoped client' },
      }),
    ).rejects.toMatchObject({ code: 'P2025' });

    const record = await prisma.devolucionProveedor.findUnique({
      where: { id: returnRecordB.id },
      select: { motivo: true, empresaId: true },
    });
    expect(record).toEqual({ motivo: 'B original', empresaId: companyB.id });
  });

  it('DEV-03: public service listing remains bounded by an A-owned Compra', async () => {
    const records = await purchasesService.listReturns(companyA.id, purchaseA.id);

    expect(records.map((record) => record.id)).toEqual([returnRecordA.id]);
  });
});
