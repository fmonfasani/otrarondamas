import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import 'multer';
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
import { PublishProductsDto } from './dto/publish-products.dto';
import { CatalogStructureService } from './catalog-structure.service';
import { NEW_PRODUCT_FLAGS, nextCatalogFlags } from './catalog-flags';
import { ReorderPhotosDto } from './dto/reorder-photos.dto';
import { PHOTO_MAX_BYTES } from './product-photos';
import { ProductPhotosService, sendPhoto } from './product-photos.service';
import { productAuditEntry, recordAudit, recordAuditMany } from '../auditoria/product-audit';
import {
  CanonicalPermission,
  PRODUCT_UPDATE,
} from '../authorization/canonical-permission.decorator';

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
    private readonly structure: CatalogStructureService,
    private readonly photos: ProductPhotosService,
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

  @CanonicalPermission('CATALOG_VIEW')
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

  @CanonicalPermission('CATALOG_VIEW')
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
  @CanonicalPermission(['CATALOG_MANAGE', 'PRICING_CHANGE'])
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
    // OR-B4-046: a new product stays outside the store unless it is published.
    const flags = nextCatalogFlags(NEW_PRODUCT_FLAGS, {
      activo: dto.activo,
      publicado: dto.publicado,
      destacado: dto.destacado,
    });
    const data: Prisma.ProductoUncheckedCreateInput = {
      nombre: dto.nombre,
      codigoInterno: dto.codigoInterno?.trim() ?? '',
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
      ...flags,
      descripcion: descriptionOf(dto.descripcion),
      stockMinimo: dto.stockMinimo,
      empresaId: companyId,
    };
    // OR-B4-028: a typed code is kept (a duplicate is a 409); an omitted one is
    // generated and regenerated if another product took it in the meantime.
    const generate = !dto.codigoInterno?.trim();
    for (let attempt = 0; ; attempt++) {
      if (generate) data.codigoInterno = await this.structure.nextProductCode(db, dto.familiaId);
      try {
        // OR-B4-041: the new product and its prices go to the audit trail with it.
        return await db.$transaction(async (tx) => {
          const product = await tx.producto.create({ data });
          await recordAudit(tx, companyId, user.id, {
            accion: 'PRODUCTO_CREADO',
            entidad: 'Producto',
            entidadId: product.id,
            despues: {
              nombre: product.nombre,
              codigoInterno: product.codigoInterno,
              costo: product.costo,
              precioMinorista: product.precioMinorista,
              precioMayorista: product.precioMayorista,
              descuentoPorcentaje: product.descuentoPorcentaje,
              publicado: product.publicado,
            },
          });
          return product;
        });
      } catch (error) {
        const duplicate =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!duplicate) throw error;
        if (!generate || attempt >= 4) {
          throw new ConflictException('Ya existe un producto con ese código interno');
        }
      }
    }
  }

  @RequirePermission('productos.gestionar')
  @CanonicalPermission(PRODUCT_UPDATE)
  @Patch(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.resolveCompanyIdFromContext(user);
    const db = this.prismaFactory.forCompany(companyId);
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
    // OR-B4-046: deactivating or unpublishing takes the product out of the store and drops the
    // featured mark; publishing an inactive product is refused.
    const flags = nextCatalogFlags(existing, {
      activo: dto.activo,
      publicado: dto.publicado,
      destacado: dto.destacado,
    });
    const data: Prisma.ProductoUncheckedUpdateInput = {
      ...dto,
      ...flags,
      ...(dto.descripcion === undefined ? {} : { descripcion: descriptionOf(dto.descripcion) }),
    };
    // OR-B4-041: price changes, (de)activations, store changes and edits, with before and after.
    return db.$transaction(async (tx) => {
      const updated = await tx.producto.update({ where: { id }, data });
      const entry = productAuditEntry(existing, updated);
      if (entry) await recordAudit(tx, companyId, user.id, entry);
      return updated;
    });
  }

  /**
   * OR-B4-046 — publish or unpublish many products at once: the ones picked in the list, or a
   * whole category. Only active products are published; unpublishing also drops «destacado».
   * Products already in the asked state are left alone, and each one that changes goes to the
   * audit trail.
   */
  @RequirePermission('productos.gestionar')
  @CanonicalPermission('CATALOG_MANAGE')
  @Post('publicacion')
  @HttpCode(200)
  async publish(@Body() dto: PublishProductsDto, @CurrentUser() user: AuthenticatedUser) {
    const byIds = Boolean(dto.ids?.length);
    if (byIds === Boolean(dto.familiaId)) {
      throw new BadRequestException('Elegí los productos o una categoría.');
    }
    const companyId = await this.resolveCompanyIdFromContext(user);
    const db = this.prismaFactory.forCompany(companyId);
    const where: Prisma.ProductoWhereInput = {
      ...(byIds ? { id: { in: dto.ids } } : { familiaId: dto.familiaId }),
      publicado: !dto.publicado,
      ...(dto.publicado ? { activo: true } : {}),
    };
    return db.$transaction(async (tx) => {
      const products = await tx.producto.findMany({ where, select: { id: true, nombre: true } });
      if (products.length === 0) return { actualizados: 0 };
      await tx.producto.updateMany({
        where: { id: { in: products.map((p) => p.id) } },
        data: dto.publicado ? { publicado: true } : { publicado: false, destacado: false },
      });
      await recordAuditMany(
        tx,
        companyId,
        user.id,
        products.map((product) => ({
          accion: dto.publicado ? 'PRODUCTO_PUBLICADO' : 'PRODUCTO_DESPUBLICADO',
          entidad: 'Producto',
          entidadId: product.id,
          antes: { nombre: product.nombre, publicado: !dto.publicado },
          despues: { nombre: product.nombre, publicado: dto.publicado },
        })),
      );
      return { actualizados: products.length };
    });
  }

  /** OR-B4-046 rule 12 — the photos of a product, in order (the first is the store's photo). */
  @CanonicalPermission('CATALOG_VIEW')
  @Get(':id/fotos')
  async listPhotos(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.photos.list(await this.resolveCompanyIdFromContext(user), id);
  }

  /** Adds a photo (JPG, PNG or WebP, up to 5 MB, up to 5 per product). */
  @RequirePermission('productos.gestionar')
  @CanonicalPermission('CATALOG_MANAGE')
  @Post(':id/fotos')
  // A little above the limit, so a slightly bigger photo gets the Business's own message.
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: PHOTO_MAX_BYTES + 1024 * 1024 } }),
  )
  async addPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.photos.add(await this.resolveCompanyIdFromContext(user), user.id, id, file);
  }

  /** Puts the given photos first, in that order. */
  @RequirePermission('productos.gestionar')
  @CanonicalPermission('CATALOG_MANAGE')
  @Patch(':id/fotos/orden')
  async reorderPhotos(
    @Param('id') id: string,
    @Body() dto: ReorderPhotosDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.photos.reorder(await this.resolveCompanyIdFromContext(user), user.id, id, dto.ids);
  }

  @RequirePermission('productos.gestionar')
  @CanonicalPermission('CATALOG_MANAGE')
  @Delete(':id/fotos/:fotoId')
  async removePhoto(
    @Param('id') id: string,
    @Param('fotoId') photoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.photos.remove(await this.resolveCompanyIdFromContext(user), user.id, id, photoId);
  }

  /** The file of a photo, for the panel (any product of the Business, published or not). */
  @CanonicalPermission('CATALOG_VIEW')
  @Get(':id/fotos/:fotoId')
  async photoFile(
    @Param('id') id: string,
    @Param('fotoId') photoId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const companyId = await this.resolveCompanyIdFromContext(user);
    sendPhoto(
      res,
      await this.photos.file(companyId, id, photoId, { publishedOnly: false }),
      'private',
    );
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
      include: { Tipo: { include: { Subfamilia: true } } },
    });
    if (!subtype) {
      throw new NotFoundException('Subtipo no encontrado');
    }
    if (subtype.tipoId !== ids.tipoId) {
      throw new NotFoundException('El Subtipo indicado no pertenece al Tipo indicado');
    }
    if (subtype.Tipo.subfamiliaId !== ids.subfamiliaId) {
      throw new NotFoundException('El Tipo indicado no pertenece a la Subfamilia indicada');
    }
    if (subtype.Tipo.Subfamilia.familiaId !== ids.familiaId) {
      throw new NotFoundException('La Subfamilia indicada no pertenece a la Familia indicada');
    }
  }
}

/** The store description as typed, without surrounding blanks; empty means none. */
function descriptionOf(value: string | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}
