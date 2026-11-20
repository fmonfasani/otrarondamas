import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Post,
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
import { CanonicalPermission } from '../authorization/canonical-permission.decorator';
import { productAuditEntry, recordAuditMany } from '../auditoria/product-audit';
import type { AuditEntry } from '../auditoria/audit-catalog';
import { ApplyBulkPriceDto, BULK_PRICE_MAX, BulkPriceDto } from './dto/bulk-price.dto';
import { describeRule, priceUnder, type PriceRule } from './bulk-pricing';

type Candidate = {
  id: string;
  nombre: string;
  codigoInterno: string;
  marca: string | null;
  costo: Prisma.Decimal;
  precioMinorista: Prisma.Decimal;
};

/**
 * OR-B4-046 §4.3, stage C2 — bulk price update, under PRICING_CHANGE (Owner and Admin). First a
 * preview (nothing changes), then the person applies it to the products they saw: if a price
 * changed in between, nothing is applied. Each product that changes is a price change in the
 * audit trail, with the rule as the reason, and its pending suggestion (stage C1) is answered.
 */
@ApiTags('catalogo')
@ApiBearerAuth()
@Controller('catalogo/precios')
@UseGuards(ApprovedDossierGuard)
export class CatalogPricesController {
  constructor(
    private readonly prismaFactory: CompanyScopedPrismaService,
    private readonly businessContext: BusinessContextService,
  ) {}

  private async companyOf(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  private ruleOf(dto: BulkPriceDto): PriceRule {
    if (dto.modo === 'margen' && dto.valor < 0) {
      throw new BadRequestException('La ganancia sobre el costo no puede ser negativa.');
    }
    return { modo: dto.modo, valor: dto.valor, redondeo: dto.redondeo };
  }

  /** The active products of the category, brand and supplier asked (all of them when none is). */
  private whereOf(dto: BulkPriceDto): Prisma.ProductoWhereInput {
    const marca = dto.marca?.trim();
    return {
      activo: true,
      ...(dto.familiaId ? { familiaId: dto.familiaId } : {}),
      ...(marca ? { marca: { equals: marca, mode: 'insensitive' } } : {}),
      // A supplier's products: the ones linked to it, or ever bought from it.
      ...(dto.proveedorId
        ? {
            OR: [
              { ProductoProveedor: { some: { proveedorId: dto.proveedorId } } },
              { CompraItem: { some: { Compra: { proveedorId: dto.proveedorId } } } },
            ],
          }
        : {}),
    };
  }

  private static readonly SELECT = {
    id: true,
    nombre: true,
    codigoInterno: true,
    marca: true,
    costo: true,
    precioMinorista: true,
  } as const;

  @RequirePermission('productos.gestionar')
  @CanonicalPermission('PRICING_CHANGE')
  @Post('vista-previa')
  @HttpCode(200)
  async preview(@Body() dto: BulkPriceDto, @CurrentUser() user: AuthenticatedUser) {
    const rule = this.ruleOf(dto);
    const db = this.prismaFactory.forCompany(await this.companyOf(user));
    const products: Candidate[] = await db.producto.findMany({
      where: this.whereOf(dto),
      select: CatalogPricesController.SELECT,
      orderBy: { nombre: 'asc' },
      take: BULK_PRICE_MAX + 1,
    });
    if (products.length > BULK_PRICE_MAX) {
      throw new BadRequestException(
        `Son más de ${BULK_PRICE_MAX} productos: elegí una categoría, una marca o un proveedor.`,
      );
    }
    const rows = products.map((p) => {
      const next = priceUnder(p, rule);
      return {
        productoId: p.id,
        nombre: p.nombre,
        codigoInterno: p.codigoInterno,
        marca: p.marca,
        costo: p.costo.toNumber(),
        precioActual: p.precioMinorista.toNumber(),
        precioNuevo: next?.toNumber() ?? null,
        cambia: next !== null && !next.equals(p.precioMinorista),
      };
    });
    return {
      regla: describeRule(rule),
      productos: rows,
      cambian: rows.filter((r) => r.cambia).length,
    };
  }

  @RequirePermission('productos.gestionar')
  @CanonicalPermission('PRICING_CHANGE')
  @Post('actualizacion')
  @HttpCode(200)
  async apply(@Body() dto: ApplyBulkPriceDto, @CurrentUser() user: AuthenticatedUser) {
    const rule = this.ruleOf(dto);
    const companyId = await this.companyOf(user);
    const db = this.prismaFactory.forCompany(companyId);
    const seen = new Map(dto.items.map((item) => [item.productoId, item.precioActual]));
    try {
      return await db.$transaction(
        async (tx) => {
          const products = await tx.producto.findMany({
            where: { ...this.whereOf(dto), id: { in: [...seen.keys()] } },
          });
          // A product that left the selection, or whose price moved since the preview.
          const moved = [...seen.entries()].filter(([id, price]) => {
            const current = products.find((p) => p.id === id);
            return !current || !current.precioMinorista.equals(price);
          });
          if (moved.length > 0) {
            throw new ConflictException(
              'Algunos precios cambiaron mientras revisabas. Volvé a ver los cambios antes de aplicarlos.',
            );
          }
          const reason = `Actualización masiva: ${describeRule(rule)}`;
          const audit: AuditEntry[] = [];
          for (const product of products) {
            const next = priceUnder(product, rule);
            if (next === null || next.equals(product.precioMinorista)) continue;
            const updated = await tx.producto.update({
              where: { id: product.id },
              data: { precioMinorista: next, precioSugerido: null },
            });
            const entry = productAuditEntry(product, updated);
            if (entry) audit.push({ ...entry, motivo: reason });
          }
          if (audit.length > 0) await recordAuditMany(tx, companyId, user.id, audit);
          return { actualizados: audit.length, regla: describeRule(rule) };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException(
          'Otra persona cambió precios al mismo tiempo. Volvé a ver los cambios antes de aplicarlos.',
        );
      }
      throw error;
    }
  }
}
