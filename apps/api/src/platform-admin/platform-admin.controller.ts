import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PlatformAdminGuard } from './platform-admin.guard';
import { CanonicalPermission } from '../authorization/canonical-permission.decorator';
import { PlatformAdminService } from './platform-admin.service';

/* eslint-disable indent */
export class CreatePlatformBusinessDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre: string;

  @IsString()
  @MinLength(3)
  @MaxLength(40)
  slug: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  ownerNombre: string;

  @IsEmail()
  @MaxLength(200)
  ownerEmail: string;
}
/* eslint-enable indent */

/**
 * Wapsell platform administration (OR-B4-020, first stage OR-B4-038: read-only, aggregates).
 * Reads need PLATFORM_BUSINESSES_VIEW and creating a Business PLATFORM_BUSINESSES_MANAGE
 * (OR-B4-039); both held only by the emails in
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

  /** OR-B4-039 — create a Business with its Owner (welcome email with the password link). */
  @CanonicalPermission('PLATFORM_BUSINESSES_MANAGE')
  @Post('businesses')
  createBusiness(@Body() dto: CreatePlatformBusinessDto, @CurrentUser() user: AuthenticatedUser) {
    return this.platform.createBusiness(dto, user.id);
  }

  @CanonicalPermission('PLATFORM_BUSINESSES_VIEW')
  @Get('businesses/:id')
  businessDetail(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.platform.businessDetail(id, user.id);
  }
}
