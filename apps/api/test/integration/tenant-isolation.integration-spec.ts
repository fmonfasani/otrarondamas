import { EmpresaScopedPrismaService } from '../../src/prisma/empresa-scoped-prisma.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Tenant isolation verification infrastructure', () => {
  let prisma: PrismaService;
  let scopedPrisma: EmpresaScopedPrismaService;
  let empresaA: { id: string };
  let empresaB: { id: string };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    scopedPrisma = new EmpresaScopedPrismaService(prisma);

    empresaA = await prisma.empresa.create({
      data: {
        nombre: `B4 Test A ${Date.now()}`,
        configuracion: {},
      },
      select: { id: true },
    });

    empresaB = await prisma.empresa.create({
      data: {
        nombre: `B4 Test B ${Date.now()}`,
        configuracion: {},
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({
      where: { empresaId: { in: [empresaA.id, empresaB.id] } },
    });
    await prisma.empresa.deleteMany({
      where: { id: { in: [empresaA.id, empresaB.id] } },
    });
    await prisma.$disconnect();
  });

  it('creates deterministic records for two Business contexts', async () => {
    const userA = await scopedPrisma.forEmpresa(empresaA.id).usuario.create({
      data: {
        empresaId: empresaB.id,
        nombre: 'B4 User A',
        email: `b4-a-${Date.now()}@example.test`,
      },
      select: { id: true, empresaId: true },
    });

    const userB = await scopedPrisma.forEmpresa(empresaB.id).usuario.create({
      data: {
        empresaId: empresaA.id,
        nombre: 'B4 User B',
        email: `b4-b-${Date.now()}@example.test`,
      },
      select: { id: true, empresaId: true },
    });

    expect(userA.empresaId).toBe(empresaA.id);
    expect(userB.empresaId).toBe(empresaB.id);
  });

  it('reads only records belonging to the active Business context', async () => {
    const markerA = `b4-read-a-${Date.now()}@example.test`;
    const markerB = `b4-read-b-${Date.now()}@example.test`;

    await prisma.usuario.createMany({
      data: [
        {
          empresaId: empresaA.id,
          nombre: 'B4 Read A',
          email: markerA,
        },
        {
          empresaId: empresaB.id,
          nombre: 'B4 Read B',
          email: markerB,
        },
      ],
    });

    const fromA = await scopedPrisma.forEmpresa(empresaA.id).usuario.findMany({
      where: { email: { in: [markerA, markerB] } },
      orderBy: { email: 'asc' },
      select: { email: true, empresaId: true },
    });

    expect(fromA).toEqual([
      { email: markerA, empresaId: empresaA.id },
    ]);
  });

  it('fails closed for a unique lookup that resolves to another Business', async () => {
    const email = `b4-unique-${Date.now()}@example.test`;

    await prisma.usuario.create({
      data: {
        empresaId: empresaB.id,
        nombre: 'B4 Unique B',
        email,
      },
    });

    const fromA = await scopedPrisma.forEmpresa(empresaA.id).usuario.findUnique({
      where: { email },
      select: { id: true, empresaId: true },
    });

    expect(fromA).toBeNull();
  });
});
