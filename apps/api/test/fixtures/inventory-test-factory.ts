/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Inventory Test Factory
 *
 * Provides reproducible, isolated test data for inventory tests.
 * Each test gets a unique company namespace to prevent data collisions.
 *
 * Pattern:
 * ```typescript
 * const factory = new InventoryTestFactory(prisma);
 * const { testCompanyId, testProductId, cleanup } = await factory.setupBasicInventory();
 *
 * // Run tests
 * await cleanup();
 * ```
 */

import { PrismaService } from '../../src/prisma/prisma.service';

interface InventoryTestSetup {
  testCompanyId: string;
  testProductId: string;
  cleanup: () => Promise<void>;
}

export class InventoryTestFactory {
  private prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  /**
   * Generate a unique test company ID namespace
   * Avoids collisions between parallel test runs
   */
  private generateTestNamespace(): string {
    // Format: "test-<timestamp>-<random>"
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  /**
   * Setup basic inventory hierarchy for a test
   * Creates: Empresa → Familia → Subfamilia → Tipo → Subtipo → Producto
   *
   * Returns:
   * - testCompanyId: Unique company ID for this test
   * - testProductId: Product ready for stock operations
   * - cleanup: Function to delete all test data (safe to call multiple times)
   */
  async setupBasicInventory(): Promise<InventoryTestSetup> {
    const namespace = this.generateTestNamespace();
    const testCompanyId = namespace;

    // Create company
    const empresa = await this.prisma.empresa.create({
      data: {
        id: testCompanyId,
        nombre: `F1 Test Empresa ${namespace}`,
        slug: `f1-test-${namespace}`,
        configuracion: {},
      },
    });

    // Create category hierarchy
    const familia = await this.prisma.familia.create({
      data: {
        empresaId: empresa.id,
        nombre: `F1 Test Familia ${namespace}`,
        prefijo: 'F1T',
        activo: true,
      },
    });

    const subfamilia = await this.prisma.subfamilia.create({
      data: {
        empresaId: empresa.id,
        familiaId: familia.id,
        nombre: `F1 Test Subfamilia ${namespace}`,
        prefijo: 'F1S',
        activo: true,
      },
    });

    const tipo = await this.prisma.tipo.create({
      data: {
        empresaId: empresa.id,
        subfamiliaId: subfamilia.id,
        nombre: `F1 Test Tipo ${namespace}`,
        prefijo: 'F1P',
        activo: true,
      },
    });

    const subtipo = await this.prisma.subtipo.create({
      data: {
        empresaId: empresa.id,
        tipoId: tipo.id,
        nombre: `F1 Test Subtipo ${namespace}`,
        prefijo: 'F1B',
        activo: true,
      },
    });

    // Create product
    const producto = await this.prisma.producto.create({
      data: {
        empresaId: empresa.id,
        familiaId: familia.id,
        subfamiliaId: subfamilia.id,
        tipoId: tipo.id,
        subtipoId: subtipo.id,
        nombre: `F1 Test Product ${namespace}`,
        codigoInterno: `F1-TEST-${namespace}`,
        precioMinorista: 100,
        costo: 50,
        stockMinimo: 0,
        unidadBase: 'UNIDAD',
        activo: true,
      },
    });

    // Cleanup function: delete all data created for this test
    // Safe to call multiple times (no errors if already deleted)
    const cleanup = async () => {
      try {
        // Delete in reverse dependency order
        await this.prisma.movimientoStock.deleteMany({ where: { empresaId: testCompanyId } });
        await this.prisma.lote.deleteMany({ where: { empresaId: testCompanyId } });
        await this.prisma.producto.deleteMany({ where: { empresaId: testCompanyId } });
        await this.prisma.subtipo.deleteMany({ where: { empresaId: testCompanyId } });
        await this.prisma.tipo.deleteMany({ where: { empresaId: testCompanyId } });
        await this.prisma.subfamilia.deleteMany({ where: { empresaId: testCompanyId } });
        await this.prisma.familia.deleteMany({ where: { empresaId: testCompanyId } });
        await this.prisma.empresa.deleteMany({ where: { id: testCompanyId } });
      } catch (_e) {
        // Silently ignore errors (e.g., if already deleted or constraints violated)
        // This ensures afterAll cleanup doesn't fail the test
      }
    };

    return {
      testCompanyId: empresa.id,
      testProductId: producto.id,
      cleanup,
    };
  }
}
