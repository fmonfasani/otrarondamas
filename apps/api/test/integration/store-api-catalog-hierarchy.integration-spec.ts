import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * C5A/C5B: Store API — GET /store/catalog and GET /store/hierarchy.
 *
 * Tests the public store API endpoints that list products (with prices and stock)
 * and the hierarchy of families/subfamilies for filter chips.
 */
describe('Store API — Catalog and Hierarchy', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testCompanyId: string;
  let testProductId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Setup: use TIENDA_EMPRESA_ID (fixed for public store)
    testCompanyId = process.env.TIENDA_EMPRESA_ID || '22dc5550-be63-44bd-bad7-8b7da0b2c6ca';

    // Create test hierarchy and product
    const suffix = Date.now();
    const familia = await prisma.familia.create({
      data: {
        empresaId: testCompanyId,
        nombre: `SAC Fam ${suffix}`,
        prefijo: 'SAC',
      },
    });

    const subfamilia = await prisma.subfamilia.create({
      data: {
        empresaId: testCompanyId,
        familiaId: familia.id,
        nombre: `SAC Sub ${suffix}`,
        prefijo: 'SAS',
      },
    });

    const tipo = await prisma.tipo.create({
      data: {
        empresaId: testCompanyId,
        subfamiliaId: subfamilia.id,
        nombre: `SAC Tip ${suffix}`,
        prefijo: 'SAT',
      },
    });

    const subtipo = await prisma.subtipo.create({
      data: {
        empresaId: testCompanyId,
        tipoId: tipo.id,
        nombre: `SAC Subt ${suffix}`,
        prefijo: 'SAU',
      },
    });

    const producto = await prisma.producto.create({
      data: {
        empresaId: testCompanyId,
        familiaId: familia.id,
        subfamiliaId: subfamilia.id,
        tipoId: tipo.id,
        subtipoId: subtipo.id,
        nombre: `SAC Prod ${suffix}`,
        codigoInterno: `SAC-${suffix}`,
        precioMinorista: '150.00',
        costo: '75.00',
        descuentoPorcentaje: '10',
        unidadBase: 'UNIDAD',
        activo: true,
      },
    });

    testProductId = producto.id;

    // Create stock (lote)
    await prisma.lote.create({
      data: {
        empresaId: testCompanyId,
        productoId: testProductId,
        numeroLote: `SAC-LOTE-${suffix}`,
        cantidad: 50,
        vencimiento: new Date('2099-01-01'),
      },
    });
  });

  afterAll(async () => {
    await prisma.pedidoItem.deleteMany({ where: { pedido: { empresaId: testCompanyId } } });
    await prisma.pedido.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.movimientoStock.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.lote.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.producto.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.subtipo.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.tipo.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.subfamilia.deleteMany({ where: { empresaId: testCompanyId } });
    await prisma.familia.deleteMany({ where: { empresaId: testCompanyId } });

    await app.close();
    await prisma.$disconnect();
  });

  describe('GET /store/catalog', () => {
    it('should return 200 with product list', async () => {
      const response = await request(app.getHttpServer()).get('/store/catalog').expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should include product with discount applied to price', async () => {
      const response = await request(app.getHttpServer()).get('/store/catalog').expect(200);

      const product = response.body.find((p) => p.productoId === testProductId);
      expect(product).toBeDefined();
      expect(product.nombre).toMatch(/^SAC Prod/);
      expect(product.precio).toBe('135.00'); // 150 - 10% = 135
      expect(product.precioSinDescuento).toBe('150.00');
      expect(product.descuentoPorcentaje).toBe(10);
      expect(product.disponible).toBe(true);
      expect(product.stockTotal).toBe(50);
    });

    it('should support search query', async () => {
      const response = await request(app.getHttpServer())
        .get('/store/catalog')
        .query({ search: 'SAC' })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      const product = response.body.find((p) => p.productoId === testProductId);
      expect(product).toBeDefined();
    });

    it('should not expose internal fields', async () => {
      const response = await request(app.getHttpServer()).get('/store/catalog').expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      response.body.forEach((product) => {
        expect(product).not.toHaveProperty('costo');
        expect(product).not.toHaveProperty('stockMinimo');
        expect(product).not.toHaveProperty('empresaId');
      });
    });
  });

  describe('GET /store/hierarchy', () => {
    it('should return 200 with familias and subfamilias', async () => {
      const response = await request(app.getHttpServer()).get('/store/hierarchy').expect(200);

      expect(response.body).toHaveProperty('familias');
      expect(response.body).toHaveProperty('subfamilias');
      expect(response.body.familias).toBeInstanceOf(Array);
      expect(response.body.subfamilias).toBeInstanceOf(Array);
    });

    it('should include created test familia and subfamilia', async () => {
      const response = await request(app.getHttpServer()).get('/store/hierarchy').expect(200);

      const familia = response.body.familias.find((f) => f.nombre.startsWith('SAC Fam'));
      expect(familia).toBeDefined();
      expect(familia.prefijo).toBe('SAC');

      const subfamilia = response.body.subfamilias.find((s) => s.nombre.startsWith('SAC Sub'));
      expect(subfamilia).toBeDefined();
      expect(subfamilia.familiaId).toBe(familia.id);
    });

    it('should list families and subfamilies in ascending order by name', async () => {
      const response = await request(app.getHttpServer()).get('/store/hierarchy').expect(200);

      const familyNames = response.body.familias.map((f) => f.nombre);
      const subfamilyNames = response.body.subfamilias.map((s) => s.nombre);

      // Check if arrays are sorted
      expect(familyNames).toEqual([...familyNames].sort());
      expect(subfamilyNames).toEqual([...subfamilyNames].sort());
    });

    it('should not expose Tipo/Subtipo (hierarchy stops at Subfamilia)', async () => {
      const response = await request(app.getHttpServer()).get('/store/hierarchy').expect(200);

      expect(response.body).not.toHaveProperty('tipos');
      expect(response.body).not.toHaveProperty('subtipos');
    });
  });
});
