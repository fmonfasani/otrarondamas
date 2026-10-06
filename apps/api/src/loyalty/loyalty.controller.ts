import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { CreateLoyaltyRuleDto } from './dto/create-loyalty-rule.dto';
import { UpdateLoyaltyRuleDto } from './dto/update-loyalty-rule.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import { BusinessContextService } from '../business-context/business-context.service';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * Phase 4 of the Loyalty roadmap — CRUD of ReglaFidelizacion.
 *
 * Unlike Purchases/Catalog (GET open to any logged-in seller), here
 * EVERYTHING requires fidelizacion.gestionar, including GETs — same
 * criterion as orders.controller.ts: seeing which discount rules exist is
 * the business's pricing policy information, not equivalent to viewing
 * the product catalog.
 */
@ApiTags('fidelizacion')
@ApiBearerAuth()
@Controller('reglas-fidelizacion')
@UseGuards(ApprovedDossierGuard) // RF-17: real business operation, see cash-register.controller.ts
export class LoyaltyController {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly businessContext: BusinessContextService,
  ) {}

  private async resolveCompanyIdFromContext(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  @RequirePermission('fidelizacion.gestionar')
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.loyaltyService.list(await this.resolveCompanyIdFromContext(user));
  }

  @RequirePermission('fidelizacion.gestionar')
  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.loyaltyService.get(await this.resolveCompanyIdFromContext(user), id);
  }

  @RequirePermission('fidelizacion.gestionar')
  @Post()
  async create(@Body() dto: CreateLoyaltyRuleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.loyaltyService.create(await this.resolveCompanyIdFromContext(user), dto);
  }

  @RequirePermission('fidelizacion.gestionar')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLoyaltyRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.loyaltyService.update(await this.resolveCompanyIdFromContext(user), id, dto);
  }
}
