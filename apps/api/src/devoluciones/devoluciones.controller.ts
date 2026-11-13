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
  CreateDevolucionDto,
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
 *   PUT  /devoluciones/:id/authorize       authorize (REFUNDS_MANAGE: Owner, Admin)
 *   PUT  /devoluciones/:id/receive         receive + inspect each product (REFUNDS_MANAGE)
 *   PUT  /devoluciones/:id/process-refund  refund by the original method (PAYMENTS_REFUND)
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
    return this.devolucionesService.create(
      await this.companyFor(user, 'SALES_CREATE'),
      user.id,
      dto,
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
}
