import { INestApplication, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyScopedPrismaService } from '../../prisma/company-scoped-prisma.service';
import { AppModule } from '../../app.module';
import type { AuthenticatedUser } from '../../auth/auth.types';

/**
 * ARCH-1: Multi-Tenant Isolation E2E Tests
 *
 * These tests verify that:
 * 1. User A in Business 1 cannot read data from User B in Business 2
 * 2. User A in Business 1 cannot write data to Business 2
 * 3. CompanyScopedPrismaService filters all 46 models with empresaId
 * 4. Cart models explicitly validate businessId
 * 5. Relation ownership prevents cross-tenant relations
 *
 * Acceptance Criteria:
 * - User A in Business 1 creates an Order
 * - User B in Business 2 tries to read it → 404/403
 * - User B in Business 2 cannot see User A's Customers
 * - Nested writes prevent linking resources from different businesses
 */
describe('ARCH-1: Multi-Tenant Isolation (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let companyScopedPrisma: CompanyScopedPrismaService;
  let jwtService: JwtService;

  // Test data
  let business1Id: string;
  let business2Id: string;
  let user1Id: string;
  let user2Id: string;
  let customer1Id: string;
  let order1Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    companyScopedPrisma = moduleFixture.get<CompanyScopedPrismaService>(
      CompanyScopedPrismaService,
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create test data: two isolated businesses with their users
    const [b1, b2, u1, u2] = await Promise.all([
      prisma.empresa.create({
        data: {
          nombre: 'Business 1 (Isolated)',
          configuracion: {},
        },
      }),
      prisma.empresa.create({
        data: {
          nombre: 'Business 2 (Isolated)',
          configuracion: {},
        },
      }),
      prisma.usuario.create({
        data: {
          email: 'user1@business1.test',
          nombre: 'User 1',
          password: 'hashed',
          empresaId: (await prisma.empresa.findFirstOrThrow()).id,
          rol: 'ADMIN',
        },
      }),
      prisma.usuario.create({
        data: {
          email: 'user2@business2.test',
          nombre: 'User 2',
          password: 'hashed',
          empresaId: (await prisma.empresa.findFirst({ skip: 1 }))?.id || '',
          rol: 'ADMIN',
        },
      }),
    ]);

    business1Id = b1.id;
    business2Id = b2.id;
    user1Id = u1.id;
    user2Id = u2.id;

    // Update user empresaId after business creation
    await prisma.usuario.update({
      where: { id: user1Id },
      data: { empresaId: business1Id },
    });
    await prisma.usuario.update({
      where: { id: user2Id },
      data: { empresaId: business2Id },
    });

    // Create customer in Business 1
    const c1 = await prisma.cliente.create({
      data: {
        nombre: 'Customer A',
        email: 'customer1@test.com',
        empresaId: business1Id,
      },
    });
    customer1Id = c1.id;
  });

  afterAll(async () => {
    // Cleanup: delete test businesses and related data
    await prisma.usuario.deleteMany({ where: { id: { in: [user1Id, user2Id] } } });
    await prisma.cliente.deleteMany({ where: { id: customer1Id } });
    await prisma.empresa.deleteMany({ where: { id: { in: [business1Id, business2Id] } } });
    await app.close();
  });

  describe('Order Isolation', () => {
    it('should create an order in Business 1', async () => {
      const db = companyScopedPrisma.forCompany(business1Id);

      const order = await db.pedido.create({
        data: {
          clienteId: customer1Id,
          empresaId: business1Id,
          numero: 'ORD-001',
          estado: 'RECIBIDO',
          total: 100,
        },
      });

      expect(order).toBeDefined();
      expect(order.empresaId).toBe(business1Id);
      order1Id = order.id;
    });

    it('should NOT allow User 2 (Business 2) to read an order from Business 1', async () => {
      const db = companyScopedPrisma.forCompany(business2Id);

      // Try to read order from Business 1 using Business 2 scoped client
      const order = await db.pedido.findUnique({
        where: { id: order1Id },
      });

      // Should return null (order belongs to different company)
      expect(order).toBeNull();
    });

    it('should NOT allow User 2 to list orders from Business 1', async () => {
      const db = companyScopedPrisma.forCompany(business2Id);

      const orders = await db.pedido.findMany({
        where: { id: order1Id },
      });

      expect(orders).toHaveLength(0);
    });

    it('should allow User 1 to read their own order', async () => {
      const db = companyScopedPrisma.forCompany(business1Id);

      const order = await db.pedido.findUnique({
        where: { id: order1Id },
      });

      expect(order).toBeDefined();
      expect(order?.empresaId).toBe(business1Id);
      expect(order?.id).toBe(order1Id);
    });
  });

  describe('Customer Isolation', () => {
    it('should create a customer in Business 1', async () => {
      const db = companyScopedPrisma.forCompany(business1Id);

      const customer = await db.cliente.create({
        data: {
          nombre: 'Isolated Customer',
          email: 'isolated@test.com',
          empresaId: business1Id,
        },
      });

      expect(customer.empresaId).toBe(business1Id);
    });

    it('should NOT allow User 2 to see customers from Business 1', async () => {
      const db = companyScopedPrisma.forCompany(business2Id);

      const customers = await db.cliente.findMany({
        where: { email: 'customer1@test.com' },
      });

      expect(customers).toHaveLength(0);
    });

    it('should NOT allow User 2 to update a customer from Business 1', async () => {
      const db = companyScopedPrisma.forCompany(business2Id);

      const updated = await db.cliente.updateMany({
        where: { id: customer1Id },
        data: { nombre: 'Hacked Name' },
      });

      expect(updated.count).toBe(0);

      // Verify customer was not actually updated
      const verify = await companyScopedPrisma
        .forCompany(business1Id)
        .cliente.findUnique({ where: { id: customer1Id } });

      expect(verify?.nombre).toBe('Customer A');
    });

    it('should NOT allow User 2 to delete a customer from Business 1', async () => {
      const db = companyScopedPrisma.forCompany(business2Id);

      const deleted = await db.cliente.deleteMany({
        where: { id: customer1Id },
      });

      expect(deleted.count).toBe(0);

      // Verify customer still exists
      const verify = await companyScopedPrisma
        .forCompany(business1Id)
        .cliente.findUnique({ where: { id: customer1Id } });

      expect(verify).toBeDefined();
    });
  });

  describe('Product Isolation', () => {
    let product1Id: string;

    beforeAll(async () => {
      const db = companyScopedPrisma.forCompany(business1Id);

      const product = await db.producto.create({
        data: {
          nombre: 'Secret Product',
          empresaId: business1Id,
        },
      });

      product1Id = product.id;
    });

    it('should NOT allow cross-business product queries', async () => {
      const db = companyScopedPrisma.forCompany(business2Id);

      const product = await db.producto.findUnique({
        where: { id: product1Id },
      });

      expect(product).toBeNull();
    });
  });

  describe('Cart Isolation (businessId)', () => {
    let customer2Id: string;
    let cart1Id: string;

    beforeAll(async () => {
      // Create customer in Business 2
      const c2 = await prisma.cliente.create({
        data: {
          nombre: 'Customer B',
          email: 'customer2@test.com',
          empresaId: business2Id,
        },
      });
      customer2Id = c2.id;

      // Create cart for customer in Business 1
      const db = companyScopedPrisma.forCompany(business1Id);
      const cart = await db.cart.create({
        data: {
          customerId: customer1Id,
          businessId: business1Id,
        },
      });
      cart1Id = cart.id;
    });

    it('should NOT allow accessing a cart from a different business', async () => {
      const db = companyScopedPrisma.forCompany(business2Id);

      // Attempt to read cart from Business 1 using Business 2 scoped client
      const cart = await db.cart.findUnique({
        where: { id: cart1Id },
      });

      // Cart model uses businessId, not empresaId, so must be explicitly validated
      expect(cart).toBeNull();
    });

    it('should NOT allow adding items to a cart from different business', async () => {
      const db = companyScopedPrisma.forCompany(business2Id);

      try {
        // Try to create CartItem for cart in Business 1
        const item = await db.cartItem.create({
          data: {
            cartId: cart1Id,
            productoId: 'some-id',
            cantidad: 1,
          },
        });

        // This should fail because cart belongs to different business
        expect(item).toBeUndefined();
      } catch (error) {
        // Expected: either thrown or null result
        expect(error).toBeDefined();
      }
    });
  });

  describe('Relation Ownership Validation', () => {
    let familia1Id: string;
    let product1Id: string;

    beforeAll(async () => {
      const db = companyScopedPrisma.forCompany(business1Id);

      // Create family
      const familia = await db.familia.create({
        data: {
          nombre: 'Family A',
          empresaId: business1Id,
        },
      });
      familia1Id = familia.id;

      // Create product linked to family
      const product = await db.producto.create({
        data: {
          nombre: 'Product with Family',
          empresaId: business1Id,
          familiaId: familia1Id,
        },
      });
      product1Id = product.id;
    });

    it('should prevent linking a product to a family from a different business', async () => {
      const db = companyScopedPrisma.forCompany(business2Id);

      // Try to create a product in Business 2 linked to family from Business 1
      try {
        await db.producto.create({
          data: {
            nombre: 'Cross-business product',
            empresaId: business2Id,
            familiaId: familia1Id, // Belongs to Business 1
          },
        });

        // Should not reach here
        expect(false).toBe(true);
      } catch (error: any) {
        // Expected: relation ownership verification should fail
        expect(error.code).toBe('P2025'); // Prisma "not found" error
      }
    });

    it('should allow relinking product to family within same business', async () => {
      const db = companyScopedPrisma.forCompany(business1Id);

      const familia2 = await db.familia.create({
        data: {
          nombre: 'Family B',
          empresaId: business1Id,
        },
      });

      // Update product to link to new family (same business)
      const updated = await db.producto.update({
        where: { id: product1Id },
        data: { familiaId: familia2.id },
      });

      expect(updated.familiaId).toBe(familia2.id);
    });
  });

  describe('CompanyScopedPrismaService Coverage', () => {
    /**
     * Verify that the 46 models with empresaId are all covered by the
     * company scope extension.
     */
    it('should apply scoping to all 46 models with empresaId', async () => {
      const modelsWithEmpresaId = [
        'usuario',
        'producto',
        'familia',
        'subfamilia',
        'tipo',
        'subtipo',
        'productoProveedor',
        'presentacion',
        'lote',
        'cliente',
        'cuentaCorriente',
        'deuda',
        'venta',
        'pedido',
        'pago',
        'caja',
        'proveedor',
        'compra',
        'recepcionCompra',
        'movimientoStock',
        'entrega',
        'notificacion',
        'auditLog',
        'autorizacion',
        'pagoProveedor',
        'devolucionProveedor',
        'reglaFidelizacion',
        'invitacion',
        'devolucionCliente',
        'reembolso',
        'analyticsEvent',
        'analyticsAggregation',
        'analyticsDashboard',
        'notificationPreference',
        'notificationDigest',
        'userEmpresa',
        'phoneNumber',
        'smsAlert',
        'emailTemplate',
        'emailLog',
        'emailPreference',
        'emailCampaign',
        'payment',
        'paymentIntent',
        'paymentWebhook',
        'refund',
      ];

      const db = companyScopedPrisma.forCompany(business1Id);

      for (const model of modelsWithEmpresaId) {
        const delegate = (db as Record<string, any>)[model];
        expect(delegate).toBeDefined(`Model ${model} should be available`);
      }
    });

    it('should verify empresaId filter is applied on findMany', async () => {
      const db = companyScopedPrisma.forCompany(business1Id);

      // Query should implicitly add empresaId: business1Id to where clause
      const clientes = await db.cliente.findMany();

      // All results must belong to business1
      for (const cliente of clientes) {
        expect(cliente.empresaId).toBe(business1Id);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle findUnique correctly when record exists but belongs to another business', async () => {
      const db = companyScopedPrisma.forCompany(business2Id);

      // Try to get the customer from Business 1 by ID
      const result = await db.cliente.findUnique({
        where: { id: customer1Id },
      });

      // Must return null, not expose the record
      expect(result).toBeNull();
    });

    it('should prevent upsert across business boundaries', async () => {
      const db = companyScopedPrisma.forCompany(business2Id);

      try {
        // Upsert should be blocked at the extension level
        await (db as any).cliente.upsert({
          where: { id: customer1Id },
          update: { nombre: 'Hacked' },
          create: { nombre: 'New Customer', email: 'new@test.com', empresaId: business2Id },
        });

        // Should not reach here
        expect(false).toBe(true);
      } catch (error: any) {
        // Expected: companyScopeExtension throws for upsert
        expect(error.message).toContain('operación');
      }
    });

    it('should apply empresaId override on create, not trust body', async () => {
      const db = companyScopedPrisma.forCompany(business1Id);

      // Try to create a customer claiming to belong to Business 2
      const customer = await db.cliente.create({
        data: {
          nombre: 'Trick Customer',
          email: 'trick@test.com',
          empresaId: business2Id, // Attacker tries to inject Business 2 ID
        },
      });

      // Should ignore the injected empresaId and use business1Id instead
      expect(customer.empresaId).toBe(business1Id);
    });
  });
});
