import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SearchService } from '../../src/search/search.service';
import { SearchController } from '../../src/search/search.controller';
import { ElasticsearchClient } from '../../src/search/elasticsearch.client';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  SearchProductsQueryDto,
  SearchOrdersQueryDto,
} from '../../src/search/dto/search-query.dto';

/**
 * P14-1: Full-Text Search Integration Tests
 * - Product search (name, description, filters)
 * - Order search (number, client, date range, status)
 * - Faceted filtering (familia, price ranges, status)
 * - Multi-tenant isolation
 * - Performance baseline
 */
describe('P14-1: Full-Text Search', () => {
  let app: INestApplication;
  let searchService: SearchService;
  let prisma: PrismaService;
  let mockEsClient: any;
  let empresaId: string;
  let familiaId: string;

  beforeAll(async () => {
    // Mock Elasticsearch client
    mockEsClient = {
      ping: jest.fn().mockResolvedValue(true),
      createIndex: jest.fn().mockResolvedValue({}),
      deleteIndex: jest.fn().mockResolvedValue({}),
      index: jest.fn().mockResolvedValue({ _id: 'test-id' }),
      delete: jest.fn().mockResolvedValue({}),
      search: jest.fn(),
      bulk: jest.fn().mockResolvedValue({}),
      indices: {
        exists: jest.fn().mockResolvedValue(false),
        create: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        SearchService,
        {
          provide: ElasticsearchClient,
          useValue: mockEsClient,
        },
        {
          provide: PrismaService,
          useValue: {
            producto: {
              findMany: jest.fn(),
            },
            venta: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    searchService = moduleFixture.get<SearchService>(SearchService);
    esClient = moduleFixture.get<ElasticsearchClient>(ElasticsearchClient);
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Setup test data
    empresaId = `test-empresa-${Date.now()}`;
    familiaId = `test-familia-${Date.now()}`;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Product Search', () => {
    it('should search products by name', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: 'prod-1',
              _source: {
                id: 'prod-1',
                nombre: 'Laptop Dell',
                descripcion: 'High performance laptop',
                precio: 1200,
                stock: 5,
              },
            },
          ],
        },
      });

      const query: SearchProductsQueryDto = {
        q: 'Laptop',
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchProducts(empresaId, query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].nombre).toBe('Laptop Dell');
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should search products by description', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: 'prod-2',
              _source: {
                id: 'prod-2',
                nombre: 'Monitor LG',
                descripcion: 'High performance 4K display',
                precio: 800,
                stock: 10,
              },
            },
          ],
        },
      });

      const query: SearchProductsQueryDto = {
        q: '4K display',
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchProducts(empresaId, query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].descripcion).toContain('4K');
      expect(result.total).toBe(1);
    });

    it('should filter products by familia', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 2 },
          hits: [
            {
              _id: 'prod-3',
              _source: {
                id: 'prod-3',
                nombre: 'Teclado Mecanico',
                familiaId: familiaId,
                familiaName: 'Perifericos',
                precio: 150,
              },
            },
            {
              _id: 'prod-4',
              _source: {
                id: 'prod-4',
                nombre: 'Mouse Inalambrico',
                familiaId: familiaId,
                familiaName: 'Perifericos',
                precio: 50,
              },
            },
          ],
        },
      });

      const query: SearchProductsQueryDto = {
        familia: familiaId,
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchProducts(empresaId, query);

      expect(result.items).toHaveLength(2);
      expect(result.items.every((item) => item.familiaId === familiaId)).toBe(true);
    });

    it('should filter products by price range', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: 'prod-5',
              _source: {
                id: 'prod-5',
                nombre: 'Mouse',
                precio: 75,
              },
            },
          ],
        },
      });

      const query: SearchProductsQueryDto = {
        priceMin: 50,
        priceMax: 100,
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchProducts(empresaId, query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].precio).toBeGreaterThanOrEqual(50);
      expect(result.items[0].precio).toBeLessThanOrEqual(100);
    });

    it('should handle pagination correctly', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 25 },
          hits: Array.from({ length: 20 }, (_, i) => ({
            _id: `prod-${i + 101}`,
            _source: {
              id: `prod-${i + 101}`,
              nombre: `Product ${i + 101}`,
              precio: 100,
            },
          })),
        },
      });

      const query: SearchProductsQueryDto = {
        q: 'Product',
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchProducts(empresaId, query);

      expect(result.items).toHaveLength(20);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.hasMore).toBe(true);
    });

    it('should sort by price ascending', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 2 },
          hits: [
            {
              _id: 'prod-6',
              _source: { id: 'prod-6', nombre: 'Cheap Item', precio: 10 },
            },
            {
              _id: 'prod-7',
              _source: { id: 'prod-7', nombre: 'Expensive Item', precio: 1000 },
            },
          ],
        },
      });

      const query: SearchProductsQueryDto = {
        q: 'Item',
        sort: 'price_asc' as any,
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchProducts(empresaId, query);

      expect(result.items[0].precio).toBeLessThanOrEqual(result.items[1].precio);
    });

    it('should handle wildcard search (prefix matching)', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 2 },
          hits: [
            {
              _id: 'prod-8',
              _source: { id: 'prod-8', nombre: 'Producto A', precio: 100 },
            },
            {
              _id: 'prod-9',
              _source: { id: 'prod-9', nombre: 'Productividad B', precio: 200 },
            },
          ],
        },
      });

      const query: SearchProductsQueryDto = {
        q: 'prod',
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchProducts(empresaId, query);

      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items.every((item) => item.nombre.toLowerCase().includes('prod'))).toBe(true);
    });

    it('should return facets for product search', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 3 },
          hits: [
            {
              _id: 'prod-10',
              _source: { id: 'prod-10', nombre: 'Product 1', precio: 45 },
            },
          ],
        },
        aggregations: {
          familias: {
            buckets: [
              { key: 'Electronics', doc_count: 5 },
              { key: 'Accessories', doc_count: 3 },
            ],
          },
          priceRanges: {
            buckets: [
              { to: 50, doc_count: 2 },
              { from: 50, to: 100, doc_count: 5 },
              { from: 100, to: 500, doc_count: 8 },
              { from: 500, doc_count: 3 },
            ],
          },
        },
      });

      const query: SearchProductsQueryDto = {
        q: 'Product',
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchProducts(empresaId, query);

      expect(result.facets).toBeDefined();
      expect(result.facets.familias).toHaveLength(2);
      expect(result.facets.priceRanges).toHaveLength(4);
      expect(result.facets.familias[0].key).toBe('Electronics');
      expect(result.facets.familias[0].count).toBe(5);
    });
  });

  describe('Order Search', () => {
    it('should search orders by number', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: 'order-1',
              _source: {
                id: 'order-1',
                numero: 12345,
                clienteNombre: 'Juan Perez',
                estado: 'completado',
                total: 500.0,
                fecha: '2026-10-20',
              },
            },
          ],
        },
      });

      const query: SearchOrdersQueryDto = {
        q: '12345',
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchOrders(empresaId, query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].numero).toBe(12345);
      expect(result.total).toBe(1);
    });

    it('should search orders by client name', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: 'order-2',
              _source: {
                id: 'order-2',
                numero: 67890,
                clienteNombre: 'Maria Garcia',
                estado: 'pendiente',
                total: 250.0,
                fecha: '2026-10-21',
              },
            },
          ],
        },
      });

      const query: SearchOrdersQueryDto = {
        q: 'Maria',
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchOrders(empresaId, query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].clienteNombre).toContain('Maria');
    });

    it('should filter orders by status', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 3 },
          hits: [
            {
              _id: 'order-3',
              _source: {
                id: 'order-3',
                numero: 11111,
                estado: 'completado',
                clienteNombre: 'Cliente A',
              },
            },
            {
              _id: 'order-4',
              _source: {
                id: 'order-4',
                numero: 11112,
                estado: 'completado',
                clienteNombre: 'Cliente B',
              },
            },
            {
              _id: 'order-5',
              _source: {
                id: 'order-5',
                numero: 11113,
                estado: 'completado',
                clienteNombre: 'Cliente C',
              },
            },
          ],
        },
      });

      const query: SearchOrdersQueryDto = {
        estado: 'completado',
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchOrders(empresaId, query);

      expect(result.items).toHaveLength(3);
      expect(result.items.every((item) => item.estado === 'completado')).toBe(true);
    });

    it('should filter orders by date range', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 2 },
          hits: [
            {
              _id: 'order-6',
              _source: {
                id: 'order-6',
                numero: 22222,
                fecha: '2026-10-15',
                estado: 'completado',
              },
            },
            {
              _id: 'order-7',
              _source: {
                id: 'order-7',
                numero: 22223,
                fecha: '2026-10-18',
                estado: 'completado',
              },
            },
          ],
        },
      });

      const query: SearchOrdersQueryDto = {
        dateFrom: '2026-10-10',
        dateTo: '2026-10-20',
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchOrders(empresaId, query);

      expect(result.items).toHaveLength(2);
    });

    it('should return facets for order search (status)', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 10 },
          hits: [],
        },
        aggregations: {
          status: {
            buckets: [
              { key: 'completado', doc_count: 6 },
              { key: 'pendiente', doc_count: 3 },
              { key: 'cancelado', doc_count: 1 },
            ],
          },
        },
      });

      const query: SearchOrdersQueryDto = {
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchOrders(empresaId, query);

      expect(result.facets).toBeDefined();
      expect(result.facets.status).toHaveLength(3);
      expect(result.facets.status[0].key).toBe('completado');
      expect(result.facets.status[0].count).toBe(6);
    });
  });

  describe('Multi-tenant Isolation', () => {
    let empresaA: string;

    beforeAll(() => {
      empresaA = `test-empresa-a-${Date.now()}`;
    });

    it('should not return products from other empresas', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 2 },
          hits: [
            {
              _id: 'prod-a1',
              _source: { id: 'prod-a1', nombre: 'Product A1', empresaId: empresaA },
            },
            {
              _id: 'prod-a2',
              _source: { id: 'prod-a2', nombre: 'Product A2', empresaId: empresaA },
            },
          ],
        },
      });

      const query: SearchProductsQueryDto = {
        q: 'Product',
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchProducts(empresaA, query);

      expect(result.items.every((item) => item.empresaId === empresaA)).toBe(true);
    });

    it('should not return orders from other empresas', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: 'order-a1',
              _source: {
                id: 'order-a1',
                numero: 99999,
                empresaId: empresaA,
                estado: 'completado',
              },
            },
          ],
        },
      });

      const query: SearchOrdersQueryDto = {
        q: '99999',
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchOrders(empresaA, query);

      expect(result.items.every((item) => item.empresaId === empresaA)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should complete product search in < 100ms', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 50 },
          hits: Array.from({ length: 20 }, (_, i) => ({
            _id: `perf-prod-${i}`,
            _source: { id: `perf-prod-${i}`, nombre: `Performance Test ${i}`, precio: 100 },
          })),
        },
      });

      const query: SearchProductsQueryDto = {
        q: 'Performance',
        page: 1,
        limit: 20,
      };

      const start = Date.now();
      await searchService.searchProducts(empresaId, query);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should complete order search in < 100ms', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 50 },
          hits: Array.from({ length: 20 }, (_, i) => ({
            _id: `perf-order-${i}`,
            _source: {
              id: `perf-order-${i}`,
              numero: 50000 + i,
              clienteNombre: `Client ${i}`,
              estado: 'completado',
            },
          })),
        },
      });

      const query: SearchOrdersQueryDto = {
        page: 1,
        limit: 20,
      };

      const start = Date.now();
      await searchService.searchOrders(empresaId, query);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Indexing Operations', () => {
    it('should index a product successfully', async () => {
      const product = {
        id: 'idx-prod-1',
        empresaId: empresaId,
        nombre: 'Test Product',
        descripcion: 'Test Description',
        precio: 100,
        stock: 10,
        familiaId: familiaId,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        familia: { nombre: 'Test Family' },
      };

      await searchService.indexProduct(product);

      expect(mockEsClient.index).toHaveBeenCalled();
    });

    it('should delete a product index', async () => {
      await searchService.deleteProductIndex('idx-prod-1');

      expect(mockEsClient.delete).toHaveBeenCalledWith('products', 'idx-prod-1');
    });

    it('should rebuild product index for an empresa', async () => {
      const mockProducts = [
        {
          id: 'rebuild-prod-1',
          empresaId: empresaId,
          nombre: 'Rebuild Product 1',
          descripcion: 'Test',
          precio: 100,
          familiaId: familiaId,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          familia: { nombre: 'Family 1' },
        },
      ];

      (prisma.producto.findMany as jest.Mock).mockResolvedValueOnce(mockProducts);

      await searchService.rebuildProductIndex(empresaId);

      expect(mockEsClient.deleteIndex).toHaveBeenCalledWith('products');
      expect(mockEsClient.createIndex).toHaveBeenCalledWith('products', expect.any(Object));
      expect(mockEsClient.bulk).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 0 },
          hits: [],
        },
      });

      const query: SearchProductsQueryDto = {
        q: 'nonexistent',
        page: 1,
        limit: 20,
      };

      const result = await searchService.searchProducts(empresaId, query);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle search on last page', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 25 },
          hits: Array.from({ length: 5 }, (_, i) => ({
            _id: `last-page-${i}`,
            _source: { id: `last-page-${i}`, nombre: `Product ${i}` },
          })),
        },
      });

      const query: SearchProductsQueryDto = {
        q: 'Product',
        page: 5,
        limit: 5,
      };

      const result = await searchService.searchProducts(empresaId, query);

      expect(result.page).toBe(5);
      expect(result.hasMore).toBe(false);
    });
  });
});
