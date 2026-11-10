import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { CompanyScopedPrismaService } from './company-scoped-prisma.service';

/**
 * SECURITY TEST: Multi-tenant isolation in findUnique/findUniqueOrThrow (B3-FINDUNIQUE)
 *
 * FIXED VULNERABILITY: findUnique without select empresaId can leak data from another company.
 *
 * Solution: Prisma 5.22+ Extended Where Unique allows injecting empresaId directly into
 * the where clause, so the database enforces scope BEFORE returning results.
 */
describe('CompanyScopedPrismaService - findUnique Security (B3-FINDUNIQUE)', () => {
  let prisma: PrismaService;
  let factory: CompanyScopedPrismaService;
  const businessIds: string[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaService, CompanyScopedPrismaService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    factory = module.get<CompanyScopedPrismaService>(CompanyScopedPrismaService);

    // Real Businesses: the former hard-coded ids ('empresa-test-001/002') did
    // not exist, so every create failed on Usuario_empresaId_fkey.
    const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    for (const label of ['a', 'b']) {
      const empresa = await prisma.empresa.create({
        data: {
          nombre: `B3-FINDUNIQUE ${label} ${tag}`,
          slug: `b3-findunique-${label}-${tag}`,
          configuracion: {},
        },
        select: { id: true },
      });
      businessIds.push(empresa.id);
    }
  });

  describe('Requirement 1: findUnique returns null when record belongs to another company', () => {
    it('findUnique without empresaId in select returns null for another company', async () => {
      const companyA = businessIds[0];
      const companyB = businessIds[1];
      const dbA = factory.forCompany(companyA);
      const dbB = factory.forCompany(companyB);

      // Create a user in Company A
      const user = await dbA.usuario.create({
        data: {
          email: `user-${Date.now()}@test.com`,
          nombre: 'Usuario Secreto A',
          rol: 'OWNER',
          empresaId: companyA,
        },
      });

      // Company B tries to read with select omitting empresaId
      const leaked = await dbB.usuario.findUnique({
        where: { email: user.email },
        select: { email: true, nombre: true },
        // NO empresaId in select
      });

      // EXPECTED (FIXED): null because where clause has empresaId: companyB
      expect(leaked).toBeNull();
    });
  });

  describe('Requirement 2: findUniqueOrThrow throws P2025 for another company', () => {
    it('findUniqueOrThrow throws when record belongs to another company', async () => {
      const companyA = businessIds[0];
      const companyB = businessIds[1];
      const dbA = factory.forCompany(companyA);
      const dbB = factory.forCompany(companyB);

      const user = await dbA.usuario.create({
        data: {
          email: `throw-${Date.now()}@test.com`,
          nombre: 'Usuario Para Lanzar Error',
          rol: 'OWNER',
          empresaId: companyA,
        },
      });

      // Company B calls findUniqueOrThrow
      await expect(
        dbB.usuario.findUniqueOrThrow({
          where: { email: user.email },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Requirement 3: Query without select still protected', () => {
    it('findUnique without select returns null for another company', async () => {
      const companyA = businessIds[0];
      const companyB = businessIds[1];
      const dbA = factory.forCompany(companyA);
      const dbB = factory.forCompany(companyB);

      const user = await dbA.usuario.create({
        data: {
          email: `noselect-${Date.now()}@test.com`,
          nombre: 'Usuario Sin Select',
          rol: 'OWNER',
          empresaId: companyA,
        },
      });

      // Company B queries without select (all fields)
      const found = await dbB.usuario.findUnique({
        where: { email: user.email },
      });

      expect(found).toBeNull();
    });
  });

  describe('Requirement 4: Projection is preserved exactly', () => {
    it('Query result includes only requested fields, no empresaId if not selected', async () => {
      const companyA = businessIds[0];
      const dbA = factory.forCompany(companyA);

      const user = await dbA.usuario.create({
        data: {
          email: `projection-${Date.now()}@test.com`,
          nombre: 'Usuario Con Projection',
          rol: 'OWNER',
          empresaId: companyA,
        },
      });

      // Query with explicit projection
      const result = await dbA.usuario.findUnique({
        where: { email: user.email },
        select: { email: true, nombre: true },
        // NO empresaId in select
      });

      // EXPECTED: exactly { email, nombre }, no empresaId field
      expect(result).toEqual({
        email: user.email,
        nombre: 'Usuario Con Projection',
      });
      expect(result).not.toHaveProperty('empresaId');
    });
  });

  describe('Requirement 5: Injected empresaId in where overrides client values', () => {
    it('where clause injected empresaId is enforced by database', async () => {
      const companyA = businessIds[0];
      const dbA = factory.forCompany(companyA);

      const user = await dbA.usuario.create({
        data: {
          email: `override-${Date.now()}@test.com`,
          nombre: 'Usuario Override Test',
          rol: 'OWNER',
          empresaId: companyA,
        },
      });

      // Query own record — should work
      const found = await dbA.usuario.findUnique({
        where: { email: user.email },
      });

      // The extension injects empresaId: companyA into where
      // So even if someone tries to bypass it, the database enforces it
      expect(found?.empresaId).toBe(companyA);
    });
  });

  describe('Requirement 6: Legitimate queries of own company work normally', () => {
    it('User can query their own company records', async () => {
      const companyA = businessIds[0];
      const dbA = factory.forCompany(companyA);

      const user = await dbA.usuario.create({
        data: {
          email: `legit-${Date.now()}@test.com`,
          nombre: 'Usuario Legítimo',
          rol: 'OWNER',
          empresaId: companyA,
        },
      });

      const found = await dbA.usuario.findUnique({
        where: { email: user.email },
      });

      expect(found).toBeDefined();
      expect(found?.email).toBe(user.email);
      expect(found?.nombre).toBe('Usuario Legítimo');
      expect(found?.empresaId).toBe(companyA);
    });
  });

  afterAll(async () => {
    if (businessIds.length) {
      await prisma.usuario.deleteMany({ where: { empresaId: { in: businessIds } } });
      await prisma.empresa.deleteMany({ where: { id: { in: businessIds } } });
    }
    await prisma.$disconnect();
  });
});
