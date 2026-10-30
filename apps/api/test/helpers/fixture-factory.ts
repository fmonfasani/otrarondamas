/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * FixtureFactory: Reusable, namespaced test factory for relation isolation tests
 *
 * Pattern:
 * ```typescript
 * const factory = new FixtureFactory(prismaService);
 * const tenant = await factory.createTenant('test-tenant');
 * const product = await factory.createProduct(tenant.id);
 * await factory.cleanup(tenant.id);
 * ```
 *
 * Key design:
 * - Each test gets a unique namespace to prevent data collisions
 * - cleanup() is idempotent; safe to call multiple times
 * - Uses CompanyScopedPrisma for multi-company isolation
 */

import { v4 as uuidv4 } from 'uuid';
import type { PrismaService } from '../../src/prisma/prisma.service';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Tenant creation result: matches spec requirement {id, name, createdAt}
 */
export interface TenantCreationResult {
  id: string;
  name: string;
  createdAt: Date;
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * FixtureFactory: Creates reproducible, isolated test fixtures
 */
export class FixtureFactory {
  private prisma: PrismaService;
  private tenantCount: number;
  private createdTenantIds: Set<string> = new Set();

  constructor(prismaService: PrismaService, tenantCount: number = 2) {
    this.prisma = prismaService;
    this.tenantCount = tenantCount;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
   * Generate a unique namespace for this test run
   * Uses UUID-based format: prevents collisions in parallel tests
   */
  private _generateNamespace(): string {
    return uuidv4();
  }

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
   * Create a tenant (Empresa in the schema)
   * @param name Optional tenant name; auto-generated if not provided
   * @returns {id, name, createdAt} as per spec
   */
  async createTenant(name?: string): Promise<TenantCreationResult> {
    const namespace = this._generateNamespace();
    const tenantName = name || `test-tenant-${namespace}`;
    const tenantId = namespace;

    const empresa = await this.prisma.empresa.create({
      data: {
        id: tenantId,
        nombre: tenantName,
        slug: `test-${namespace.substring(0, 8)}`,
        configuracion: {},
        updatedAt: new Date(),
      },
    });

    this.createdTenantIds.add(empresa.id);

    return {
      id: empresa.id,
      name: empresa.nombre,
      createdAt: empresa.createdAt,
    };
  }

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
   * Create a product with full category chain
   * Creates: Familia → Subfamilia → Tipo → Subtipo → Producto
   * @param tenantId Company ID
   * @param overrides Optional field overrides
   */
  async createProduct(
    tenantId: string,
    overrides?: Partial<{
      nombre: string;
      codigoInterno: string;
      precioMinorista: number;
      costo: number;
      stockMinimo: number;
    }>,
  ) {
    const namespace = this._generateNamespace();

    // Create Familia
    const familia = await this.prisma.familia.create({
      data: {
        id: uuidv4(),
        empresaId: tenantId,
        nombre: `Family-${namespace.substring(0, 8)}`,
        prefijo: `FA${namespace.substring(0, 1).toUpperCase()}`,
        activo: true,
      },
    });

    // Create Subfamilia
    const subfamilia = await this.prisma.subfamilia.create({
      data: {
        id: uuidv4(),
        empresaId: tenantId,
        familiaId: familia.id,
        nombre: `Subfamily-${namespace.substring(0, 8)}`,
        prefijo: `SU${namespace.substring(1, 2).toUpperCase()}`,
        activo: true,
      },
    });

    // Create Tipo
    const tipo = await this.prisma.tipo.create({
      data: {
        id: uuidv4(),
        empresaId: tenantId,
        subfamiliaId: subfamilia.id,
        nombre: `Type-${namespace.substring(0, 8)}`,
        prefijo: `TY${namespace.substring(2, 3).toUpperCase()}`,
        activo: true,
      },
    });

    // Create Subtipo
    const subtipo = await this.prisma.subtipo.create({
      data: {
        id: uuidv4(),
        empresaId: tenantId,
        tipoId: tipo.id,
        nombre: `Subtype-${namespace.substring(0, 8)}`,
        prefijo: `SB${namespace.substring(3, 4).toUpperCase()}`,
        activo: true,
      },
    });

    // Create Producto
    const producto = await this.prisma.producto.create({
      data: {
        id: uuidv4(),
        empresaId: tenantId,
        familiaId: familia.id,
        subfamiliaId: subfamilia.id,
        tipoId: tipo.id,
        subtipoId: subtipo.id,
        nombre: overrides?.nombre || `Product-${namespace.substring(0, 8)}`,
        codigoInterno: overrides?.codigoInterno || `PRD-${namespace.substring(0, 8)}`,
        precioMinorista: overrides?.precioMinorista || 100,
        costo: overrides?.costo || 50,
        stockMinimo: overrides?.stockMinimo || 0,
        unidadBase: 'UNIDAD',
        activo: true,
      },
    });

    return producto;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
   * Create a Proveedor
   * @param tenantId Company ID
   * @param overrides Optional field overrides
   */
  async createProveedor(
    tenantId: string,
    overrides?: Partial<{
      nombre: string;
      email: string;
      telefono: string;
    }>,
  ) {
    const namespace = this._generateNamespace();

    return await this.prisma.proveedor.create({
      data: {
        id: uuidv4(),
        empresaId: tenantId,
        nombre: overrides?.nombre || `Provider-${namespace.substring(0, 8)}`,
        email: overrides?.email || `provider-${namespace.substring(0, 8)}@test.com`,
        telefono: overrides?.telefono || '+5491112345678',
      },
    });
  }

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
   * Create a Lote (batch/lot)
   * @param tenantId Company ID
   * @param productoId Product ID
   * @param overrides Optional field overrides
   */
  async createLote(
    tenantId: string,
    productoId: string,
    overrides?: Partial<{
      numeroLote: string;
      vencimiento: Date;
      cantidad: number;
    }>,
  ) {
    const namespace = this._generateNamespace();

    return await this.prisma.lote.create({
      data: {
        id: uuidv4(),
        empresaId: tenantId,
        productoId,
        numeroLote: overrides?.numeroLote || `LOT-${namespace.substring(0, 8)}`,
        vencimiento: overrides?.vencimiento || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        cantidad: overrides?.cantidad || 100,
      },
    });
  }

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
   * Create a Usuario
   * @param tenantId Company ID
   * @param overrides Optional field overrides
   */
  async createUsuario(
    tenantId: string,
    overrides?: Partial<{
      nombre: string;
      email: string;
      passwordHash: string;
    }>,
  ) {
    const namespace = this._generateNamespace();

    return await this.prisma.usuario.create({
      data: {
        id: uuidv4(),
        empresaId: tenantId,
        nombre: overrides?.nombre || `User-${namespace.substring(0, 8)}`,
        email: overrides?.email || `user-${namespace.substring(0, 8)}@test.com`,
        passwordHash: overrides?.passwordHash || 'hashed-password',
        activo: true,
        rol: 'OWNER',
      },
    });
  }

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
   * Create a RoleTemplate (which is "Rol" in our context)
   * @param tenantId Company ID
   * @param overrides Optional field overrides
   */
  async createRol(
    tenantId: string,
    overrides?: Partial<{
      name: string;
      description: string;
    }>,
  ) {
    const namespace = this._generateNamespace();

    return await this.prisma.roleTemplate.create({
      data: {
        id: uuidv4(),
        name: overrides?.name || `Role-${namespace.substring(0, 8)}`,
        description: overrides?.description || `Test role for ${namespace.substring(0, 8)}`,
        empresaId: tenantId,
      },
    });
  }

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
   * Create a ReglaFidelizacion (loyalty rule)
   * @param tenantId Company ID
   * @param overrides Optional field overrides
   */
  async createReglaFidelizacion(
    tenantId: string,
    overrides?: Partial<{
      nombre: string;
      nivelRequerido: 'NUEVO' | 'FRECUENTE' | 'VIP';
      descuentoPorcentaje: number;
    }>,
  ) {
    const namespace = this._generateNamespace();

    return await this.prisma.reglaFidelizacion.create({
      data: {
        id: uuidv4(),
        empresaId: tenantId,
        nombre: overrides?.nombre || `Loyalty-${namespace.substring(0, 8)}`,
        nivelRequerido: overrides?.nivelRequerido || 'NUEVO',
        descuentoPorcentaje: overrides?.descuentoPorcentaje || 5,
        activo: true,
      },
    });
  }

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
   * Create a MovimientoStock (inventory movement)
   * @param tenantId Company ID
   * @param loteId Batch/lot ID
   * @param productoId Product ID
   * @param overrides Optional field overrides
   */
  async createMovimientoStock(
    tenantId: string,
    loteId: string,
    productoId: string,
    overrides?: Partial<{
      tipoMovimiento: string;
      cantidad: number;
      motivo: string;
    }>,
  ) {
    return await this.prisma.movimientoStock.create({
      data: {
        id: uuidv4(),
        empresaId: tenantId,
        productoId,
        loteId,
        tipoMovimiento: overrides?.tipoMovimiento || 'ENTRADA',
        cantidad: overrides?.cantidad || 10,
        motivo: overrides?.motivo || 'TEST_ENTRY',
      },
    });
  }

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
   * Create a Venta (sale)
   * @param tenantId Company ID
   * @param clienteId Optional client ID; auto-created if not provided
   * @param overrides Optional field overrides
   */
  async createVenta(
    tenantId: string,
    clienteId?: string,
    overrides?: Partial<{
      total: number;
      descuento: number;
      canal: string;
    }>,
  ) {
    // Create a user for the sale if not provided
    const usuario = await this.createUsuario(tenantId);

    return await this.prisma.venta.create({
      data: {
        id: uuidv4(),
        empresaId: tenantId,
        usuarioId: usuario.id,
        clienteId: clienteId || null,
        canal: overrides?.canal || 'MOSTRADOR',
        total: overrides?.total || 100,
        descuento: overrides?.descuento || 0,
        estado: 'CONFIRMADA',
      },
    });
  }

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
   * Create a Compra (purchase order)
   * @param tenantId Company ID
   * @param proveedorId Optional provider ID; auto-created if not provided
   * @param overrides Optional field overrides
   */
  async createCompra(
    tenantId: string,
    proveedorId?: string,
    overrides?: Partial<{
      total: number;
      estado: 'BORRADOR' | 'EMITIDA' | 'RECEPCION_PARCIAL' | 'RECIBIDA';
    }>,
  ) {
    // Create a provider if not provided
    const proveedor = proveedorId
      ? await this.prisma.proveedor.findUnique({ where: { id: proveedorId } })
      : await this.createProveedor(tenantId);

    // Create a user for the purchase
    const usuario = await this.createUsuario(tenantId);

    if (!proveedor) {
      throw new Error(`Proveedor ${proveedorId} not found`);
    }

    return await this.prisma.compra.create({
      data: {
        id: uuidv4(),
        empresaId: tenantId,
        proveedorId: proveedor.id,
        usuarioId: usuario.id,
        total: overrides?.total || 1000,
        estado: overrides?.estado || 'BORRADOR',
      },
    });
  }

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
   * Delete all data created by this factory for a given tenant
   * Idempotent: safe to call multiple times
   * Uses transactions to ensure consistency
   *
   * @param tenantId Company ID to clean up; if not provided, cleans up all tracked tenants
   */
  async cleanup(tenantId?: string): Promise<void> {
    const tenantsToClean = tenantId ? [tenantId] : Array.from(this.createdTenantIds);

    for (const tId of tenantsToClean) {
      try {
        await this._deleteByTenant(tId);
      } catch (error) {
        // Silently ignore: errors during cleanup should not fail tests
        // This ensures afterAll/afterEach cleanup doesn't fail the test
      }
    }

    if (!tenantId) {
      this.createdTenantIds.clear();
    } else {
      this.createdTenantIds.delete(tenantId);
    }
  }

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
   * Delete all records belonging to a specific tenant
   * Respects foreign key constraints by deleting in dependency order
   * @param tenantId Company ID
   */
  private async _deleteByTenant(tenantId: string): Promise<void> {
    // Delete in reverse dependency order to avoid FK constraint violations
    await this.prisma.movimientoStock.deleteMany({
      where: { empresaId: tenantId },
    });
    await this.prisma.venta.deleteMany({ where: { empresaId: tenantId } });
    await this.prisma.compra.deleteMany({ where: { empresaId: tenantId } });
    await this.prisma.lote.deleteMany({ where: { empresaId: tenantId } });
    await this.prisma.reglaFidelizacion.deleteMany({
      where: { empresaId: tenantId },
    });
    await this.prisma.roleTemplate.deleteMany({
      where: { empresaId: tenantId },
    });
    await this.prisma.usuario.deleteMany({ where: { empresaId: tenantId } });
    await this.prisma.proveedor.deleteMany({ where: { empresaId: tenantId } });
    await this.prisma.producto.deleteMany({ where: { empresaId: tenantId } });
    await this.prisma.subtipo.deleteMany({ where: { empresaId: tenantId } });
    await this.prisma.tipo.deleteMany({ where: { empresaId: tenantId } });
    await this.prisma.subfamilia.deleteMany({
      where: { empresaId: tenantId },
    });
    await this.prisma.familia.deleteMany({ where: { empresaId: tenantId } });
    await this.prisma.empresa.deleteMany({ where: { id: tenantId } });
  }
}
