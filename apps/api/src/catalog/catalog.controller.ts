import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { BusinessContextService } from '../business-context/business-context.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApprovedDossierGuard } from '../dossier/guards/approved-dossier.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/**
 * Product CRUD on RF-03 + the hierarchical catalog categorization model
 * (Family → Subfamily → Type → Subtype, see schema.prisma and the catalog
 * definition session). Does not implement the rest of
 * docs/spec-catalogo-productos.md (separate Presentation/SKU variant, origin
 * code, import/reconciliation) — that document remains unapproved for
 * everything else (see docs/scaffolding-notas.md, section 8).
 *
 * No physical DELETE: RF-03 only asks to deactivate (activo=false) via PATCH,
 * same as INV-02 for sales. No endpoint deletes a product from the database.
 *
 * S-V1-04: BusinessContext enters through THE ENTRY BOUNDARY of this surface.
 * The controller resolves the context of the authenticated actor
 * (User → ACTIVE Membership → businessId) and hands the derived empresaId to
 * CompanyScopedPrismaService, which remains the enforcement.
 *
 * Deliberate behavior change: the four handlers no longer read `user.empresaId`
 * from the JWT. That field still exists (the JWT is not touched in this slice,
 * the debt is accepted during the transition) but for Catalog the effective
 * tenant comes from the actor's Membership. If the token said one company and
 * the Membership says another, the Membership wins: it is impossible to change
 * the effective tenant from the caller.
 *
 * This is NOT a second isolation or authorization mechanism: the global guards
 * (JwtAuthGuard + PermissionsGuard) and ApprovedDossierGuard are unchanged,
 * validateHierarchy() is preserved intact, and the final enforcement remains
 * CompanyScopedPrismaService + companyScopeExtension + B3 relation ownership.
 */
@ApiTags('catalogo')
@ApiBearerAuth()
@Controller('catalogo/productos')
@UseGuards(ApprovedDossierGuard) // RF-17: real business operation, see cash-register.controller.ts
export class CatalogController {
  constructor(
    private readonly prismaFactory: CompanyScopedPrismaService,
    private readonly businessContext: BusinessContextService,
  ) {}

