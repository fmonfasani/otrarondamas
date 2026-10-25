import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchClient } from './elasticsearch.client';
import {
  ELASTICSEARCH_INDICES,
  ELASTICSEARCH_SETTINGS,
} from './elasticsearch.config';
import {
  SearchProductsQueryDto,
  SearchOrdersQueryDto,
  SortOption,
} from './dto/search-query.dto';
import { SearchResultDto, SearchResultItemDto, FacetDto } from './dto/search-result.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  private logger = new Logger('SearchService');

  constructor(
    private esClient: ElasticsearchClient,
    private prisma: PrismaService,
  ) {}

  async initializeIndices(): Promise<void> {
    try {
      await this.esClient.createIndex(
        ELASTICSEARCH_INDICES.PRODUCTS,
        ELASTICSEARCH_SETTINGS.products,
      );
      await this.esClient.createIndex(
        ELASTICSEARCH_INDICES.ORDERS,
        ELASTICSEARCH_SETTINGS.orders,
      );
      this.logger.log('Search indices initialized');
    } catch (error) {
      this.logger.error('Failed to initialize indices', error);
      throw error;
    }
  }

  async searchProducts(
    empresaId: string,
    query: SearchProductsQueryDto,
  ): Promise<SearchResultDto> {
    try {
      const { q, familia, priceMin, priceMax, page = 1, limit = 20, sort } =
        query;
      const from = (page - 1) * limit;

      const filters = [{ term: { empresaId } }];

      if (familia) {
        filters.push({ term: { familiaId: familia } });
      }

      if (priceMin !== undefined || priceMax !== undefined) {
        const rangeQuery: any = {};
        if (priceMin !== undefined) rangeQuery.gte = priceMin;
        if (priceMax !== undefined) rangeQuery.lte = priceMax;
        filters.push({ range: { precio: rangeQuery } });
      }

      filters.push({ term: { activo: true } });

      let searchQuery: any = {
        size: limit,
        from,
        query: {
          bool: {
            filter: filters,
          },
        },
        aggs: {
          familias: {
            terms: { field: 'familiaName', size: 100 },
          },
          priceRanges: {
            range: {
              field: 'precio',
              ranges: [
                { to: 50 },
                { from: 50, to: 100 },
                { from: 100, to: 500 },
                { from: 500 },
              ],
            },
          },
        },
      };

      if (q) {
        searchQuery.query.bool.must = {
          multi_match: {
            query: q,
            fields: ['nombre^2', 'descripcion', 'tags'],
            fuzziness: 'AUTO',
            operator: 'or',
          },
        };
      }

      // Apply sort
      if (sort === SortOption.RELEVANCE && !q) {
        searchQuery.sort = [{ createdAt: { order: 'desc' } }];
      } else if (sort === SortOption.PRICE_ASC) {
        searchQuery.sort = [{ precio: { order: 'asc' } }];
      } else if (sort === SortOption.PRICE_DESC) {
        searchQuery.sort = [{ precio: { order: 'desc' } }];
      } else if (sort === SortOption.DATE_DESC) {
        searchQuery.sort = [{ createdAt: { order: 'desc' } }];
      } else if (sort === SortOption.DATE_ASC) {
        searchQuery.sort = [{ createdAt: { order: 'asc' } }];
      } else {
        searchQuery.sort = ['_score', { createdAt: { order: 'desc' } }];
      }

      const response = await this.esClient.search(
        ELASTICSEARCH_INDICES.PRODUCTS,
        searchQuery,
      );

      const items = response.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source,
      }));

      const facets = {
        familias: this._processFacets(response.aggregations?.familias?.buckets),
        priceRanges: this._processPriceRanges(
          response.aggregations?.priceRanges?.buckets,
        ),
      };

      return {
        items,
        total: response.hits.total.value,
        page,
        limit,
        hasMore: from + limit < response.hits.total.value,
        facets,
      };
    } catch (error) {
      this.logger.error('Product search failed', error);
      throw error;
    }
  }

  async searchOrders(
    empresaId: string,
    query: SearchOrdersQueryDto,
  ): Promise<SearchResultDto> {
    try {
      const { q, estado, dateFrom, dateTo, page = 1, limit = 20 } = query;
      const from = (page - 1) * limit;

      const filters = [{ term: { empresaId } }];

      if (estado) {
        filters.push({ term: { estado } });
      }

      if (dateFrom || dateTo) {
        const dateRange: any = {};
        if (dateFrom) dateRange.gte = dateFrom;
        if (dateTo) dateRange.lte = dateTo;
        filters.push({ range: { fecha: dateRange } });
      }

      let searchQuery: any = {
        size: limit,
        from,
        query: {
          bool: {
            filter: filters,
          },
        },
        aggs: {
          status: {
            terms: { field: 'estado', size: 50 },
          },
        },
      };

      if (q) {
        searchQuery.query.bool.must = {
          multi_match: {
            query: q,
            fields: ['numero^2', 'clienteNombre', 'clienteEmail'],
            fuzziness: 'AUTO',
            operator: 'or',
          },
        };
      }

      searchQuery.sort = [{ fecha: { order: 'desc' } }];

      const response = await this.esClient.search(
        ELASTICSEARCH_INDICES.ORDERS,
        searchQuery,
      );

      const items = response.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source,
      }));

      const facets = {
        status: this._processFacets(response.aggregations?.status?.buckets),
      };

      return {
        items,
        total: response.hits.total.value,
        page,
        limit,
        hasMore: from + limit < response.hits.total.value,
        facets,
      };
    } catch (error) {
      this.logger.error('Order search failed', error);
      throw error;
    }
  }

  async indexProduct(product: any): Promise<void> {
    try {
      await this.esClient.index(
        ELASTICSEARCH_INDICES.PRODUCTS,
        {
          id: product.id,
          empresaId: product.empresaId,
          nombre: product.nombre,
          descripcion: product.descripcion || '',
          precio: product.precio,
          stock: product.stock || 0,
          familiaId: product.familiaId,
          familiaName: product.familia?.nombre || '',
          imagen: product.imagen || '',
          tags: product.tags || [],
          activo: product.activo ?? true,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        },
        product.id,
      );
    } catch (error) {
      this.logger.error(`Failed to index product ${product.id}`, error);
      throw error;
    }
  }

  async deleteProductIndex(productId: string): Promise<void> {
    try {
      await this.esClient.delete(ELASTICSEARCH_INDICES.PRODUCTS, productId);
    } catch (error) {
      this.logger.error(`Failed to delete product index ${productId}`, error);
      throw error;
    }
  }

  async indexOrder(order: any): Promise<void> {
    try {
      await this.esClient.index(
        ELASTICSEARCH_INDICES.ORDERS,
        {
          id: order.id,
          empresaId: order.empresaId,
          numero: order.numero,
          fecha: order.fecha,
          total: order.total,
          estado: order.estado,
          clienteNombre: order.cliente?.nombre || '',
          clienteEmail: order.cliente?.email || '',
          items: (order.items || []).map((item: any) => ({
            productoNombre: item.producto?.nombre || '',
            cantidad: item.cantidad,
          })),
          createdAt: order.createdAt,
        },
        order.id,
      );
    } catch (error) {
      this.logger.error(`Failed to index order ${order.id}`, error);
      throw error;
    }
  }

  async rebuildProductIndex(empresaId: string): Promise<void> {
    try {
      this.logger.log(`Rebuilding product index for empresa ${empresaId}`);

      // Delete existing index
      await this.esClient.deleteIndex(ELASTICSEARCH_INDICES.PRODUCTS);

      // Recreate index
      await this.esClient.createIndex(
        ELASTICSEARCH_INDICES.PRODUCTS,
        ELASTICSEARCH_SETTINGS.products,
      );

      // Get all products for this empresa
      const products = await this.prisma.producto.findMany({
        where: { empresaId },
        include: { familia: true },
      });

      // Bulk index
      const operations: any[] = [];
      for (const product of products) {
        operations.push({
          index: { _index: ELASTICSEARCH_INDICES.PRODUCTS, _id: product.id },
        });
        operations.push({
          id: product.id,
          empresaId: product.empresaId,
          nombre: product.nombre,
          descripcion: product.descripcion || '',
          precio: product.precio,
          stock: product.stock || 0,
          familiaId: product.familiaId,
          familiaName: product.familia?.nombre || '',
          imagen: product.imagen || '',
          tags: product.tags || [],
          activo: product.activo ?? true,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        });
      }

      if (operations.length > 0) {
        await this.esClient.bulk(operations);
      }

      this.logger.log(
        `Reindexed ${products.length} products for empresa ${empresaId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to rebuild product index for empresa ${empresaId}`,
        error,
      );
      throw error;
    }
  }

  async rebuildOrderIndex(empresaId: string): Promise<void> {
    try {
      this.logger.log(`Rebuilding order index for empresa ${empresaId}`);

      // Delete existing index
      await this.esClient.deleteIndex(ELASTICSEARCH_INDICES.ORDERS);

      // Recreate index
      await this.esClient.createIndex(
        ELASTICSEARCH_INDICES.ORDERS,
        ELASTICSEARCH_SETTINGS.orders,
      );

      // Get all orders for this empresa
      const orders = await this.prisma.venta.findMany({
        where: { empresaId },
        include: {
          cliente: true,
          items: { include: { producto: true } },
        },
      });

      // Bulk index
      const operations: any[] = [];
      for (const order of orders) {
        operations.push({
          index: { _index: ELASTICSEARCH_INDICES.ORDERS, _id: order.id },
        });
        operations.push({
          id: order.id,
          empresaId: order.empresaId,
          numero: order.numero,
          fecha: order.fecha,
          total: order.total,
          estado: order.estado,
          clienteNombre: order.cliente?.nombre || '',
          clienteEmail: order.cliente?.email || '',
          items: (order.items || []).map((item: any) => ({
            productoNombre: item.producto?.nombre || '',
            cantidad: item.cantidad,
          })),
          createdAt: order.createdAt,
        });
      }

      if (operations.length > 0) {
        await this.esClient.bulk(operations);
      }

      this.logger.log(
        `Reindexed ${orders.length} orders for empresa ${empresaId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to rebuild order index for empresa ${empresaId}`,
        error,
      );
      throw error;
    }
  }

  async getFacets(empresaId: string, index: string): Promise<any> {
    try {
      const query =
        index === ELASTICSEARCH_INDICES.PRODUCTS
          ? {
              size: 0,
              query: { term: { empresaId } },
              aggs: {
                familias: {
                  terms: { field: 'familiaName', size: 100 },
                },
                priceRanges: {
                  range: {
                    field: 'precio',
                    ranges: [
                      { to: 50 },
                      { from: 50, to: 100 },
                      { from: 100, to: 500 },
                      { from: 500 },
                    ],
                  },
                },
              },
            }
          : {
              size: 0,
              query: { term: { empresaId } },
              aggs: {
                status: {
                  terms: { field: 'estado', size: 50 },
                },
              },
            };

      const response = await this.esClient.search(index, query);

      if (index === ELASTICSEARCH_INDICES.PRODUCTS) {
        return {
          familias: this._processFacets(response.aggregations?.familias?.buckets),
          priceRanges: this._processPriceRanges(
            response.aggregations?.priceRanges?.buckets,
          ),
        };
      } else {
        return {
          status: this._processFacets(response.aggregations?.status?.buckets),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to get facets for ${index}`, error);
      throw error;
    }
  }

  private _processFacets(buckets: any[] = []): FacetDto[] {
    return buckets.map((bucket: any) => ({
      key: bucket.key_as_string || bucket.key,
      count: bucket.doc_count,
    }));
  }

  private _processPriceRanges(buckets: any[] = []): FacetDto[] {
    return buckets.map((bucket: any, index: number) => {
      let label = '';
      if (bucket.to && !bucket.from) {
        label = `$0 - $${bucket.to}`;
      } else if (bucket.from && !bucket.to) {
        label = `$${bucket.from}+`;
      } else if (bucket.from && bucket.to) {
        label = `$${bucket.from} - $${bucket.to}`;
      }
      return {
        key: label,
        count: bucket.doc_count,
      };
    });
  }
}
