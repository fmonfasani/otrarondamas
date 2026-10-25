import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * C5A/C5B: Public Store API surface — /store/catalog and /store/hierarchy.
 * These are the C5-level equivalents of the legacy /tienda/* routes,
 * designed for the cart/checkout UX (apps/tienda-online, apps/pos-admin).
 *
 * Both are @Public() — no authentication required.
 */
@ApiTags('store')
@Controller('store')
export class StoreApiController {
  constructor(private readonly storeService: StoreService) {}

  /**
   * GET /store/catalog — Public product listing with prices and stock.
   *
   * Query params:
   * - search (optional): text search in product names/codes
   * - familiaId (optional): filter by Familia id
   * - subfamiliaId (optional): filter by Subfamilia id
   *
   * Response: Array of products with structure:
   * {
   *   productoId, nombre, codigoInterno,
   *   familiaId, subfamiliaId, tipoId, subtipoId, unidadBase,
   *   precio, precioSinDescuento, descuentoPorcentaje,
   *   disponible, stockTotal
   * }
   *
   * Notes:
   * - Uses TIENDA_EMPRESA_ID from env (Phase 1-3: single public store per deploy)
   * - Prices include product's global discount if present
   * - Stock is consolidated from Lote quantities, 0 if no lotes exist
   * - All products are filtered to activo=true
   */
  @Public()
  @Get('catalog')
  catalog(
    @Query('search') search?: string,
    @Query('familiaId') familiaId?: string,
    @Query('subfamiliaId') subfamiliaId?: string,
  ) {
    return this.storeService.catalog(search, familiaId, subfamiliaId);
  }

  /**
   * GET /store/hierarchy — Active Familia and Subfamilia to build filter chips.
   *
   * Response:
   * {
   *   familias: [{ id, nombre, prefijo, empresaId, ... }],
   *   subfamilias: [{ id, nombre, prefijo, empresaId, familiaId, ... }]
   * }
   *
   * Notes:
   * - Only active (activo=true) families and subfamilies are returned
   * - Ordered by nombre ascending
   * - No Tipo/Subtipo included (filter only goes to Subfamilia level)
   * - All records belong to the public store's TIENDA_EMPRESA_ID
   */
  @Public()
  @Get('hierarchy')
  hierarchy() {
    return this.storeService.hierarchy();
  }
}
