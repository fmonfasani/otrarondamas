import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuditReportingService } from './audit-reporting.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentCapabilities } from '../auth/decorators/current-capabilities.decorator';
import { ExtractBusinessContext } from '../business-context/extract-business-context.decorator';
import { Authorize } from '../auth/decorators/authorize.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { AuditLogDto, AuditLogListResponseDto } from './dto/audit-log.dto';
import { AuditSummaryDto } from './dto/summary.dto';
import { CanonicalPermission } from '../authorization/canonical-permission.decorator';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class AuditController {
  constructor(private readonly auditReportingService: AuditReportingService) {}

  /**
   * GET /audit-logs
   * List audit logs with optional filters
   *
   * Permissions:
   * - audit.leer: View own logs only
   * - audit.leer_otros: View all logs in business
   */
  @Get()
  @Authorize('audit.leer')
  @CanonicalPermission('AUDIT_VIEW_OWN')
  @ApiQuery({ name: 'accion', required: false, example: 'VENTA_CREADA' })
  @ApiQuery({ name: 'entidad', required: false, example: 'Venta' })
  @ApiQuery({ name: 'userId', required: false, example: 'user-123' })
  @ApiQuery({ name: 'fecha_desde', required: false, example: '2026-10-01' })
  @ApiQuery({ name: 'fecha_hasta', required: false, example: '2026-10-31' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  async listAuditLogs(
    @CurrentUser() user: AuthenticatedUser,
    @ExtractBusinessContext() businessId: string,
    @CurrentCapabilities() capabilities: string[],
    @Query('accion') accion?: string,
    @Query('entidad') entidad?: string,
    @Query('userId') filterUserId?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<AuditLogListResponseDto> {
    const hasAuditLeerOtros = capabilities.includes('audit.leer_otros');

    return this.auditReportingService.listAuditLogs(businessId, user.id, hasAuditLeerOtros, {
      accion,
      entidad,
      filterUserId,
      fecha_desde,
      fecha_hasta,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  /**
   * GET /audit-logs/:id
   * Get a single audit log detail
   *
   * Permissions:
   * - audit.leer: Own logs only
   * - audit.leer_otros: All logs
   */
  @Get(':id')
  @Authorize('audit.leer')
  @CanonicalPermission('AUDIT_VIEW_OWN')
  async getAuditLogDetail(
    @CurrentUser() user: AuthenticatedUser,
    @ExtractBusinessContext() businessId: string,
    @CurrentCapabilities() capabilities: string[],
    @Param('id') id: string,
  ): Promise<AuditLogDto> {
    const hasAuditLeerOtros = capabilities.includes('audit.leer_otros');

    return this.auditReportingService.getAuditLogDetail(id, businessId, user.id, hasAuditLeerOtros);
  }

  /**
   * GET /audit-logs/summary
   * Aggregated audit statistics
   *
   * Permissions:
   * - audit.leer_otros (ADMIN/OWNER only)
   *
   * Note: This route must be defined AFTER :id to avoid route collision
   */
  @Get('summary/aggregates')
  @Authorize('audit.leer_otros')
  @CanonicalPermission('AUDIT_VIEW_ALL')
  @ApiQuery({
    name: 'fecha_desde',
    required: true,
    example: '2026-10-01',
  })
  @ApiQuery({
    name: 'fecha_hasta',
    required: true,
    example: '2026-10-31',
  })
  @ApiQuery({
    name: 'group_by',
    required: false,
    enum: ['dia', 'accion', 'usuario'],
    example: 'accion',
  })
  async getAuditSummary(
    @ExtractBusinessContext() businessId: string,
    @Query('fecha_desde') fecha_desde: string,
    @Query('fecha_hasta') fecha_hasta: string,
    @Query('group_by') group_by?: 'dia' | 'accion' | 'usuario',
  ): Promise<AuditSummaryDto> {
    if (!fecha_desde || !fecha_hasta) {
      throw new NotFoundException('fecha_desde and fecha_hasta are required');
    }

    return this.auditReportingService.getAuditSummary(businessId, {
      fecha_desde,
      fecha_hasta,
      group_by,
    });
  }

  /**
   * GET /audit-logs/usuario/:userId
   * User activity trail
   *
   * Permissions:
   * - audit.leer: Self only
   * - audit.leer_otros: All users
   */
  @Get('usuario/:userId')
  @Authorize('audit.leer')
  @CanonicalPermission('AUDIT_VIEW_OWN')
  @ApiQuery({ name: 'fecha_desde', required: false, example: '2026-10-20' })
  @ApiQuery({ name: 'fecha_hasta', required: false, example: '2026-10-25' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  async getUserActivityTrail(
    @CurrentUser() user: AuthenticatedUser,
    @ExtractBusinessContext() businessId: string,
    @CurrentCapabilities() capabilities: string[],
    @Param('userId') targetUserId: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<AuditLogListResponseDto> {
    const hasAuditLeerOtros = capabilities.includes('audit.leer_otros');

    return this.auditReportingService.getUserActivityTrail(
      targetUserId,
      businessId,
      user.id,
      hasAuditLeerOtros,
      {
        fecha_desde,
        fecha_hasta,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    );
  }
}
