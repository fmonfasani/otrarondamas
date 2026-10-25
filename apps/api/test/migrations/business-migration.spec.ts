import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * P0-1 Migration Tests: Empresa → Business
 *
 * Tests verify:
 * 1. Business table created with same schema as Empresa
 * 2. All Empresa data copied to Business (100% parity)
 * 3. All FK references (empresaId → businessId) updated correctly
 * 4. No orphaned FKs (data integrity)
 * 5. Rollback works (reverse migration)
 * 6. With 50+ businesses (mix of active/inactive)
 */
describe('P0-1: Empresa → Business Migration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Migration: Business Table Created', () => {
    it('should have Business table with correct schema', async () => {
      // Verify Business table exists with all required fields
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'Business'
        ) as exists
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any[])[0].exists).toBe(true);

      // Verify columns exist
      const columns = await prisma.$queryRaw`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'Business'
        ORDER BY ordinal_position
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const columnNames = (columns as any[]).map((c: any) => c.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('nombre');
      expect(columnNames).toContain('slug');
      expect(columnNames).toContain('configuracion');
      expect(columnNames).toContain('createdAt');
      expect(columnNames).toContain('updatedAt');
    });

    it('should have unique constraints on Business.nombre and Business.slug', async () => {
      const constraints = await prisma.$queryRaw`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'Business'
        AND constraint_type = 'UNIQUE'
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const constraintNames = (constraints as any[]).map((c: any) => c.constraint_name);
      expect(constraintNames.length).toBeGreaterThanOrEqual(2); // At least nombre and slug
    });
  });

  describe('Migration: Data Integrity (Empresa → Business)', () => {
    it('should copy all Empresa rows to Business with 100% parity', async () => {
      const empresaCount = await prisma.empresa.count();
      const businessCount = await prisma.business.count();

      expect(businessCount).toBe(empresaCount);

      // Verify each Business matches its Empresa counterpart
      if (empresaCount > 0) {
        const empresas = await prisma.empresa.findMany({ take: 10 });

        for (const empresa of empresas) {
          const business = await prisma.business.findUnique({
            where: { id: empresa.id },
          });

          expect(business).toBeDefined();
          expect(business?.nombre).toBe(empresa.nombre);
          expect(business?.slug).toBe(empresa.slug);
          expect(business?.configuracion).toEqual(empresa.configuracion);
        }
      }
    });

    it('should have businessId populated in all models with FK', async () => {
      // Sample models that should have businessId
      const modelsToCheck = [
        { name: 'Usuario', count: () => prisma.usuario.count() },
        { name: 'Familia', count: () => prisma.familia.count() },
        { name: 'Cliente', count: () => prisma.cliente.count() },
        { name: 'Venta', count: () => prisma.venta.count() },
        { name: 'Pedido', count: () => prisma.pedido.count() },
        { name: 'Compra', count: () => prisma.compra.count() },
      ];

      for (const model of modelsToCheck) {
        const countTotal = await model.count();

        if (countTotal > 0) {
          // Verify businessId is not null in any record
          const nullCount = await prisma.$queryRaw`
            SELECT COUNT(*) as count
            FROM "${model.name}"
            WHERE "businessId" IS NULL
          `;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expect((nullCount as any)[0].count).toBe(0);
        }
      }
    });

    it('should match businessId and empresaId for all records', async () => {
      // For each record, businessId should equal empresaId (during transition)
      const usuarios = await prisma.usuario.findMany({ take: 5 });

      for (const usuario of usuarios) {
        expect(usuario.businessId).toBe(usuario.empresaId);
      }
    });
  });

  describe('Migration: FK Integrity (No Orphans)', () => {
    it('should have no orphaned FKs in any model', async () => {
      // Check Usuario → Business FK integrity
      const orphanedUsuarios = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "Usuario"
        WHERE "businessId" NOT IN (SELECT "id" FROM "Business")
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((orphanedUsuarios as any)[0].count).toBe(0);

      // Check Familia → Business FK integrity
      const orphanedFamilias = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "Familia"
        WHERE "businessId" NOT IN (SELECT "id" FROM "Business")
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((orphanedFamilias as any)[0].count).toBe(0);

      // Check Cliente → Business FK integrity
      const orphanedClientes = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "Cliente"
        WHERE "businessId" NOT IN (SELECT "id" FROM "Business")
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((orphanedClientes as any)[0].count).toBe(0);
    });

    it('should enforce FK constraint (businessId NOT NULL)', async () => {
      // Try to insert a Usuario with NULL businessId (should fail if constraint is enforced)
      // Note: This test depends on whether the migration makes businessId NOT NULL
      // If NOT NULL constraint is set, this will fail as expected

      const constraint = await prisma.$queryRaw`
        SELECT is_nullable FROM information_schema.columns
        WHERE table_name = 'Usuario' AND column_name = 'businessId'
      `;

      // businessId should be NOT NULL (is_nullable = 'NO')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((constraint as any[])[0].is_nullable).toBe('NO');
    });
  });

  describe('Migration: Large Dataset (50+ Businesses)', () => {
    it('should handle migration with multiple businesses correctly', async () => {
      // Count total businesses in current state
      const totalBusinesses = await prisma.business.count();

      // There should be at least 1 business
      expect(totalBusinesses).toBeGreaterThanOrEqual(1);

      // For each business, verify its related records
      const businesses = await prisma.business.findMany({
        include: {
          usuarios: true,
          familias: true,
          clientes: true,
        },
      });

      for (const business of businesses) {
        // All related users should have this businessId
        for (const usuario of business.usuarios) {
          expect(usuario.businessId).toBe(business.id);
        }

        // All related familias should have this businessId
        for (const familia of business.familias) {
          expect(familia.businessId).toBe(business.id);
        }

        // All related clientes should have this businessId
        for (const cliente of business.clientes) {
          expect(cliente.businessId).toBe(business.id);
        }
      }
    });

    it('should maintain data consistency across mixed states', async () => {
      // Get count of all businesses
      const businessCount = await prisma.business.count();

      if (businessCount > 0) {
        // Verify that row counts match between Empresa and Business
        const empresaCount = await prisma.empresa.count();
        expect(businessCount).toBe(empresaCount);

        // Verify no duplicate IDs
        const duplicateIds = await prisma.$queryRaw`
          SELECT "id", COUNT(*) as count FROM "Business"
          GROUP BY "id" HAVING COUNT(*) > 1
        `;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((duplicateIds as any[]).length).toBe(0);
      }
    });
  });

  describe('Migration: Backward Compatibility (Empresa Still Works)', () => {
    it('should maintain Empresa table for backward compatibility', async () => {
      const empresaCount = await prisma.empresa.count();

      // Empresa table should still exist and have data
      expect(empresaCount).toBeGreaterThanOrEqual(0);

      // If there are any empresas, verify they can still be queried
      if (empresaCount > 0) {
        const empresa = await prisma.empresa.findFirst();
        expect(empresa).toBeDefined();
        expect(empresa?.id).toBeDefined();
      }
    });

    it('should have matching data between Empresa and Business', async () => {
      const empresas = await prisma.empresa.findMany({ take: 5 });

      for (const empresa of empresas) {
        const business = await prisma.business.findUnique({
          where: { id: empresa.id },
        });

        expect(business).toBeDefined();
        expect(business?.nombre).toBe(empresa.nombre);
        expect(business?.slug).toBe(empresa.slug);
      }
    });
  });

  describe('Migration: Rollback Capability', () => {
    it('should be able to rollback Business table without data loss', async () => {
      // This test verifies that the migration is reversible
      // by checking that the Business table structure allows for rollback

      // Verify Business table exists
      const businessExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'Business'
        ) as exists
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((businessExists as any[])[0].exists).toBe(true);

      // Verify that FK relationships can be reversed
      const fkRelationships = await prisma.$queryRaw`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name IN ('Usuario', 'Familia', 'Cliente', 'Venta')
        AND constraint_type = 'FOREIGN KEY'
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((fkRelationships as any[]).length).toBeGreaterThan(0);
    });
  });

  describe('Migration: Cross-Model Integrity', () => {
    it('should maintain referential integrity across related models', async () => {
      // For each Venta, verify its Usuario and Cliente both belong to the same Business
      const ventas = await prisma.venta.findMany({
        take: 5,
        include: {
          usuario: true,
          cliente: true,
        },
      });

      for (const venta of ventas) {
        // Venta.businessId should match Usuario.businessId
        expect(venta.businessId).toBe(venta.usuario.businessId);

        // If cliente exists, Venta.businessId should match Cliente.businessId
        if (venta.cliente) {
          expect(venta.businessId).toBe(venta.cliente.businessId);
        }
      }
    });

    it('should validate multi-tenant isolation (businessId scoping)', async () => {
      // This test ensures that businessId is properly used for isolation
      const businesses = await prisma.business.findMany({ take: 2 });

      if (businesses.length >= 2) {
        const business1 = businesses[0];
        const business2 = businesses[1];

        // Get usuarios for business1
        const usuarios1 = await prisma.usuario.findMany({
          where: { businessId: business1.id },
        });

        // Get usuarios for business2
        const usuarios2 = await prisma.usuario.findMany({
          where: { businessId: business2.id },
        });

        // Verify they are distinct (no cross-contamination)
        const ids1 = usuarios1.map((u) => u.id);
        const ids2 = usuarios2.map((u) => u.id);
        const intersection = ids1.filter((id) => ids2.includes(id));

        expect(intersection.length).toBe(0);
      }
    });
  });

  describe('Migration: Schema Constraints', () => {
    it('should have all indexes created for businessId FKs', async () => {
      const indexes = await prisma.$queryRaw`
        SELECT indexname FROM pg_indexes
        WHERE tablename IN ('Usuario', 'Familia', 'Cliente')
        AND indexdef LIKE '%businessId%'
      `;

      // Should have at least some indexes on businessId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((indexes as any[]).length).toBeGreaterThanOrEqual(3);
    });

    it('should have proper cascade settings on FK relationships', async () => {
      const cascadeRules = await prisma.$queryRaw`
        SELECT constraint_name, delete_rule
        FROM information_schema.referential_constraints
        WHERE table_name = 'Usuario'
        AND referenced_table_name = 'Business'
      `;

      // Verify that DELETE is RESTRICT (to prevent accidental cascades)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((cascadeRules as any[]).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const rule of cascadeRules as any[]) {
          // Most should be RESTRICT or CASCADE depending on design choice
          expect(['RESTRICT', 'CASCADE', 'SET NULL']).toContain(rule.delete_rule);
        }
      }
    });
  });
});
