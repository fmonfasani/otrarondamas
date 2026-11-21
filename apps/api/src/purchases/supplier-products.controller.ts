import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import { BusinessContextService } from '../business-context/business-context.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CanonicalPermission } from '../authorization/canonical-permission.decorator';
import { SupplierProductsService } from './supplier-products.service';
import { DraftFromSuggestionDto, SaveSupplierProductDto } from './dto/supplier-product.dto';

/**
 * OR-B4-052 (stage D1) — the products each supplier provides and the purchase suggestion. Reading
 * needs PURCHASES_VIEW and changing needs PURCHASES_MANAGE (Owner, Admin, Gestor de stock), like the
 * rest of purchases.
 */
@ApiTags('compras')
@ApiBearerAuth()
@Controller()
@UseGuards(ApprovedDossierGuard)
export class SupplierProductsController {
  constructor(
    private readonly supplierProducts: SupplierProductsService,
    private readonly businessContext: BusinessContextService,
  ) {}

  private async companyOf(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  @CanonicalPermission('PURCHASES_VIEW')
  @Get('proveedores/:id/productos')
  async list(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.supplierProducts.list(await this.companyOf(user), id);
  }

  @RequirePermission('compras.gestionar')
  @CanonicalPermission('PURCHASES_MANAGE')
  @Put('proveedores/:id/productos/:productoId')
  async save(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('productoId', ParseUUIDPipe) productoId: string,
    @Body() dto: SaveSupplierProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supplierProducts.save(await this.companyOf(user), id, productoId, dto);
  }

  @RequirePermission('compras.gestionar')
  @CanonicalPermission('PURCHASES_MANAGE')
  @Delete('proveedores/:id/productos/:productoId')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('productoId', ParseUUIDPipe) productoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supplierProducts.remove(await this.companyOf(user), id, productoId);
  }

  @CanonicalPermission('PURCHASES_VIEW')
  @Get('sugerencia-compra')
  async suggestion(@CurrentUser() user: AuthenticatedUser) {
    return this.supplierProducts.suggestion(await this.companyOf(user));
  }

  @RequirePermission('compras.gestionar')
  @CanonicalPermission('PURCHASES_MANAGE')
  @Post('sugerencia-compra/orden')
  async draft(@Body() dto: DraftFromSuggestionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.supplierProducts.draftFromSuggestion(
      await this.companyOf(user),
      user.id,
      dto.proveedorId,
      dto.items,
    );
  }
}