  /**
   * Single point of translation context → empresaId for this surface.
   * Fails closed (Forbidden/NotFound/Conflict) without a valid ACTIVE
   * Membership, before touching the domain: the error comes from
   * BusinessContextService, not from a comparison here.
   */
  private async resolveCompanyIdFromContext(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  @Get()
  async listProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Query('activo') active?: string,
    @Query('search') search?: string,
  ) {
    const db = this.prismaFactory.forCompany(await this.resolveCompanyIdFromContext(user));
    const where: Prisma.ProductoWhereInput = {
      ...(active === undefined ? {} : { activo: active === 'true' }),
      // Simple search by name or internal code, case-insensitive.
      // With `search` the result is limited to 50 rows: without this limit, a
      // full listing of the real catalog (4,342 products, see
      // docs/scaffolding-notas.md section 10) is impractical to render in a
      // sale selector. Without `search`, the previous behavior is kept
      // (full listing, no limit) so existing uses of the endpoint keep working.
      /* eslint-disable indent -- known false positive of the `indent` rule
         with a ternary returning a nested object (same pattern as in
         dto/login.dto.ts) */
      ...(search
        ? {
            OR: [
              { nombre: { contains: search, mode: 'insensitive' } },
              { codigoInterno: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      /* eslint-enable indent */
    };
    return db.producto.findMany({
      where,
      orderBy: { nombre: 'asc' },
      ...(search ? { take: 50 } : {}),
    });
  }

  @Get(':id')
  async getProduct(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    // The client is already filtered by the company resolved from the context
    // (see company-scope.extension.ts): if the product belongs to another
    // company, this query simply does not find it, without this controller
    // having to know anything about isolation.
    const db = this.prismaFactory.forCompany(await this.resolveCompanyIdFromContext(user));
    const product = await db.producto.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }

  @RequirePermission('productos.gestionar')
  @Post()
  async createProduct(@Body() dto: CreateProductDto, @CurrentUser() user: AuthenticatedUser) {
    const companyId = await this.resolveCompanyIdFromContext(user);
    const db = this.prismaFactory.forCompany(companyId);
    await this.validateHierarchy(db, {
      familiaId: dto.familiaId,
      subfamiliaId: dto.subfamiliaId,
      tipoId: dto.tipoId,
      subtipoId: dto.subtipoId,
    });
    // empresaId comes from the resolved context (the actor's Membership),
    // never from the JWT or the body: companyScopeExtension also forces it on
    // `create`, so an arbitrary empresaId from the request cannot change the
    // effective tenant. The explicit Prisma.ProductoUncheckedCreateInput
    // annotation ("unchecked" form: familiaId etc. as a plain string, not
    // `familia: { connect: ... } }`) is required because, through the generic
    // type returned by the extension, TypeScript cannot resolve the
    // `Exact<XOR<...>>` that Prisma demands for `create` and rejects it with a
    // confusing error.
    const data: Prisma.ProductoUncheckedCreateInput = {
      nombre: dto.nombre,
      codigoInterno: dto.codigoInterno,
      codigoBarras: dto.codigoBarras,
      marca: dto.marca,
      familiaId: dto.familiaId,
      subfamiliaId: dto.subfamiliaId,
      tipoId: dto.tipoId,
      subtipoId: dto.subtipoId,
      unidadBase: dto.unidadBase,
      costo: dto.costo,
      precioMinorista: dto.precioMinorista,
      precioMayorista: dto.precioMayorista,
      descuentoPorcentaje: dto.descuentoPorcentaje,
      activo: dto.activo,
      empresaId: companyId,
    };
    return db.producto.create({ data });
  }

  @RequirePermission('productos.gestionar')
  @Patch(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const db = this.prismaFactory.forCompany(await this.resolveCompanyIdFromContext(user));
    const existing = await db.producto.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Producto no encontrado');
    }
    // Partial scope: if the body carries ONLY some of the 4 levels (e.g. only
    // the Subtype within the same Subfamily), it is completed with what the
    // product already had before validating the chain — the hierarchy is
    // always validated complete, never partially.
    if (dto.familiaId || dto.subfamiliaId || dto.tipoId || dto.subtipoId) {
      await this.validateHierarchy(db, {
        familiaId: dto.familiaId ?? existing.familiaId,
        subfamiliaId: dto.subfamiliaId ?? existing.subfamiliaId,
        tipoId: dto.tipoId ?? existing.tipoId,
        subtipoId: dto.subtipoId ?? existing.subtipoId,
      });
    }
    const data: Prisma.ProductoUncheckedUpdateInput = { ...dto };
    return db.producto.update({ where: { id }, data });
  }

  /**
   * Verifies that the 4 levels exist, belong to this company AND chain
   * together (Subtype→Type→Subfamily→Family) — none of the 4 can inherit the
   * scope automatically from a simple FK, and nothing prevents the database
   * from holding a real Subtype that belongs to a different Subfamily than the
   * one indicated.
   */
  private async validateHierarchy(
    db: ReturnType<CompanyScopedPrismaService['forCompany']>,
    ids: { familiaId: string; subfamiliaId: string; tipoId: string; subtipoId: string },
  ) {
    const subtype = await db.subtipo.findUnique({
      where: { id: ids.subtipoId },
      include: { tipo: { include: { subfamilia: true } } },
    });
    if (!subtype) {
      throw new NotFoundException('Subtipo no encontrado');
    }
    if (subtype.tipoId !== ids.tipoId) {
      throw new NotFoundException('El Subtipo indicado no pertenece al Tipo indicado');
    }
    if (subtype.tipo.subfamiliaId !== ids.subfamiliaId) {
      throw new NotFoundException('El Tipo indicado no pertenece a la Subfamilia indicada');
    }
    if (subtype.tipo.subfamilia.familiaId !== ids.familiaId) {
      throw new NotFoundException('La Subfamilia indicada no pertenece a la Familia indicada');
    }
  }
}
