import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { BusinessContextService } from '../business-context/business-context.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { InventoryService } from './inventory.service';
import { RegisterAdjustmentDto } from './dto/register-adjustment.dto';

/**
 * Phase 1 of the inventory roadmap (RF-11 / INV-CONS-*): read-only
 * queries. Phase 2 (INV-AJ-*): manual adjustments. Phase 3 (batch intake)
 * redefined — receiving a purchase (apps/api/src/purchases) already covers
 * that case, no separate endpoint was added here. Phase 4 (INV-AL-*):
 * low stock and expiry alerts.
 */
@ApiTags('inventario')
@ApiBearerAuth()
@Controller('inventario')
@UseGuards(ApprovedDossierGuard) // RF-17: real business operation, see cash-register.controller.ts
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly prismaFactory: CompanyScopedPrismaService,
    private readonly businessContext: BusinessContextService,
  ) {}

  private async resolveCompanyIdFromContext(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  // INV-CONS-01 / INV-CONS-04: consolidated stock per product, with the same
  // search/pagination contract as GET /catalogo/productos (see
  // catalog.controller.ts) so as not to introduce a second filtering
  // criterion in the same frontend.
  @Get('stock')
  async stock(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('soloConStockBajo') onlyLowStock?: string,
  ) {
    return this.inventoryService.consolidatedStock(
      await this.resolveCompanyIdFromContext(user),
      search,
      onlyLowStock === 'true',
    );
  }

  // INV-CONS-02: batch detail of a product — where the total shown by
  // GET /inventario/stock comes from.
  @Get('productos/:id/lotes')
  async batchesForProduct(@Param('id') productId: string, @CurrentUser() user: AuthenticatedUser) {
    const db = this.prismaFactory.forCompany(await this.resolveCompanyIdFromContext(user));
    const product = await db.producto.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return db.lote.findMany({
      where: { productoId: productId },
      orderBy: { vencimiento: 'asc' },
    });
  }

  // INV-CONS-03: MovimientoStock history of a product — they are already
  // generated from SalesService.deductStock() on every sale, this endpoint
  // only exposes them, it does not create any new one.
  @Get('productos/:id/movimientos')
  async movementsForProduct(
    @Param('id') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const db = this.prismaFactory.forCompany(await this.resolveCompanyIdFromContext(user));
    const product = await db.producto.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return db.movimientoStock.findMany({
      where: { productoId: productId },
      orderBy: { createdAt: 'desc' },
      take: 100, // evita traer un historial ilimitado en un solo request
    });
  }

  // INV-AJ-01/02/03/04: manual adjustment on a specific batch. Protected
  // with the inventario.ajustes permission, which already existed in the seed
  // before this phase (see docs/scaffolding-notas.md section 16).
  @RequirePermission('inventario.ajustes')
  @Post('ajustes')
  @HttpCode(HttpStatus.CREATED)
  async registerAdjustment(
    @Body() dto: RegisterAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.registerAdjustment(
      await this.resolveCompanyIdFromContext(user),
      dto,
      user.id,
    );
  }

  // INV-AL-01/02/03: low-stock products and batches about to expire, in a
  // single endpoint (both feed the same alerts badge in the frontend).
  // Read-only, no additional permission — same criterion as
  // GET /inventario/stock.
  @Get('alertas')
  async alerts(@CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.alerts(await this.resolveCompanyIdFromContext(user));
  }
}
