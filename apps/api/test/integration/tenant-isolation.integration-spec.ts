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
        slug: `b4-tenant-a-${Date.now()}`,
        configuracion: {},
      },
      select: { id: true },
    });

    companyB = await prisma.empresa.create({
      data: {
        nombre: `B4 Test B ${Date.now()}`,
        slug: `b4-tenant-b-${Date.now()}`,
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

  // The post-query check that used to guard findUnique only inspected
  // `empresaId` when the caller selected it, so these lookups omit it.
  describe('findUnique with a projection that omits empresaId', () => {
    const createUser = (empresaId: string, tag: string) =>
      prisma.usuario.create({
        data: { empresaId, nombre: `B4 ${tag}`, email: `b4-${tag}-${Date.now()}@example.test` },
        select: { id: true, email: true },
      });

    it('returns null for a record of another Business', async () => {
      const userB = await createUser(companyB.id, 'proj-null');

      const fromA = await scopedPrisma.forCompany(companyA.id).usuario.findUnique({
        where: { id: userB.id },
        select: { id: true, nombre: true, email: true },
      });

      expect(fromA).toBeNull();
    });

    it('findUniqueOrThrow raises P2025 for a record of another Business', async () => {
      const userB = await createUser(companyB.id, 'proj-throw');

      await expect(
        scopedPrisma.forCompany(companyA.id).usuario.findUniqueOrThrow({
          where: { id: userB.id },
          select: { id: true, nombre: true },
        }),
      ).rejects.toMatchObject({ code: 'P2025' });
    });

    it('still returns the record to its own Business', async () => {
      const userA = await createUser(companyA.id, 'proj-own');

      const fromA = await scopedPrisma.forCompany(companyA.id).usuario.findUnique({
        where: { id: userA.id },
        select: { id: true, email: true },
      });

      expect(fromA).toEqual(userA);
    });

    it('ignores a caller-supplied empresaId pointing at another Business', async () => {
      const userB = await createUser(companyB.id, 'proj-override');

      const fromA = await scopedPrisma.forCompany(companyA.id).usuario.findUnique({
        where: { id: userB.id, empresaId: companyB.id },
        select: { id: true },
      });

      expect(fromA).toBeNull();
    });
  });
});
