import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * C5B Phase 2: Cart API Integration Tests
 *
 * Tests the complete cart lifecycle:
 * - POST /cart — create/get cart for customer
 * - GET /cart/:id — retrieve cart with items
 * - POST /cart/:id/items — add items to cart
 * - PATCH /cart/:id/items/:itemId — update item quantity
 * - DELETE /cart/:id/items/:itemId — remove items
 *
 * No auth required (E2E uses anonymous checkout via customerId in body).
 * Uses TIENDA_EMPRESA_ID from env (single public store per deploy).
 */
describe('C5B Phase 2: Cart API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testCompanyId: string;
  let testCustomerId: string;
  let testProductId1: string;
  let testProductId2: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Setup: use TIENDA_EMPRESA_ID for public store
    testCompanyId = process.env.TIENDA_EMPRESA_ID || '22dc5550-be63-44bd-bad7-8b7da0b2c6ca';

    // Create test customer
    const customer = await prisma.cliente.create({
      data: {
        empresaId: testCompanyId,
        nombre: 'Cart Test Customer',
        email: `cart-test-${Date.now()}@example.com`,
      },
    });
    testCustomerId = customer.id;

    // Create test products with stock
    const familia = await prisma.familia.create({
      data: { empresaId: testCompanyId, nombre: `C5B Fam ${Date.now()}`, prefijo: 'C5B' },
    });

    const subfamilia = await prisma.subfamilia.create({
      data: {
        empresaId: testCompanyId,
        familiaId: familia.id,
        nombre: `C5B Sub ${Date.now()}`,
        prefijo: 'C5S',
      },
    });

    const tipo = await prisma.tipo.create({
      data: {
        empresaId: testCompanyId,
        subfamiliaId: subfamilia.id,
        nombre: `C5B Tipo ${Date.now()}`,
        prefijo: 'C5T',
      },
    });

    const subtipo = await prisma.subtipo.create({
      data: {
        empresaId: testCompanyId,
        tipoId: tipo.id,
        nombre: `C5B Subt ${Date.now()}`,
        prefijo: 'C5U',
      },
    });

    // Product 1: 100.00, 10% discount, 50 stock
    const prod1 = await prisma.producto.create({
      data: {
        empresaId: testCompanyId,
        familiaId: familia.id,
        subfamiliaId: subfamilia.id,
        tipoId: tipo.id,
        subtipoId: subtipo.id,
        nombre: 'C5B Product 1',
        codigoInterno: 'C5BP1',
        precioMinorista: '100.00',
        costo: '50.00',
        descuentoPorcentaje: '10',
        unidadBase: 'UNIDAD',
        activo: true,
      },
    });
    testProductId1 = prod1.id;

    await prisma.lote.create({
      data: {
        empresaId: testCompanyId,
        productoId: prod1.id,
        numeroLote: 'C5B-LOTE-1',
        cantidad: 50,
        vencimiento: new Date('2099-01-01'),
      },
    });

    // Product 2: 200.00, no discount, 100 stock
    const prod2 = await prisma.producto.create({
      data: {
        empresaId: testCompanyId,
        familiaId: familia.id,
        subfamiliaId: subfamilia.id,
        tipoId: tipo.id,
        subtipoId: subtipo.id,
        nombre: 'C5B Product 2',
        codigoInterno: 'C5BP2',
        precioMinorista: '200.00',
        costo: '100.00',
        unidadBase: 'UNIDAD',
        activo: true,
      },
    });
    testProductId2 = prod2.id;

    await prisma.lote.create({
      data: {
        empresaId: testCompanyId,
        productoId: prod2.id,
        numeroLote: 'C5B-LOTE-2',
        cantidad: 100,
        vencimiento: new Date('2099-01-01'),
      },
    });
  });

  afterAll(async () => {
    await prisma.cartItem.deleteMany({ where: { cart: { businessId: testCompanyId } } });
    await prisma.cart.deleteMany({ where: { businessId: testCompanyId } });
    await prisma.pedidoItem.deleteMany({ where: { pedido: { empresaId: testCompanyId } } });
    await prisma.pedido.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.lote.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.producto.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.cliente.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.subtipo.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.tipo.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.familia.deleteMany({ where: { empresaId: testCompanyId } });

    await app.close();
    await prisma.$disconnect();
  });

  describe('Cart Creation', () => {
    it('should create cart for customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/cart')
        .send({ customerId: testCustomerId })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.customerId).toBe(testCustomerId);
      expect(response.body.businessId).toBe(testCompanyId);
      expect(response.body.items).toEqual([]);
    });

    it('should return existing cart for same customer', async () => {
      const response1 = await request(app.getHttpServer())
        .post('/cart')
        .send({ customerId: testCustomerId })
        .expect(201);

      const cartId1 = response1.body.id;

      const response2 = await request(app.getHttpServer())
        .post('/cart')
        .send({ customerId: testCustomerId })
        .expect(201);

      expect(response2.body.id).toBe(cartId1);
      expect(response2.body.customerId).toBe(testCustomerId);
    });
  });

  describe('Cart Item Operations', () => {
    let cartId: string;
    let customerId: string;

    beforeEach(async () => {
      const customer = await prisma.cliente.create({
        data: {
          empresaId: testCompanyId,
          nombre: 'Cart Item Ops Customer',
          email: `cart-ops-${Date.now()}-${Math.random()}@example.com`,
        },
      });
      customerId = customer.id;

      const response = await request(app.getHttpServer())
        .post('/cart')
        .send({ customerId })
        .expect(201);
      cartId = response.body.id;
    });

    afterEach(async () => {
      await prisma.cartItem.deleteMany({ where: { cart: { customerId } } });
      await prisma.cart.deleteMany({ where: { customerId } });
      await prisma.cliente.delete({ where: { id: customerId } });
    });

    it('should add item to cart', async () => {
      const response = await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send({ productoId: testProductId1, cantidad: 5 })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.cartId).toBe(cartId);
      expect(response.body.productoId).toBe(testProductId1);
      expect(response.body.cantidad).toBe(5);
      expect(typeof response.body.cantidad).toBe('number');
    });

    it('should sum quantities when adding duplicate product', async () => {
      await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send({ productoId: testProductId1, cantidad: 5 })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send({ productoId: testProductId1, cantidad: 3 })
        .expect(201);

      expect(response.body.cantidad).toBe(8);
    });

    it('should reject adding 0 or negative quantity', async () => {
      await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send({ productoId: testProductId1, cantidad: 0 })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send({ productoId: testProductId1, cantidad: -5 })
        .expect(400);
    });

    it('should reject adding more than available stock', async () => {
      await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send({ productoId: testProductId1, cantidad: 100 })
        .expect(400);
    });

    it('should reject inactive product', async () => {
      const inactiveProduct = await prisma.producto.create({
        data: {
          empresaId: testCompanyId,
          familiaId: (await prisma.familia.findFirst({ where: { empresaId: testCompanyId } }))!.id,
          subfamiliaId: (await prisma.subfamilia.findFirst({
            where: { empresaId: testCompanyId },
          }))!.id,
          tipoId: (await prisma.tipo.findFirst({ where: { empresaId: testCompanyId } }))!.id,
          subtipoId: (await prisma.subtipo.findFirst({ where: { empresaId: testCompanyId } }))!.id,
          nombre: 'Inactive Product',
          codigoInterno: 'INACTIVE',
          precioMinorista: '50.00',
          costo: '25.00',
          unidadBase: 'UNIDAD',
          activo: false,
        },
      });

      await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send({ productoId: inactiveProduct.id, cantidad: 1 })
        .expect(404);

      await prisma.producto.delete({ where: { id: inactiveProduct.id } });
    });
  });

  describe('Cart Retrieval & Item Management', () => {
    let cartId: string;
    let itemId1: string;
    let customerId: string;

    beforeEach(async () => {
      const customer = await prisma.cliente.create({
        data: {
          empresaId: testCompanyId,
          nombre: 'Cart Retrieval Customer',
          email: `cart-ret-${Date.now()}-${Math.random()}@example.com`,
        },
      });
      customerId = customer.id;

      const cartResponse = await request(app.getHttpServer())
        .post('/cart')
        .send({ customerId })
        .expect(201);
      cartId = cartResponse.body.id;

      const itemResponse = await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send({ productoId: testProductId1, cantidad: 5 })
        .expect(201);
      itemId1 = itemResponse.body.id;
    });

    afterEach(async () => {
      await prisma.cartItem.deleteMany({ where: { cart: { customerId } } });
      await prisma.cart.deleteMany({ where: { customerId } });
      await prisma.cliente.delete({ where: { id: customerId } });
    });

    it('should get cart with items', async () => {
      const response = await request(app.getHttpServer()).get(`/cart/${cartId}`).expect(200);

      expect(response.body.id).toBe(cartId);
      expect(response.body.items).toBeInstanceOf(Array);
      expect(response.body.items.length).toBe(1);
      expect(response.body.items[0].id).toBe(itemId1);
      expect(response.body.items[0].productoId).toBe(testProductId1);
      expect(response.body.items[0].cantidad).toBe(5);
    });

    it('should update item quantity', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/cart/${cartId}/items/${itemId1}`)
        .send({ cantidad: 10 })
        .expect(200);

      expect(response.body.cantidad).toBe(10);
      expect(typeof response.body.cantidad).toBe('number');
    });

    it('should reject quantity update to 0 or negative', async () => {
      await request(app.getHttpServer())
        .patch(`/cart/${cartId}/items/${itemId1}`)
        .send({ cantidad: 0 })
        .expect(400);

      await request(app.getHttpServer())
        .patch(`/cart/${cartId}/items/${itemId1}`)
        .send({ cantidad: -1 })
        .expect(400);
    });

    it('should reject quantity update exceeding stock', async () => {
      await request(app.getHttpServer())
        .patch(`/cart/${cartId}/items/${itemId1}`)
        .send({ cantidad: 100 })
        .expect(400);
    });

    it('should remove item from cart', async () => {
      await request(app.getHttpServer()).delete(`/cart/${cartId}/items/${itemId1}`).expect(204);

      const cartResponse = await request(app.getHttpServer()).get(`/cart/${cartId}`).expect(200);

      expect(cartResponse.body.items.length).toBe(0);
    });
  });

  describe('Multi-Product Cart', () => {
    let cartId: string;
    let customerId: string;

    beforeEach(async () => {
      const customer = await prisma.cliente.create({
        data: {
          empresaId: testCompanyId,
          nombre: 'Multi-Product Customer',
          email: `cart-multi-${Date.now()}-${Math.random()}@example.com`,
        },
      });
      customerId = customer.id;

      const response = await request(app.getHttpServer())
        .post('/cart')
        .send({ customerId })
        .expect(201);
      cartId = response.body.id;
    });

    afterEach(async () => {
      await prisma.cartItem.deleteMany({ where: { cart: { customerId } } });
      await prisma.cart.deleteMany({ where: { customerId } });
      await prisma.cliente.delete({ where: { id: customerId } });
    });

    it('should manage multiple different products', async () => {
      await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send({ productoId: testProductId1, cantidad: 3 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send({ productoId: testProductId2, cantidad: 2 })
        .expect(201);

      const cartResponse = await request(app.getHttpServer()).get(`/cart/${cartId}`).expect(200);

      expect(cartResponse.body.items.length).toBe(2);
      const prod1Item = cartResponse.body.items.find((i) => i.productoId === testProductId1);
      const prod2Item = cartResponse.body.items.find((i) => i.productoId === testProductId2);

      expect(prod1Item.cantidad).toBe(3);
      expect(prod2Item.cantidad).toBe(2);
    });
  });

  describe('Cart Clearing', () => {
    let cartId: string;
    let customerId: string;

    beforeEach(async () => {
      const customer = await prisma.cliente.create({
        data: {
          empresaId: testCompanyId,
          nombre: 'Cart Clear Customer',
          email: `cart-clear-${Date.now()}-${Math.random()}@example.com`,
        },
      });
      customerId = customer.id;

      const response = await request(app.getHttpServer())
        .post('/cart')
        .send({ customerId })
        .expect(201);
      cartId = response.body.id;

      await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send({ productoId: testProductId1, cantidad: 5 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/cart/${cartId}/items`)
        .send({ productoId: testProductId2, cantidad: 3 })
        .expect(201);
    });

    afterEach(async () => {
      await prisma.cartItem.deleteMany({ where: { cart: { customerId } } });
      await prisma.cart.deleteMany({ where: { customerId } });
      await prisma.cliente.delete({ where: { id: customerId } });
    });

    it('should clear all items from cart', async () => {
      await request(app.getHttpServer()).delete(`/cart/${cartId}`).expect(204);

      const cartResponse = await request(app.getHttpServer()).get(`/cart/${cartId}`).expect(200);

      expect(cartResponse.body.items.length).toBe(0);
    });
  });
});
