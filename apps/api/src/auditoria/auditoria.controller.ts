import { Controller, ForbiddenException, Get, Header, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BusinessContextService } from '../business-context/business-context.service';
import { CanonicalPermission } from '../authorization/canonical-permission.decorator';
import { hasCanonicalPermission } from '../authorization/canonical-permissions';
import { AuditoriaService, type AuditFilters, type AuditViewer } from './auditoria.service';

/**
 * Business audit (OR-B4-041).
 *   GET /auditoria            the trail: the Owner sees everything (AUDIT_VIEW_ALL), the rest
 *                             only their own entries (AUDIT_VIEW_OWN); filters desde, hasta
 *                             (AAAA-MM-DD), usuarioId (Owner only), tema, page
 *   GET /auditoria/exportar   the same filters as CSV — Owner only; the download is recorded
 *   GET /auditoria/:id        one entry with what changed, secrets hidden
 * Permissions are also checked against the role matrix here, so they hold in every
 * authorization mode.
 */
@ApiTags('auditoria')
@ApiBearerAuth()
@Controller('auditoria')
export class AuditoriaController {
  constructor(
    private readonly auditoria: AuditoriaService,
    private readonly businessContext: BusinessContextService,
  ) {}

  private async scope(user: AuthenticatedUser, needAll = false) {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    const todo = hasCanonicalPermission(context.role, 'AUDIT_VIEW_ALL');
    if (!hasCanonicalPermission(context.role, 'AUDIT_VIEW_OWN') || (needAll && !todo)) {
      throw new ForbiddenException(
        `Requiere el permiso ${needAll ? 'AUDIT_VIEW_ALL' : 'AUDIT_VIEW_OWN'}`,
      );
    }
    const companyId = await this.businessContext.resolveCompanyId(context.businessId);
    const viewer: AuditViewer = { usuarioId: user.id, todo };
    return { companyId, viewer };
  }

  private filters(q: Record<string, string | undefined>): AuditFilters {
    return {
      desde: q.desde || undefined,
      hasta: q.hasta || undefined,
      usuarioId: q.usuarioId || undefined,
      tema: q.tema || undefined,
      page: Number(q.page) || 1,
    };
  }

  @RequirePermission('audit.leer')
  @CanonicalPermission('AUDIT_VIEW_OWN')
  @Get()
  @ApiOperation({ summary: 'The Business audit trail (OR-B4-041)' })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() q: Record<string, string>) {
    const { companyId, viewer } = await this.scope(user);
    return this.auditoria.list(companyId, viewer, this.filters(q));
  }

  @RequirePermission('audit.leer_otros')
  @CanonicalPermission('AUDIT_VIEW_ALL')
  @Get('exportar')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: 'Download the audit trail as CSV (Owner, OR-B4-041)' })
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: Record<string, string>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { companyId, viewer } = await this.scope(user, true);
    const { csv, filas, recortado } = await this.auditoria.exportCsv(
      companyId,
      viewer,
      this.filters(q),
    );
    res.setHeader('Content-Disposition', 'attachment; filename="auditoria.csv"');
    res.setHeader('X-Filas', String(filas));
    if (recortado) res.setHeader('X-Recortado', '1');
    return csv;
  }

  @RequirePermission('audit.leer')
  @CanonicalPermission('AUDIT_VIEW_OWN')
  @Get(':id')
  @ApiOperation({ summary: 'One audit entry with what changed' })
  async detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const { companyId, viewer } = await this.scope(user);
    return this.auditoria.detail(companyId, viewer, id);
  }
}
