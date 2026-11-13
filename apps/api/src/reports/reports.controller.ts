import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BusinessContextService } from '../business-context/business-context.service';
import { CanonicalPermission } from '../authorization/canonical-permission.decorator';
import { hasCanonicalPermission } from '../authorization/canonical-permissions';
import { ReportsService } from './reports.service';

/**
 * Reportes (OR-B4-036). GET /reportes/resumen?desde=AAAA-MM-DD&hasta=AAAA-MM-DD — REPORTS_VIEW
 * (Owner, Admin), also checked against the role matrix here so it holds in every
 * authorization mode.
 */
@ApiTags('reportes')
@ApiBearerAuth()
@Controller('reportes')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly businessContext: BusinessContextService,
  ) {}

  @RequirePermission('metrics.read')
  @CanonicalPermission('REPORTS_VIEW')
  @Get('resumen')
  @ApiOperation({ summary: 'What the Business sold in a period, net of returns (OR-B4-036)' })
  async summary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    if (!hasCanonicalPermission(context.role, 'REPORTS_VIEW')) {
      throw new ForbiddenException('Requiere el permiso REPORTS_VIEW');
    }
    const companyId = await this.businessContext.resolveCompanyId(context.businessId);
    return this.reports.summary(companyId, String(desde ?? ''), String(hasta ?? ''));
  }
}
