import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DevolucionesService } from './devoluciones.service';
import {
  CreateDevolucionDto,
  AuthorizeDevolucionDto,
  ReceiveDevolucionDto,
  ProcessRefundDto,
  DevolucionDto,
  RefundDto,
} from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import { BusinessContextService } from '../business-context/business-context.service';
import type { AuthenticatedUser } from '../auth/auth.types';

/* eslint-disable indent -- known false positive of the base `indent` rule
   with decorators on class properties */

@ApiTags('devoluciones')
@ApiBearerAuth()
@Controller('devoluciones')
@UseGuards(ApprovedDossierGuard)
export class DevolucionClienteController {
  constructor(
    private readonly devolucionesService: DevolucionesService,
    private readonly businessContext: BusinessContextService,
  ) {}

  /**
   * Single context → empresaId translation point for this surface.
   */
  private async resolveCompanyIdFromContext(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  @RequirePermission('customers.request_return')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create customer return request' })
  @ApiResponse({ status: 201, type: DevolucionDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async createDevolucione(
    @Body() dto: CreateDevolucionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DevolucionDto> {
    const businessId = await this.resolveCompanyIdFromContext(user);
    return this.devolucionesService.createDevolucione(businessId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List returns' })
  @ApiResponse({ status: 200, type: [DevolucionDto] })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  async listDevoluciones(
    @CurrentUser() user: AuthenticatedUser,
    @Query('estado') estado?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ items: DevolucionDto[]; total: number }> {
    const businessId = await this.resolveCompanyIdFromContext(user);
    return this.devolucionesService.listDevoluciones(businessId, user, {
      estado,
      limit,
      offset,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return details' })
  @ApiResponse({ status: 200, type: DevolucionDto })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getDevolucione(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DevolucionDto> {
    const businessId = await this.resolveCompanyIdFromContext(user);
    return this.devolucionesService.getDevolucione(businessId, user, id);
  }

  @RequirePermission('orders.authorize_returns')
  @Put(':id/authorize')
  @ApiOperation({ summary: 'Authorize return request' })
  @ApiResponse({ status: 200, type: DevolucionDto })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid state transition' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Conflict (state already transitioned)' })
  async authorizeDevolucione(
    @Param('id') id: string,
    @Body() dto: AuthorizeDevolucionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DevolucionDto> {
    const businessId = await this.resolveCompanyIdFromContext(user);
    return this.devolucionesService.authorizeDevolucione(businessId, id, user.id, dto);
  }

  @RequirePermission('orders.process_returns')
  @Put(':id/receive')
  @ApiOperation({ summary: 'Mark return as received' })
  @ApiResponse({ status: 200, type: DevolucionDto })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid state transition' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Conflict (state already transitioned)' })
  async receiveDevolucione(
    @Param('id') id: string,
    @Body() dto: ReceiveDevolucionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DevolucionDto> {
    const businessId = await this.resolveCompanyIdFromContext(user);
    return this.devolucionesService.receiveDevolucione(businessId, id, user.id, dto);
  }

  @RequirePermission('payments.process_refunds')
  @Put(':id/process-refund')
  @ApiOperation({ summary: 'Trigger refund processing' })
  @ApiResponse({
    status: 200,
    description: 'Refund triggered',
    schema: {
      type: 'object',
      properties: {
        devoluccion: { type: 'object', $ref: '#/components/schemas/DevolucionDto' },
        refund: { type: 'object', $ref: '#/components/schemas/RefundDto' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid state transition' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Conflict (state already transitioned)' })
  async processRefund(
    @Param('id') id: string,
    @Body() dto: ProcessRefundDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ devoluccion: DevolucionDto; refund: RefundDto }> {
    const businessId = await this.resolveCompanyIdFromContext(user);
    return this.devolucionesService.processRefund(businessId, id, user.id, dto);
  }
}
