import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevolucionesService } from './devoluciones.service';
import {
  AuthorizeDevolucionDto,
  CloseDevolucionDto,
  CreateDevolucionDto,
  ExchangeDevolucionDto,
  ReturnSettingsDto,
  ProcessRefundDto,
  ReceiveDevolucionDto,
} from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import { BusinessContextService } from '../business-context/business-context.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CanonicalPermission } from '../authorization/canonical-permission.decorator';
import { hasCanonicalPermission, type Permission } from '../authorization/canonical-permissions';

/**
 * Customer returns (OR-B4-034), registered by the team from the original sale.
 *   POST /devoluciones                     register (SALES_CREATE: Owner, Admin, Vendedor)
 *   GET  /devoluciones[/:id]               view (RETURNS_VIEW)
 *   GET  /devoluciones/ajustes             the return window (RETURNS_VIEW); PUT changes it (REFUNDS_MANAGE)
 *   PUT  /devoluciones/:id/authorize       authorize (REFUNDS_MANAGE: Owner, Admin)
 *   PUT  /devoluciones/:id/receive         receive + inspect each product (REFUNDS_MANAGE)
 *   PUT  /devoluciones/:id/process-refund  refund, full or partial, by the original method (PAYMENTS_REFUND)
 *   PUT  /devoluciones/:id/exchange        exchange for other products instead of a refund (PAYMENTS_REFUND)
 *   PUT  /devoluciones/:id/cancel          cancel before receiving, with a reason (REFUNDS_MANAGE)
 *   PUT  /devoluciones/:id/reject          reject after inspection, with a reason (REFUNDS_MANAGE)
 * Each permission is also checked against the role matrix here, so it holds in every
 * authorization mode (in `shadow` the legacy guard decides).
 */
@ApiTags('devoluciones')
@ApiBearerAuth()
@Controller('devoluciones')
@UseGuards(ApprovedDossierGuard)
export class DevolucionClienteController {
  constructor(
    private readonly devolucionesService: DevolucionesService,
    private readonly businessContext: BusinessContextService,
  ) {}

  /** The caller's company, after checking the role holds `permission`. */
  private async companyFor(user: AuthenticatedUser, permission: Permission): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    if (!hasCanonicalPermission(context.role, permission)) {
      throw new ForbiddenException(`Requiere el permiso ${permission}`);
    }
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  @RequirePermission('ventas.crear')
  @CanonicalPermission('SALES_CREATE')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a customer return from a sale' })
  async createDevolucione(
    @Body() dto: CreateDevolucionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.companyFor(user, 'SALES_CREATE');
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.devolucionesService.create(
      companyId,
      user.id,
      dto,
      new Date(),
      hasCanonicalPermission(context.role, 'REFUNDS_MANAGE'),
    );
  }

  @CanonicalPermission('RETURNS_VIEW')
  @Get()
  @ApiOperation({ summary: 'List returns' })
  async listDevoluciones(
    @CurrentUser() user: AuthenticatedUser,
    @Query('estado') estado?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.devolucionesService.list(await this.companyFor(user, 'RETURNS_VIEW'), {
      estado,
      limit,
      offset,
    });
  }

  @CanonicalPermission('RETURNS_VIEW')
  @Get('ajustes')
  @ApiOperation({ summary: 'The Business return window (OR-B4-035 rule 4)' })
  async getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.devolucionesService.settings(await this.companyFor(user, 'RETURNS_VIEW'));
  }

  @RequirePermission('orders.authorize_returns')
  @CanonicalPermission('REFUNDS_MANAGE')
  @Put('ajustes')
  @ApiOperation({ summary: 'Change the Business return window (OR-B4-035 rule 4)' })
  async updateSettings(@Body() dto: ReturnSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.devolucionesService.updateSettings(
      await this.companyFor(user, 'REFUNDS_MANAGE'),
      user.id,
      dto.plazoDias,
    );
  }

  @CanonicalPermission('RETURNS_VIEW')
  @Get(':id')
  @ApiOperation({ summary: 'Get a return' })
  async getDevolucione(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.devolucionesService.get(await this.companyFor(user, 'RETURNS_VIEW'), id);
  }

  @RequirePermission('orders.authorize_returns')
  @CanonicalPermission('REFUNDS_MANAGE')
  @Put(':id/authorize')
  @ApiOperation({ summary: 'Authorize a return' })
  async authorizeDevolucione(
    @Param('id') id: string,
    @Body() dto: AuthorizeDevolucionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devolucionesService.authorize(
      await this.companyFor(user, 'REFUNDS_MANAGE'),
      id,
      user.id,
      dto.notes,
    );
  }

  @RequirePermission('orders.process_returns')
  @CanonicalPermission('REFUNDS_MANAGE')
  @Put(':id/receive')
  @ApiOperation({ summary: 'Receive the returned products and inspect each one' })
  async receiveDevolucione(
    @Param('id') id: string,
    @Body() dto: ReceiveDevolucionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devolucionesService.receive(
      await this.companyFor(user, 'REFUNDS_MANAGE'),
      id,
      user.id,
      dto,
    );
  }

  @RequirePermission('payments.process_refunds')
  @CanonicalPermission('PAYMENTS_REFUND')
  @Put(':id/process-refund')
  @ApiOperation({ summary: 'Refund by the method the sale was paid with' })
  async processRefund(
    @Param('id') id: string,
    @Body() dto: ProcessRefundDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devolucionesService.processRefund(
      await this.companyFor(user, 'PAYMENTS_REFUND'),
      id,
      user.id,
      dto,
    );
  }

  @RequirePermission('orders.authorize_returns')
  @CanonicalPermission('REFUNDS_MANAGE')
  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel a return before its products are received (OR-B4-035)' })
  async cancelDevolucion(
    @Param('id') id: string,
    @Body() dto: CloseDevolucionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devolucionesService.cancel(
      await this.companyFor(user, 'REFUNDS_MANAGE'),
      id,
      user.id,
      dto.motivo,
    );
  }

  @RequirePermission('orders.process_returns')
  @CanonicalPermission('REFUNDS_MANAGE')
  @Put(':id/reject')
  @ApiOperation({ summary: 'Reject a return after inspecting its products (OR-B4-035)' })
  async rejectDevolucion(
    @Param('id') id: string,
    @Body() dto: CloseDevolucionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devolucionesService.reject(
      await this.companyFor(user, 'REFUNDS_MANAGE'),
      id,
      user.id,
      dto.motivo,
    );
  }

  @RequirePermission('payments.process_refunds')
  @CanonicalPermission('PAYMENTS_REFUND')
  @Put(':id/exchange')
  @ApiOperation({ summary: 'Exchange the returned products for others (OR-B4-035 rule 2)' })
  async exchangeDevolucion(
    @Param('id') id: string,
    @Body() dto: ExchangeDevolucionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.companyFor(user, 'PAYMENTS_REFUND');
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    if (!hasCanonicalPermission(context.role, 'SALES_CREATE')) {
      throw new ForbiddenException('Requiere el permiso SALES_CREATE');
    }
    return this.devolucionesService.exchange(companyId, id, user.id, dto);
  }
}
