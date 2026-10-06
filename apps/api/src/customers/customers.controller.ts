import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import { BusinessContextService } from '../business-context/business-context.service';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * Phase 1 of the Loyalty roadmap: minimal Cliente CRUD.
 *
 * GET without @RequirePermission — same criterion as catalog.controller.ts
 * and purchases.controller.ts (listSuppliers): any logged-in seller can
 * search/view a customer to associate them to a sale (Phase 2 of the
 * roadmap), just as they can already search products. Mutations
 * (create/edit customer data) do require clientes.gestionar — a permission
 * that already existed in the seed since the initial scaffolding, with no
 * real use until this module.
 *
 * S-V1-03: BusinessContext enters through THE ENTRY BOUNDARY of this
 * surface. The controller resolves the context of the authenticated actor
 * (User → ACTIVE Membership → businessId) and hands the derived empresaId
 * to CustomersService, which remains the legacy service with
 * `forCompany(empresaId)`.
 *
 * Deliberate behavior change: the four handlers NO LONGER read
 * `user.empresaId` from the JWT. That field still exists (the JWT is not
 * touched in this slice, the debt is accepted during the transition) but
 * for Clientes the effective tenant comes from the actor's Membership. If
 * the token said one company and the Membership another, the Membership
 * wins: it is impossible to change the effective tenant from the caller.
 *
 * It is NOT a second isolation or authorization mechanism: the global
 * guards (JwtAuthGuard + PermissionsGuard) and ApprovedDossierGuard remain
 * the same, and the final tenancy enforcement is still
 * CompanyScopedPrismaService + companyScopeExtension.
 */
@ApiTags('clientes')
@ApiBearerAuth()
@Controller('clientes')
@UseGuards(ApprovedDossierGuard) // RF-17: real business operation, see cash-register.controller.ts
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly businessContext: BusinessContextService,
  ) {}

  /**
   * Single context → empresaId translation point for this surface. Fails
   * closed (Forbidden/NotFound/Conflict) without a valid ACTIVE Membership,
   * before touching the domain: the error comes from BusinessContextService,
   * not from a comparison here.
   */
  private async contextCompanyId(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query('search') search?: string) {
    return this.customersService.list(await this.contextCompanyId(user), search);
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.customersService.get(await this.contextCompanyId(user), id);
  }

  @RequirePermission('clientes.gestionar')
  @Post()
  async create(@Body() dto: CreateCustomerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.customersService.create(await this.contextCompanyId(user), dto);
  }

  @RequirePermission('clientes.gestionar')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.update(await this.contextCompanyId(user), id, dto);
  }
}
