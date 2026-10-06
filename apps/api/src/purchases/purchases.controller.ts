import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import { BusinessContextService } from '../business-context/business-context.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PurchasesService } from './purchases.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ReceivePurchaseDto } from './dto/receive-purchase.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { CreateSupplierReturnDto } from './dto/create-supplier-return.dto';

/**
 * RF-12, Phase 1: suppliers, purchase order, receipt. No supplier
 * payments, invoice attachments or returns yet (see
 * docs/scaffolding-notas.md for the agreed scope).
 *
 * Permission: 'compras.gestionar', new in this phase (see seed.ts) —
 * 'productos.gestionar' was not reused because managing the catalog does
 * not imply being able to commit money with a supplier, they are different
 * business authorizations.
 */
@ApiTags('compras')
@ApiBearerAuth()
@Controller()
@UseGuards(ApprovedDossierGuard) // RF-17: real business operation, see cash-register.controller.ts
export class PurchasesController {
  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly businessContext: BusinessContextService,
  ) {}

  private async resolveCompanyIdFromContext(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  @Get('proveedores')
  async listSuppliers(@CurrentUser() user: AuthenticatedUser) {
    return this.purchasesService.listSuppliers(await this.resolveCompanyIdFromContext(user));
  }

  @RequirePermission('compras.gestionar')
  @Post('proveedores')
  async createSupplier(@Body() dto: CreateSupplierDto, @CurrentUser() user: AuthenticatedUser) {
    return this.purchasesService.createSupplier(await this.resolveCompanyIdFromContext(user), dto);
  }

  @RequirePermission('compras.gestionar')
  @Patch('proveedores/:id')
  async updateSupplier(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchasesService.updateSupplier(
      await this.resolveCompanyIdFromContext(user),
      id,
      dto,
    );
  }

  @Get('compras')
  async listPurchases(@CurrentUser() user: AuthenticatedUser) {
    return this.purchasesService.listPurchases(await this.resolveCompanyIdFromContext(user));
  }

  @Get('compras/:id')
  async getPurchase(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.purchasesService.getPurchase(await this.resolveCompanyIdFromContext(user), id);
  }

  @RequirePermission('compras.gestionar')
  @Post('compras')
  async createPurchase(@Body() dto: CreatePurchaseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.purchasesService.createPurchase(
      await this.resolveCompanyIdFromContext(user),
      dto,
      user.id,
    );
  }

  @RequirePermission('compras.gestionar')
  @Post('compras/:id/emitir')
  @HttpCode(HttpStatus.OK)
  async issuePurchase(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.purchasesService.issuePurchase(await this.resolveCompanyIdFromContext(user), id);
  }

  @RequirePermission('compras.gestionar')
  @Post('compras/:id/recepciones')
  @HttpCode(HttpStatus.CREATED)
  async receivePurchase(
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchasesService.receivePurchase(
      await this.resolveCompanyIdFromContext(user),
      id,
      dto,
      user.id,
    );
  }

  @Get('compras/:id/pagos')
  async listPayments(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.purchasesService.listPayments(await this.resolveCompanyIdFromContext(user), id);
  }

  @RequirePermission('compras.gestionar')
  @Post('compras/:id/pagos')
  @HttpCode(HttpStatus.CREATED)
  async createPayment(
    @Param('id') id: string,
    @Body() dto: CreateSupplierPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchasesService.createPayment(
      await this.resolveCompanyIdFromContext(user),
      id,
      dto,
      user.id,
    );
  }

  @Get('compras/:id/devoluciones')
  async listReturns(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.purchasesService.listReturns(await this.resolveCompanyIdFromContext(user), id);
  }

  @RequirePermission('compras.gestionar')
  @Post('compras/:id/devoluciones')
  @HttpCode(HttpStatus.CREATED)
  async createReturn(
    @Param('id') id: string,
    @Body() dto: CreateSupplierReturnDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchasesService.createReturn(
      await this.resolveCompanyIdFromContext(user),
      id,
      dto,
      user.id,
    );
  }
}
