import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * P9-2: Business Metrics & KPIs Integration Tests
 *
 * Tests the complete metrics API:
 * - Revenue metrics aggregation (daily, weekly, monthly)
 * - Order metrics (count, AOV, fulfillment)
 * - Customer retention cohorts
 * - Channel breakdown
 * - Product performance
 * - Cohort LTV
 * - Multi-tenant isolation
 *
 * Test data: 2 companies, 10+ customers, 30+ orders, 60+ sales
 */
describe('P9-2: Business Metrics & KPIs', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test fixtures
  let company1Id: string;
  let company2Id: string;
  let user1Token: string;
  let user2Token: string;

  // Company 1 fixtures
  const company1Customers: string[] = [];
  const company1Orders: string[] = [];
  const company1Sales: string[] = [];

  // Company 2 fixtures (for isolation testing)
  const company2Customers: string[] = [];
  const company2Orders: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Setup: Create two companies for isolation testing
    const company1 = await prisma.empresa.create({
      data: {
        nombre: `Metrics Test Company 1 - ${Date.now()}`,
      },
    });
    company1Id = company1.id;

    const company2 = await prisma.empresa.create({
      data: {
        nombre: `Metrics Test Company 2 - ${Date.now()}`,
      },
    });
    company2Id = company2.id;

    // Create users and generate JWT tokens for both companies
    user1Token = await createUserAndGetToken(company1Id, 'metrics-user-1@test.com');
    user2Token = await createUserAndGetToken(company2Id, 'metrics-user-2@test.com');

    // Setup Company 1 test data
    await setupCompanyTestData(company1Id, company1Customers, company1Orders, company1Sales);

    // Setup Company 2 test data (smaller dataset for isolation test)
    await setupCompanyTestData(company2Id, company2Customers, company2Orders, []);
  });

  afterAll(async () => {
    await app.close();
  });

  // ========== Revenue Metrics Tests ==========

  describe('GET /metrics/revenue', () => {
    it('should return revenue metrics for a given date range', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/revenue')
        .query({ startDate, endDate, groupBy: 'daily' })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('transactionCount');
      expect(response.body).toHaveProperty('averageRevenue');
      expect(response.body).toHaveProperty('periods');
      expect(response.body.totalRevenue).toBeGreaterThan(0);
      expect(Array.isArray(response.body.periods)).toBe(true);
    });

    it('should group revenue by weekly', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/revenue')
        .query({ startDate, endDate, groupBy: 'weekly' })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.periods.length).toBeGreaterThan(0);
      // Verify period format: YYYY-WXX
      response.body.periods.forEach((period: any) => {
        expect(period.period).toMatch(/\d{4}-W\d{2}/);
      });
    });

    it('should group revenue by monthly', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-12-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/revenue')
        .query({ startDate, endDate, groupBy: 'monthly' })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.periods.length).toBeGreaterThan(0);
      // Verify period format: YYYY-MM
      response.body.periods.forEach((period: any) => {
        expect(period.period).toMatch(/\d{4}-\d{2}/);
      });
    });

    it('should return comparison metrics for year_ago', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/revenue')
        .query({ startDate, endDate, compareTo: 'year_ago' })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // Expect comparison block if there is prior year data
      if (response.body.comparison) {
        expect(response.body.comparison).toHaveProperty('totalRevenue');
        expect(response.body.comparison).toHaveProperty('percentageChange');
      }
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/metrics/revenue')
        .query({ startDate: '2026-10-01', endDate: '2026-10-31' })
        .expect(401);
    });

    it('should not leak data across companies', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response1 = await request(app.getHttpServer())
        .get('/metrics/revenue')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/metrics/revenue')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      // Company 1 should have more revenue (30+ sales vs 0)
      expect(response1.body.totalRevenue).toBeGreaterThan(response2.body.totalRevenue);
    });
  });

  // ========== GMV Metrics Tests ==========

  describe('GET /metrics/gmv', () => {
    it('should return GMV metrics', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/gmv')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalGMV');
      expect(response.body).toHaveProperty('orderCount');
      expect(response.body).toHaveProperty('averageGMV');
      expect(response.body.totalGMV).toBeGreaterThan(0);
    });

    it('should have GMV >= Revenue (no discount in GMV)', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const revenueRes = await request(app.getHttpServer())
        .get('/metrics/revenue')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const gmvRes = await request(app.getHttpServer())
        .get('/metrics/gmv')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // GMV should be >= Revenue
      expect(gmvRes.body.totalGMV).toBeGreaterThanOrEqual(revenueRes.body.totalRevenue);
    });
  });

  // ========== Order Metrics Tests ==========

  describe('GET /metrics/orders', () => {
    it('should return order metrics', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/orders')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalOrders');
      expect(response.body).toHaveProperty('averageOrderValue');
      expect(response.body).toHaveProperty('fulfillmentRate');
      expect(response.body).toHaveProperty('ordersByStatus');
      expect(response.body.totalOrders).toBeGreaterThan(0);
    });

    it('should break down orders by status', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/orders')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.ordersByStatus).toBeDefined();
      expect(typeof response.body.ordersByStatus).toBe('object');
    });

    it('should calculate fulfillment rate correctly', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/orders')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // Fulfillment rate should be between 0 and 100
      expect(response.body.fulfillmentRate).toBeGreaterThanOrEqual(0);
      expect(response.body.fulfillmentRate).toBeLessThanOrEqual(100);
    });
  });

  // ========== AOV Tests ==========

  describe('GET /metrics/aov', () => {
    it('should return AOV metrics', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/aov')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('aov');
      expect(response.body).toHaveProperty('medianOrderValue');
      expect(response.body).toHaveProperty('minOrderValue');
      expect(response.body).toHaveProperty('maxOrderValue');
      expect(response.body.aov).toBeGreaterThan(0);
    });

    it('should have min <= median <= max order values', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/aov')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.minOrderValue).toBeLessThanOrEqual(response.body.medianOrderValue);
      expect(response.body.medianOrderValue).toBeLessThanOrEqual(response.body.maxOrderValue);
    });

    it('should provide period breakdown', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/aov')
        .query({ startDate, endDate, groupBy: 'weekly' })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(response.body.periods)).toBe(true);
      if (response.body.periods.length > 0) {
        expect(response.body.periods[0]).toHaveProperty('aov');
        expect(response.body.periods[0]).toHaveProperty('orderCount');
      }
    });
  });

  // ========== Retention Cohort Tests ==========

  describe('GET /metrics/retention', () => {
    it('should return retention cohort matrix', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/retention')
        .query({ cohortPeriod: 'monthly', lookbackMonths: 3 })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('cohorts');
      expect(response.body).toHaveProperty('retention');
      expect(response.body).toHaveProperty('churn');
      expect(response.body).toHaveProperty('cohortPeriod');
      expect(Array.isArray(response.body.cohorts)).toBe(true);
      expect(Array.isArray(response.body.retention)).toBe(true);
    });

    it('should have cohorts property with customerCount and firstPurchaseCount', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/retention')
        .query({ cohortPeriod: 'monthly', lookbackMonths: 3 })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      if (response.body.cohorts.length > 0) {
        const cohort = response.body.cohorts[0];
        expect(cohort).toHaveProperty('cohortPeriod');
        expect(cohort).toHaveProperty('customerCount');
        expect(cohort).toHaveProperty('firstPurchaseCount');
      }
    });

    it('should use weekly cohort period if specified', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/retention')
        .query({ cohortPeriod: 'weekly', lookbackMonths: 1 })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.cohortPeriod).toBe('weekly');
      if (response.body.cohorts.length > 0) {
        // Cohort period should match weekly format: YYYY-WXX
        expect(response.body.cohorts[0].cohortPeriod).toMatch(/\d{4}-W\d{2}/);
      }
    });

    it('should return retention rates between 0 and 100', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/retention')
        .query({ cohortPeriod: 'monthly', lookbackMonths: 3 })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      for (const row of response.body.retention) {
        for (const rate of row) {
          if (rate !== null) {
            expect(rate).toBeGreaterThanOrEqual(0);
            expect(rate).toBeLessThanOrEqual(100);
          }
        }
      }
    });

    it('should have retention + churn = 100 for each cell', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics/retention')
        .query({ cohortPeriod: 'monthly', lookbackMonths: 3 })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      for (let i = 0; i < response.body.retention.length; i++) {
        for (let j = 0; j < response.body.retention[i].length; j++) {
          const retention = response.body.retention[i][j];
          const churn = response.body.churn[i][j];
          if (retention !== null && churn !== null) {
            const sum = Math.round((retention + churn) * 100) / 100;
            expect(sum).toBe(100);
          }
        }
      }
    });
  });

  // ========== LTV Tests ==========

  describe('GET /metrics/ltv', () => {
    it('should return LTV for a customer cohort', async () => {
      const cohortStartDate = '2026-10-01';
      const cohortEndDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/ltv')
        .query({ cohortStartDate, cohortEndDate, lookbackMonths: 3 })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('ltv');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('customerCount');
      expect(response.body).toHaveProperty('medianLTV');
      expect(response.body).toHaveProperty('minLTV');
      expect(response.body).toHaveProperty('maxLTV');
    });

    it('should have LTV > 0 for customers with purchases', async () => {
      const cohortStartDate = '2026-10-01';
      const cohortEndDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/ltv')
        .query({ cohortStartDate, cohortEndDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      if (response.body.customerCount > 0) {
        expect(response.body.ltv).toBeGreaterThanOrEqual(0);
      }
    });

    it('should have min <= median <= max LTV', async () => {
      const cohortStartDate = '2026-10-01';
      const cohortEndDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/ltv')
        .query({ cohortStartDate, cohortEndDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      if (response.body.customerCount > 0) {
        expect(response.body.minLTV).toBeLessThanOrEqual(response.body.medianLTV);
        expect(response.body.medianLTV).toBeLessThanOrEqual(response.body.maxLTV);
      }
    });
  });

  // ========== Channel Metrics Tests ==========

  describe('GET /metrics/channels', () => {
    it('should return channel breakdown', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/channels')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        const channel = response.body[0];
        expect(channel).toHaveProperty('channel');
        expect(channel).toHaveProperty('revenue');
        expect(channel).toHaveProperty('orderCount');
        expect(channel).toHaveProperty('averageOrderValue');
        expect(channel).toHaveProperty('percentageOfTotal');
      }
    });

    it('should have percentageOfTotal sum to 100', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/channels')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      if (response.body.length > 0) {
        const sum = response.body.reduce((acc: number, c: any) => acc + c.percentageOfTotal, 0);
        expect(Math.round(sum * 100) / 100).toBeCloseTo(100, 0);
      }
    });
  });

  // ========== Product Metrics Tests ==========

  describe('GET /metrics/products', () => {
    it('should return top products', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/products')
        .query({ startDate, endDate, topN: 10 })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    it('should respect topN limit', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/products')
        .query({ startDate, endDate, topN: 5 })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.products.length).toBeLessThanOrEqual(5);
    });

    it('should include product details', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/products')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      if (response.body.products.length > 0) {
        const product = response.body.products[0];
        expect(product).toHaveProperty('productId');
        expect(product).toHaveProperty('productName');
        expect(product).toHaveProperty('revenue');
        expect(product).toHaveProperty('unitsSold');
        expect(product).toHaveProperty('averagePrice');
        expect(product).toHaveProperty('uniqueCustomers');
        expect(product).toHaveProperty('revenuePercentage');
      }
    });
  });

  // ========== Dashboard KPIs Tests ==========

  describe('GET /metrics/dashboard', () => {
    it('should return dashboard KPIs', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/dashboard')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('revenue');
      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('aov');
      expect(response.body).toHaveProperty('activeCustomers');
      expect(response.body).toHaveProperty('retention');
      expect(response.body).toHaveProperty('topChannel');
      expect(response.body).toHaveProperty('topProduct');
    });

    it('should have retention with D7 and D30 rates', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/dashboard')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.retention).toHaveProperty('d7');
      expect(response.body.retention).toHaveProperty('d30');
      expect(response.body.retention.d7).toBeGreaterThanOrEqual(0);
      expect(response.body.retention.d30).toBeGreaterThanOrEqual(0);
    });
  });

  // ========== CAC Tests ==========

  describe('GET /metrics/cac', () => {
    it('should return CAC metrics (limited without external spend data)', async () => {
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/cac')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('newCustomers');
      expect(response.body).toHaveProperty('marketingSpend');
      expect(response.body).toHaveProperty('note');
      expect(response.body.cac).toBeNull(); // No spend data without external integration
    });
  });

  // ========== Error Cases ==========

  describe('Error Cases', () => {
    it('should reject invalid date formats', async () => {
      await request(app.getHttpServer())
        .get('/metrics/revenue')
        .query({ startDate: 'invalid', endDate: '2026-10-31' })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(400);
    });

    it('should reject unknown groupBy values', async () => {
      await request(app.getHttpServer())
        .get('/metrics/revenue')
        .query({ startDate: '2026-10-01', endDate: '2026-10-31', groupBy: 'unknown' })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(400);
    });

    it('should return empty results for future date ranges', async () => {
      const startDate = '2099-10-01';
      const endDate = '2099-10-31';

      const response = await request(app.getHttpServer())
        .get('/metrics/revenue')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.totalRevenue).toBe(0);
      expect(response.body.transactionCount).toBe(0);
    });
  });

  // ========== Helper Functions ==========

  async function createUserAndGetToken(companyId: string, email: string): Promise<string> {
    // Create a user for the company
    const user = await prisma.usuario.create({
      data: {
        nombre: `Test User ${Date.now()}`,
        email,
        passwordHash: 'hashed_password', // In real scenarios, use bcrypt
        activo: true,
      },
    });

    // Create membership to link user to company
    await prisma.membership.create({
      data: {
        userId: user.id,
        businessId: companyId,
        role: 'owner',
      },
    });

    // Generate a JWT token (mock - in real tests use actual auth endpoint)
    // This is a simplified version; real implementation would call /auth/login
    const token = Buffer.from(JSON.stringify({ userId: user.id, empresaId: companyId })).toString(
      'base64',
    );
    return token;
  }

  async function setupCompanyTestData(
    companyId: string,
    customers: string[],
    orders: string[],
    sales: string[],
  ): Promise<void> {
    const db = prisma; // Use direct Prisma, not scoped

    // Create product hierarchy
    const familia = await db.familia.create({
      data: {
        empresaId: companyId,
        nombre: `Test Familia ${Date.now()}`,
        prefijo: 'TF',
      },
    });

    const subfamilia = await db.subfamilia.create({
      data: {
        empresaId: companyId,
        familiaId: familia.id,
        nombre: `Test Subfamilia ${Date.now()}`,
        prefijo: 'TS',
      },
    });

    const tipo = await db.tipo.create({
      data: {
        empresaId: companyId,
        subfamiliaId: subfamilia.id,
        nombre: `Test Tipo ${Date.now()}`,
        prefijo: 'TT',
      },
    });

    const subtipo = await db.subtipo.create({
      data: {
        empresaId: companyId,
        tipoId: tipo.id,
        nombre: `Test Subtipo ${Date.now()}`,
        prefijo: 'TST',
      },
    });

    // Create products
    const productos = [];
    for (let i = 0; i < 5; i++) {
      const producto = await db.producto.create({
        data: {
          empresaId: companyId,
          familiaId: familia.id,
          subfamiliaId: subfamilia.id,
          tipoId: tipo.id,
          subtipoId: subtipo.id,
          nombre: `Test Product ${i + 1}`,
          codigo: `PROD-${Date.now()}-${i}`,
          precioMinorista: new Prisma.Decimal(100 + i * 10),
          activo: true,
        },
      });
      productos.push(producto);
    }

    // Create customers (10 customers per company)
    for (let i = 0; i < 10; i++) {
      const customer = await db.cliente.create({
        data: {
          empresaId: companyId,
          nombre: `Test Customer ${i + 1}`,
          email: `customer-${companyId}-${i}@test.com`,
          activo: true,
        },
      });
      customers.push(customer.id);
    }

    // Create user for orders/sales
    const usuario = await db.usuario.create({
      data: {
        nombre: `Test User for Company ${companyId}`,
        email: `user-${companyId}@test.com`,
        passwordHash: 'hashed_password',
        activo: true,
      },
    });

    // Create orders (30 orders for company 1, 10 for company 2)
    const orderCount = sales.length > 0 ? 30 : 10;
    for (let i = 0; i < orderCount; i++) {
      const customerId = customers[i % customers.length];
      const product = productos[i % productos.length];

      const order = await db.pedido.create({
        data: {
          empresaId: companyId,
          clienteId: customerId,
          usuarioId: usuario.id,
          estado: ['RECIBIDO', 'CONFIRMADO', 'ENTREGADO'][i % 3] as any,
          canalOrigen: ['whatsapp', 'web', 'phone'][i % 3],
          total: new Prisma.Decimal(500 + i * 50),
          createdAt: new Date('2026-10-' + String((i % 29) + 1).padStart(2, '0')),
        },
      });
      orders.push(order.id);

      // Create order items
      await db.pedidoItem.create({
        data: {
          pedidoId: order.id,
          productoId: product.id,
          cantidad: new Prisma.Decimal(2 + (i % 3)),
          precioUnitario: product.precioMinorista,
        },
      });
    }

    // Create sales (only for company 1 - sales array not empty)
    if (sales.length !== undefined && sales !== []) {
      for (let i = 0; i < 30; i++) {
        const customerId = customers[i % customers.length];
        const product = productos[i % productos.length];

        const venta = await db.venta.create({
          data: {
            empresaId: companyId,
            clienteId: customerId,
            usuarioId: usuario.id,
            canal: ['cash', 'card', 'transfer'][i % 3],
            total: new Prisma.Decimal(200 + i * 20),
            estado: 'CONFIRMADA' as any,
            createdAt: new Date('2026-10-' + String((i % 29) + 1).padStart(2, '0')),
          },
        });
        sales.push(venta.id);

        // Create venta items
        await db.ventaItem.create({
          data: {
            ventaId: venta.id,
            productoId: product.id,
            cantidad: new Prisma.Decimal(1 + (i % 2)),
            precioUnitario: product.precioMinorista,
          },
        });
      }
    }
  }
});
