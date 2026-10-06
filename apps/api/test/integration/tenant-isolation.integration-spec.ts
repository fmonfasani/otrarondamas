import { CompanyScopedPrismaService } from '../../src/prisma/company-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Tenant isolation verification infrastructure', () => {
  let prisma: PrismaService;
  let scopedPrisma: CompanyScopedPrismaService;
  let companyA: { id: string };
  let companyB: { id: string };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new CompanyScopedPrismaService(prisma);

    companyA = await prisma.empresa.create({
      data: {
        nombre: `B4 Test A ${Date.now()}`,
        configuracion: {},
      },
      select: { id: true },
    });

    companyB = await prisma.empresa.create({
      data: {
        nombre: `B4 Test B ${Date.now()}`,
        configuracion: {},
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({
      where: { empresaId: { in: [companyA.id, companyB.id] } },
    });
    await prisma.empresa.deleteMany({
      where: { id: { in: [companyA.id, companyB.id] } },
    });
    await prisma.$disconnect();
  });

  it('creates deterministic records for two Business contexts', async () => {
    const userA = await scopedPrisma.forCompany(companyA.id).usuario.create({
      data: {
        empresaId: companyB.id,
        nombre: 'B4 User A',
        email: `b4-a-${Date.now()}@example.test`,
      },
      select: { id: true, empresaId: true },
    });

    const userB = await scopedPrisma.forCompany(companyB.id).usuario.create({
      data: {
        empresaId: companyA.id,
        nombre: 'B4 User B',
        email: `b4-b-${Date.now()}@example.test`,
      },
      select: { id: true, empresaId: true },
    });

    expect(userA.empresaId).toBe(companyA.id);
    expect(userB.empresaId).toBe(companyB.id);
  });

  it('reads only records belonging to the active Business context', async () => {
    const markerA = `b4-read-a-${Date.now()}@example.test`;
    const markerB = `b4-read-b-${Date.now()}@example.test`;

    await prisma.usuario.createMany({
      data: [
        {
          empresaId: companyA.id,
          nombre: 'B4 Read A',
          email: markerA,
        },
        {
          empresaId: companyB.id,
          nombre: 'B4 Read B',
          email: markerB,
        },
      ],
    });

    const fromA = await scopedPrisma.forCompany(companyA.id).usuario.findMany({
      where: { email: { in: [markerA, markerB] } },
      orderBy: { email: 'asc' },
      select: { email: true, empresaId: true },
    });

    expect(fromA).toEqual([{ email: markerA, empresaId: companyA.id }]);
  });

  it('fails closed for a unique lookup that resolves to another Business', async () => {
    const email = `b4-unique-${Date.now()}@example.test`;

    await prisma.usuario.create({
      data: {
        empresaId: companyB.id,
        nombre: 'B4 Unique B',
        email,
      },
    });

    const fromA = await scopedPrisma.forCompany(companyA.id).usuario.findUnique({
      where: { email },
      select: { id: true, empresaId: true },
    });

    expect(fromA).toBeNull();
  });
});
