import {
  Controller,
  Get,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../auth/guards/authorization.guard';
import { Authorize } from '../../auth/decorators/authorize.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuditReportingService } from '../../audit/audit-reporting.service';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class AuditAdminController {
  constructor(private readonly auditService: AuditReportingService) {}

  @Get('logs')
  @Authorize('audit.view')
  async getAuditLogs(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('accion') accion?: string,
    @Query('entidad') entidad?: string,
    @Query('usuarioId') usuarioId?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 25;

    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    const offset = (pageNum - 1) * limitNum;

    // Admin has audit.view which implies audit.leer_otros
    const result = await this.auditService.listAuditLogs(user.empresaId, user.id, true, {
      accion,
      entidad,
      filterUserId: usuarioId,
      offset,
      limit: limitNum,
    });

    return {
      data: result.items,
      total: result.total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(result.total / limitNum),
    };
  }

  @Get('logs/export')
  @Authorize('audit.view')
  async exportAuditLogs(
    @CurrentUser() user: any,
    @Query('format') format: 'csv' | 'json' = 'json',
    @Query('accion') accion?: string,
    @Query('entidad') entidad?: string,
  ) {
    if (!['csv', 'json'].includes(format)) {
      throw new BadRequestException('Invalid format. Must be csv or json');
    }

    const result = await this.auditService.listAuditLogs(user.empresaId, user.id, true, {
      accion,
      entidad,
      limit: 10000, // Max export
      offset: 0,
    });

    if (format === 'csv') {
      return this.convertToCSV(result.items);
    } else {
      return result.items;
    }
  }

  private convertToCSV(logs: any[]): string {
    const headers = [
      'ID',
      'Empresa ID',
      'Usuario ID',
      'Acción',
      'Entidad Afectada',
      'Entidad ID',
      'Fecha/Hora',
      'Motivo',
    ];
    const rows = logs.map((log) => [
      log.id,
      log.empresaId,
      log.usuarioId || '',
      log.accion,
      log.entidadAfectada,
      log.entidadId || '',
      log.fechaHora.toISOString(),
      log.motivo || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => (typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell)).join(','),
      ),
    ].join('\n');

    return csvContent;
  }
}
