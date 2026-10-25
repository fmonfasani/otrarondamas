import { Injectable, Logger } from '@nestjs/common';
import { SearchService } from './search.service';

/**
 * P14-1: Search Sync Listeners
 *
 * This service provides hooks that can be called from domain events (e.g., ProductCreated,
 * ProductUpdated, ProductDeleted, OrderStatusChanged) to keep Elasticsearch indices
 * in sync with the database.
 *
 * Integration points:
 * - ProductService: call indexProduct on create/update, deleteProductIndex on delete
 * - OrderService: call indexOrder on status change
 * - Reindex handlers: use rebuildProductIndex, rebuildOrderIndex when needed
 */
@Injectable()
export class SearchSyncListener {
  private logger = new Logger('SearchSyncListener');

  constructor(private searchService: SearchService) {}

  /**
   * Called after a product is created or updated.
   * Adds/updates the product in the Elasticsearch index.
   */
  async onProductSaved(product: any): Promise<void> {
    try {
      await this.searchService.indexProduct(product);
      this.logger.debug(`Indexed product ${product.id}`);
    } catch (error) {
      this.logger.error(`Failed to index product ${product.id}`, error);
      // Don't throw - indexing failures shouldn't block product operations
    }
  }

  /**
   * Called after a product is deleted.
   * Removes the product from the Elasticsearch index.
   */
  async onProductDeleted(productId: string): Promise<void> {
    try {
      await this.searchService.deleteProductIndex(productId);
      this.logger.debug(`Deleted product index ${productId}`);
    } catch (error) {
      this.logger.error(`Failed to delete product index ${productId}`, error);
      // Don't throw - index cleanup failures shouldn't block product deletion
    }
  }

  /**
   * Called after an order is created or status is changed.
   * Adds/updates the order in the Elasticsearch index.
   */
  async onOrderSaved(order: any): Promise<void> {
    try {
      await this.searchService.indexOrder(order);
      this.logger.debug(`Indexed order ${order.id}`);
    } catch (error) {
      this.logger.error(`Failed to index order ${order.id}`, error);
      // Don't throw - indexing failures shouldn't block order operations
    }
  }

  /**
   * Called when full reindex is needed (e.g., data migration, index corruption).
   * Rebuilds the entire product index for an empresa.
   */
  async onRebuildProductIndex(empresaId: string): Promise<void> {
    try {
      this.logger.log(`Starting product index rebuild for empresa ${empresaId}`);
      await this.searchService.rebuildProductIndex(empresaId);
      this.logger.log(`Completed product index rebuild for empresa ${empresaId}`);
    } catch (error) {
      this.logger.error(
        `Failed to rebuild product index for empresa ${empresaId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Called when full reindex is needed (e.g., data migration, index corruption).
   * Rebuilds the entire order index for an empresa.
   */
  async onRebuildOrderIndex(empresaId: string): Promise<void> {
    try {
      this.logger.log(`Starting order index rebuild for empresa ${empresaId}`);
      await this.searchService.rebuildOrderIndex(empresaId);
      this.logger.log(`Completed order index rebuild for empresa ${empresaId}`);
    } catch (error) {
      this.logger.error(
        `Failed to rebuild order index for empresa ${empresaId}`,
        error,
      );
      throw error;
    }
  }
}

/**
 * Usage Examples:
 *
 * In ProductService:
 * ──────────────────
 * constructor(
 *   private prisma: PrismaService,
 *   private searchListener: SearchSyncListener,
 * ) {}
 *
 * async createProduct(data: CreateProductDto) {
 *   const product = await this.prisma.producto.create({ data });
 *   await this.searchListener.onProductSaved(product);
 *   return product;
 * }
 *
 * async updateProduct(id: string, data: UpdateProductDto) {
 *   const product = await this.prisma.producto.update({
 *     where: { id },
 *     data,
 *     include: { familia: true },
 *   });
 *   await this.searchListener.onProductSaved(product);
 *   return product;
 * }
 *
 * async deleteProduct(id: string) {
 *   await this.prisma.producto.delete({ where: { id } });
 *   await this.searchListener.onProductDeleted(id);
 * }
 *
 * In OrderService:
 * ────────────────
 * async updateOrderStatus(orderId: string, newStatus: string) {
 *   const order = await this.prisma.venta.update({
 *     where: { id: orderId },
 *     data: { estado: newStatus },
 *     include: { cliente: true, items: { include: { producto: true } } },
 *   });
 *   await this.searchListener.onOrderSaved(order);
 *   return order;
 * }
 *
 * In a Reindex Controller/Service:
 * ────────────────────────────────
 * async triggerReindex(empresaId: string, indexType: 'products' | 'orders') {
 *   if (indexType === 'products') {
 *     await this.searchListener.onRebuildProductIndex(empresaId);
 *   } else {
 *     await this.searchListener.onRebuildOrderIndex(empresaId);
 *   }
 *   return { status: 'ok', message: `Reindexed ${indexType}` };
 * }
 */
