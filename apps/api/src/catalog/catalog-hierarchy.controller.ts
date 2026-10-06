import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { BusinessContextService } from '../business-context/business-context.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * Read-only access to the 4 catalog hierarchy tables (Family → Subfamily →
 * Type → Subtype, see schema.prisma). No create/edit from here yet — today
 * the 11 Families and 187 Subfamilies are loaded only from prisma/seed.ts (see
 * seed-data-jerarquia-catalogo.json); a hierarchy CRUD is a separate
 * increment, it does not block being able to pick a level when creating a
 * Product or a LoyaltyRule.
 *
 * Returns the 4 full tables in a single request (11+187+187+187 ≈ 570 rows,
 * lightweight) instead of a nested tree or 4 separate endpoints — the client
 * builds the tree by *Id, like a join. Open to any logged-in user (same
 * criterion as GET /catalogo/productos): choosing where to categorize a
 * product or the scope of a rule is not sensitive business information.
 *
 * S-V1-04: BusinessContext enters through THE ENTRY BOUNDARY of this surface.
 * The effective tenant comes from the actor's Membership, not from the
 * `user.empresaId` of the JWT (which still exists during the transition).
 * The final enforcement remains CompanyScopedPrismaService +
 * companyScopeExtension: without a valid ACTIVE Membership it fails closed
 * before querying the hierarchy.
 */
@ApiTags('catalogo')
@ApiBearerAuth()
@Controller('catalogo/jerarquia')
export class CatalogHierarchyController {
  constructor(
    private readonly prismaFactory: CompanyScopedPrismaService,
    private readonly businessContext: BusinessContextService,
  ) {}

  /**
   * Single point of translation context → empresaId for this surface.
   * Same criterion as CatalogController.resolveCompanyIdFromContext().
   */
  private async resolveCompanyIdFromContext(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const db = this.prismaFactory.forCompany(await this.resolveCompanyIdFromContext(user));
    const [families, subfamilies, types, subtypes] = await Promise.all([
      db.familia.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
      db.subfamilia.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
      db.tipo.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
      db.subtipo.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
    ]);
    return { familias: families, subfamilias: subfamilies, tipos: types, subtipos: subtypes };
  }
}
