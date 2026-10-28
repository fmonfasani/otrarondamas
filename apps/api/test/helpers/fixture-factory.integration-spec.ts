/**
 * FixtureFactory Specification Tests
 *
 * Validates factory behavior:
 * - Tenant creation with unique IDs
 * - Product hierarchy creation (Familia → Subfamilia → Tipo → Subtipo → Producto)
 * - Namespace isolation prevents data conflicts
 * - Cleanup removes all tenant data idempotently
 * - FK relationships are preserved
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import { FixtureFactory } from './fixture-factory';

describe('FixtureFactory', () => {
  let prismaService: PrismaService;
  let factory: FixtureFactory;

  beforeAll(async () => {
    // Initialize test environment
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
  });

  beforeEach(() => {
    // Create a fresh factory for each test
    factory = new FixtureFactory(prismaService, 2);
  });

  afterEach(async () => {
    // Cleanup after each test (idempotent)
    await factory.cleanup();
  });

  afterAll(async () => {
    // Close Prisma connection
    await prismaService.$disconnect();
  });

  describe('createTenant()', () => {
    it('creates tenant with unique ID', async () => {
      const tenant = await factory.createTenant();

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBeDefined();
      expect(tenant.createdAt).toBeDefined();
      expect(tenant.id).toMatch(/^[0-9a-f-]+$/i); // UUID format

      // Verify it exists in database
      const found = await prismaService.empresa.findUnique({
        where: { id: tenant.id },
      });
      expect(found).toBeDefined();
      expect(found.nombre).toBe(tenant.name);
    });

    it('creates tenant with optional custom name', async () => {
      const customName = 'My Test Tenant';
      const tenant = await factory.createTenant(customName);

      expect(tenant.name).toBe(customName);

      const found = await prismaService.empresa.findUnique({
        where: { id: tenant.id },
      });
      expect(found.nombre).toBe(customName);
    });

    it('generates unique IDs across multiple tenant creations', async () => {
      const tenant1 = await factory.createTenant();
      const tenant2 = await factory.createTenant();

      expect(tenant1.id).not.toBe(tenant2.id);
      expect(tenant1.name).not.toBe(tenant2.name);
    });
  });

  describe('createProduct()', () => {
    it('creates product with full category chain', async () => {
      const tenant = await factory.createTenant();
      const product = await factory.createProduct(tenant.id);

      expect(product.id).toBeDefined();
      expect(product.empresaId).toBe(tenant.id);
      expect(product.familiaId).toBeDefined();
      expect(product.subfamiliaId).toBeDefined();
      expect(product.tipoId).toBeDefined();
      expect(product.subtipoId).toBeDefined();

      // Verify all hierarchy levels exist
      const familia = await prismaService.familia.findUnique({
        where: { id: product.familiaId },
      });
      expect(familia).toBeDefined();
      expect(familia.empresaId).toBe(tenant.id);

      const subfamilia = await prismaService.subfamilia.findUnique({
        where: { id: product.subfamiliaId },
      });
      expect(subfamilia).toBeDefined();
      expect(subfamilia.empresaId).toBe(tenant.id);
      expect(subfamilia.familiaId).toBe(product.familiaId);

      const tipo = await prismaService.tipo.findUnique({
        where: { id: product.tipoId },
      });
      expect(tipo).toBeDefined();
      expect(tipo.empresaId).toBe(tenant.id);

      const subtipo = await prismaService.subtipo.findUnique({
        where: { id: product.subtipoId },
      });
      expect(subtipo).toBeDefined();
      expect(subtipo.empresaId).toBe(tenant.id);
      expect(subtipo.tipoId).toBe(product.tipoId);
    });

    it('accepts field overrides', async () => {
      const tenant = await factory.createTenant();
      const overrides = {
        nombre: 'Custom Product Name',
        codigoInterno: 'CUSTOM-123',
        precioMinorista: 250,
        costo: 125,
      };

      const product = await factory.createProduct(tenant.id, overrides);

      expect(product.nombre).toBe(overrides.nombre);
      expect(product.codigoInterno).toBe(overrides.codigoInterno);
      expect(product.precioMinorista.toNumber()).toBe(overrides.precioMinorista);
      expect(product.costo.toNumber()).toBe(overrides.costo);
    });
  });

  describe('createProveedor()', () => {
    it('creates provider with required fields', async () => {
      const tenant = await factory.createTenant();
      const proveedor = await factory.createProveedor(tenant.id);

      expect(proveedor.id).toBeDefined();
      expect(proveedor.empresaId).toBe(tenant.id);
      expect(proveedor.nombre).toBeDefined();
      expect(proveedor.email).toBeDefined();
      expect(proveedor.telefono).toBeDefined();
    });

    it('accepts field overrides', async () => {
      const tenant = await factory.createTenant();
      const overrides = {
        nombre: 'Acme Corp',
        email: 'contact@acme.com',
        telefono: '+5491234567890',
      };

      const proveedor = await factory.createProveedor(tenant.id, overrides);

      expect(proveedor.nombre).toBe(overrides.nombre);
      expect(proveedor.email).toBe(overrides.email);
      expect(proveedor.telefono).toBe(overrides.telefono);
    });
  });

  describe('createLote()', () => {
    it('creates batch/lot with required fields', async () => {
      const tenant = await factory.createTenant();
      const producto = await factory.createProduct(tenant.id);
      const lote = await factory.createLote(tenant.id, producto.id);

      expect(lote.id).toBeDefined();
      expect(lote.empresaId).toBe(tenant.id);
      expect(lote.productoId).toBe(producto.id);
      expect(lote.numeroLote).toBeDefined();
      expect(lote.vencimiento).toBeDefined();
      expect(lote.cantidad).toBeDefined();
    });

    it('accepts field overrides', async () => {
      const tenant = await factory.createTenant();
      const producto = await factory.createProduct(tenant.id);
      const customDate = new Date('2027-12-31');

      const lote = await factory.createLote(tenant.id, producto.id, {
        numeroLote: 'LOT-12345',
        vencimiento: customDate,
        cantidad: 500,
      });

      expect(lote.numeroLote).toBe('LOT-12345');
      expect(lote.vencimiento).toEqual(customDate);
      expect(lote.cantidad.toNumber()).toBe(500);
    });
  });

  describe('createUsuario()', () => {
    it('creates user with required fields', async () => {
      const tenant = await factory.createTenant();
      const usuario = await factory.createUsuario(tenant.id);

      expect(usuario.id).toBeDefined();
      expect(usuario.empresaId).toBe(tenant.id);
      expect(usuario.nombre).toBeDefined();
      expect(usuario.email).toBeDefined();
      expect(usuario.activo).toBe(true);
      expect(usuario.rol).toBe('OWNER');
    });

    it('accepts field overrides', async () => {
      const tenant = await factory.createTenant();
      const usuario = await factory.createUsuario(tenant.id, {
        nombre: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'custom-hash',
      });

      expect(usuario.nombre).toBe('John Doe');
      expect(usuario.email).toBe('john@example.com');
      expect(usuario.passwordHash).toBe('custom-hash');
    });
  });

  describe('createRol()', () => {
    it('creates role template with required fields', async () => {
      const tenant = await factory.createTenant();
      const rol = await factory.createRol(tenant.id);

      expect(rol.id).toBeDefined();
      expect(rol.empresaId).toBe(tenant.id);
      expect(rol.name).toBeDefined();
      expect(rol.description).toBeDefined();
    });

    it('accepts field overrides', async () => {
      const tenant = await factory.createTenant();
      const rol = await factory.createRol(tenant.id, {
        name: 'Custom Role',
        description: 'Custom role description',
      });

      expect(rol.name).toBe('Custom Role');
      expect(rol.description).toBe('Custom role description');
    });
  });

  describe('createReglaFidelizacion()', () => {
    it('creates loyalty rule with required fields', async () => {
      const tenant = await factory.createTenant();
      const regla = await factory.createReglaFidelizacion(tenant.id);

      expect(regla.id).toBeDefined();
      expect(regla.empresaId).toBe(tenant.id);
      expect(regla.nombre).toBeDefined();
      expect(regla.nivelRequerido).toBeDefined();
      expect(regla.descuentoPorcentaje).toBeDefined();
      expect(regla.activo).toBe(true);
    });

    it('accepts field overrides', async () => {
      const tenant = await factory.createTenant();
      const regla = await factory.createReglaFidelizacion(tenant.id, {
        nombre: 'VIP Member Discount',
        nivelRequerido: 'VIP',
        descuentoPorcentaje: 15,
      });

      expect(regla.nombre).toBe('VIP Member Discount');
      expect(regla.nivelRequerido).toBe('VIP');
      expect(regla.descuentoPorcentaje.toNumber()).toBe(15);
    });
  });

  describe('createMovimientoStock()', () => {
    it('creates inventory movement with required fields', async () => {
      const tenant = await factory.createTenant();
      const producto = await factory.createProduct(tenant.id);
      const lote = await factory.createLote(tenant.id, producto.id);

      const movimiento = await factory.createMovimientoStock(tenant.id, lote.id, producto.id);

      expect(movimiento.id).toBeDefined();
      expect(movimiento.empresaId).toBe(tenant.id);
      expect(movimiento.productoId).toBe(producto.id);
      expect(movimiento.loteId).toBe(lote.id);
      expect(movimiento.tipoMovimiento).toBeDefined();
      expect(movimiento.cantidad).toBeDefined();
      expect(movimiento.motivo).toBeDefined();
    });

    it('accepts field overrides', async () => {
      const tenant = await factory.createTenant();
      const producto = await factory.createProduct(tenant.id);
      const lote = await factory.createLote(tenant.id, producto.id);

      const movimiento = await factory.createMovimientoStock(tenant.id, lote.id, producto.id, {
        tipoMovimiento: 'SALIDA',
        cantidad: 25,
        motivo: 'VENTA',
      });

      expect(movimiento.tipoMovimiento).toBe('SALIDA');
      expect(movimiento.cantidad.toNumber()).toBe(25);
      expect(movimiento.motivo).toBe('VENTA');
    });
  });

  describe('createVenta()', () => {
    it('creates sale with required fields', async () => {
      const tenant = await factory.createTenant();
      const venta = await factory.createVenta(tenant.id);

      expect(venta.id).toBeDefined();
      expect(venta.empresaId).toBe(tenant.id);
      expect(venta.usuarioId).toBeDefined();
      expect(venta.canal).toBe('MOSTRADOR');
      expect(venta.total).toBeDefined();
      expect(venta.estado).toBe('CONFIRMADA');
    });

    it('accepts field overrides', async () => {
      const tenant = await factory.createTenant();
      const venta = await factory.createVenta(tenant.id, null, {
        total: 500,
        descuento: 50,
        canal: 'DELIVERY',
      });

      expect(venta.total.toNumber()).toBe(500);
      expect(venta.descuento.toNumber()).toBe(50);
      expect(venta.canal).toBe('DELIVERY');
    });
  });

  describe('createCompra()', () => {
    it('creates purchase order with required fields', async () => {
      const tenant = await factory.createTenant();
      const compra = await factory.createCompra(tenant.id);

      expect(compra.id).toBeDefined();
      expect(compra.empresaId).toBe(tenant.id);
      expect(compra.proveedorId).toBeDefined();
      expect(compra.usuarioId).toBeDefined();
      expect(compra.estado).toBe('BORRADOR');
      expect(compra.total).toBeDefined();
    });

    it('accepts field overrides', async () => {
      const tenant = await factory.createTenant();
      const compra = await factory.createCompra(tenant.id, null, {
        total: 2500,
        estado: 'EMITIDA',
      });

      expect(compra.total.toNumber()).toBe(2500);
      expect(compra.estado).toBe('EMITIDA');
    });

    it('uses provided proveedor ID', async () => {
      const tenant = await factory.createTenant();
      const proveedor = await factory.createProveedor(tenant.id);
      const compra = await factory.createCompra(tenant.id, proveedor.id);

      expect(compra.proveedorId).toBe(proveedor.id);
    });
  });

  describe('cleanup()', () => {
    it('removes all tenant data', async () => {
      const tenant = await factory.createTenant();

      // Create related records
      const product = await factory.createProduct(tenant.id);
      const proveedor = await factory.createProveedor(tenant.id);
      const usuario = await factory.createUsuario(tenant.id);
      const lote = await factory.createLote(tenant.id, product.id);
      const regla = await factory.createReglaFidelizacion(tenant.id);

      // Verify they exist
      let empresaCount = await prismaService.empresa.count({
        where: { id: tenant.id },
      });
      expect(empresaCount).toBe(1);

      // Cleanup
      await factory.cleanup(tenant.id);

      // Verify all records are deleted
      empresaCount = await prismaService.empresa.count({
        where: { id: tenant.id },
      });
      expect(empresaCount).toBe(0);

      const productCount = await prismaService.producto.count({
        where: { empresaId: tenant.id },
      });
      expect(productCount).toBe(0);

      const usuarioCount = await prismaService.usuario.count({
        where: { empresaId: tenant.id },
      });
      expect(usuarioCount).toBe(0);

      const reglaCount = await prismaService.reglaFidelizacion.count({
        where: { empresaId: tenant.id },
      });
      expect(reglaCount).toBe(0);
    });

    it('is idempotent - safe to call multiple times', async () => {
      const tenant = await factory.createTenant();
      await factory.createProduct(tenant.id);

      // First cleanup
      await factory.cleanup(tenant.id);

      // Second cleanup should not throw
      await expect(factory.cleanup(tenant.id)).resolves.not.toThrow();

      // Third cleanup should also not throw
      await expect(factory.cleanup(tenant.id)).resolves.not.toThrow();
    });

    it('cleanup without tenant ID cleans all tracked tenants', async () => {
      const tenant1 = await factory.createTenant();
      const tenant2 = await factory.createTenant();

      await factory.createProduct(tenant1.id);
      await factory.createProduct(tenant2.id);

      // Cleanup all
      await factory.cleanup();

      const count1 = await prismaService.empresa.count({
        where: { id: tenant1.id },
      });
      const count2 = await prismaService.empresa.count({
        where: { id: tenant2.id },
      });

      expect(count1).toBe(0);
      expect(count2).toBe(0);
    });
  });

  describe('_generateNamespace()', () => {
    it('generates unique namespaces', () => {
      const ns1 = factory['_generateNamespace']();
      const ns2 = factory['_generateNamespace']();

      expect(ns1).not.toBe(ns2);
      expect(ns1).toMatch(/^[0-9a-f-]+$/i); // UUID format
      expect(ns2).toMatch(/^[0-9a-f-]+$/i);
    });

    it('namespace isolation prevents conflicts across test runs', async () => {
      const factory1 = new FixtureFactory(prismaService, 1);
      const factory2 = new FixtureFactory(prismaService, 1);

      const tenant1 = await factory1.createTenant();
      const tenant2 = await factory2.createTenant();

      // Different factory instances generate different namespaces
      expect(tenant1.id).not.toBe(tenant2.id);
      expect(tenant1.name).not.toBe(tenant2.name);

      // Cleanup
      await factory1.cleanup();
      await factory2.cleanup();
    });
  });

  describe('Performance', () => {
    it('creates product in < 100ms', async () => {
      const tenant = await factory.createTenant();

      const start = Date.now();
      await factory.createProduct(tenant.id);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it('cleanup completes in reasonable time', async () => {
      const tenant = await factory.createTenant();

      // Create multiple different records (not multiple products which would have FK conflicts)
      const factory1 = new FixtureFactory(prismaService, 1);
      const tenant1 = await factory1.createTenant();
      await factory1.createProduct(tenant1.id);
      await factory1.createProveedor(tenant1.id);
      await factory1.createUsuario(tenant1.id);
      await factory1.createLote(tenant1.id, (await factory1.createProduct(tenant1.id)).id);
      await factory1.createReglaFidelizacion(tenant1.id);

      const start = Date.now();
      await factory1.cleanup(tenant1.id);
      const elapsed = Date.now() - start;

      // Cleanup should be fast even with multiple records
      expect(elapsed).toBeLessThan(1000); // 1 second
    });
  });
});
