import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PlatformAdminGuard } from './platform-admin.guard';
import { CanonicalPermission } from '../authorization/canonical-permission.decorator';
import { PlatformAdminService } from './platform-admin.service';

/**
 * Wapsell platform administration (OR-B4-020, first stage OR-B4-038: read-only, aggregates).
 * Every route needs PLATFORM_BUSINESSES_VIEW, held only by the emails in
 * PLATFORM_ADMIN_EMAILS (PlatformAdminGuard; empty list = nobody). Never a Business role.
 */
@Controller('platform-admin')
@UseGuards(PlatformAdminGuard)
export class PlatformAdminController {
  constructor(private readonly platform: PlatformAdminService) {}

  @CanonicalPermission('PLATFORM_BUSINESSES_VIEW')
  @Get('overview')
  getOverview() {
    return this.platform.overview();
  }

  @CanonicalPermission('PLATFORM_BUSINESSES_VIEW')
  @Get('businesses')
  listBusinesses(@Query('search') search?: string, @Query('page') page?: string) {
    return this.platform.listBusinesses({ search, page: Number(page) || 1 });
  }

  @CanonicalPermission('PLATFORM_BUSINESSES_VIEW')
  @Get('businesses/:id')
  businessDetail(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.platform.businessDetail(id, user.id);
  }
}
