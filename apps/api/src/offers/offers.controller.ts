import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
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
import { recordAudit } from '../auditoria/audit-catalog';
import { CreateOfferDto } from './dto/create-offer.dto';
import { offerState, offerWindow } from './offer-price';

/**
 * OR-B4-046 §4.4 (D4), stage C3 — the business's offers. Everyone who sees the Mercadería sees
 * them; only who holds PROMOTIONS_MANAGE (Owner and Admin, §4.11) creates and ends them. An offer
 * is never edited or deleted: it ends, and a new one is created. Both steps are in the audit trail.
 */
@ApiTags('ofertas')
@ApiBearerAuth()
@Controller('ofertas')
@UseGuards(ApprovedDossierGuard)
export class OffersController {
  constructor(
    private readonly prismaFactory: CompanyScopedPrismaService,
    private readonly businessContext: BusinessContextService,
  ) {}

  private async companyOf(user: AuthenticatedUser): Promise<string> {
    const context = await this.businessContext.resolveForAuthenticatedUser(user);
    return this.businessContext.resolveCompanyId(context.businessId);
  }

  @CanonicalPermission('CATALOG_VIEW')
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const db = this.prismaFactory.forCompany(await this.companyOf(user));
    const now = new Date();
    const offers = await db.oferta.findMany({
      orderBy: [{ desde: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        Familia: { select: { id: true, nombre: true } },
        OfertaProducto: { select: { Producto: { select: { id: true, nombre: true } } } },
      },
    });
    return offers.map((o) => ({
      id: o.id,
      nombre: o.nombre,
      tipo: o.tipo,
      descuentoPorcentaje: o.descuentoPorcentaje?.toNumber() ?? null,
      precioOferta: o.precioOferta?.toNumber() ?? null,
      desde: o.desde.toISOString(),
      hasta: o.hasta.toISOString(),
      soloTienda: o.soloTienda,
      terminadaEn: o.terminadaEn?.toISOString() ?? null,
      estado: offerState(o, now),
      categoria: o.Familia,
      productos: o.OfertaProducto.map((link) => link.Producto),
    }));
  }

  @RequirePermission('productos.gestionar')
  @CanonicalPermission('PROMOTIONS_MANAGE')
  @Post()
  async create(@Body() dto: CreateOfferDto, @CurrentUser() user: AuthenticatedUser) {
    const byCategory = Boolean(dto.familiaId);
    if (byCategory === Boolean(dto.productoIds?.length)) {
      throw new BadRequestException('Elegí los productos o una categoría.');
    }
    if (dto.tipo === 'PORCENTAJE' && dto.descuentoPorcentaje === undefined) {
      throw new BadRequestException('Indicá el porcentaje de descuento.');
    }
    if (dto.tipo === 'PRECIO') {
      if (dto.precioOferta === undefined)
        throw new BadRequestException('Indicá el precio de oferta.');
      if (byCategory) {
        throw new BadRequestException(
          'Una oferta por categoría va con porcentaje, no con un precio.',
        );
      }
    }
    if (dto.hasta < dto.desde) {
      throw new BadRequestException('La oferta termina antes de empezar.');
    }
    const window = offerWindow(dto.desde, dto.hasta);
    if (window.hasta <= new Date()) {
      throw new BadRequestException(
        'Esa oferta ya habría terminado: elegí días que todavía no pasaron.',
      );
    }

    const companyId = await this.companyOf(user);
    const db = this.prismaFactory.forCompany(companyId);
    // Everything is read through the business's client: another business's ids are not found.
    const familia = dto.familiaId
      ? await db.familia.findFirst({
          where: { id: dto.familiaId },
          select: { id: true, nombre: true },
        })
      : null;
    if (dto.familiaId && !familia) throw new NotFoundException('Categoría no encontrada');
    const ids = [...new Set(dto.productoIds ?? [])];
    const products = ids.length
      ? await db.producto.findMany({
          where: { id: { in: ids }, activo: true },
          select: { id: true, nombre: true, precioMinorista: true },
        })
      : [];
    if (products.length !== ids.length) {
      throw new NotFoundException('Algún producto no existe o está inactivo.');
    }
    if (dto.tipo === 'PRECIO') {
      const above = products.filter((p) => p.precioMinorista.lte(dto.precioOferta as number));
      if (above.length > 0) {
        throw new BadRequestException(
          `El precio de oferta tiene que ser menor que el precio de ${above.map((p) => `«${p.nombre}»`).join(', ')}.`,
        );
      }
    }

    return db.$transaction(async (tx) => {
      const data: Prisma.OfertaUncheckedCreateInput = {
        empresaId: companyId,
        nombre: dto.nombre.trim(),
        tipo: dto.tipo,
        descuentoPorcentaje: dto.tipo === 'PORCENTAJE' ? dto.descuentoPorcentaje : null,
        precioOferta: dto.tipo === 'PRECIO' ? dto.precioOferta : null,
        desde: window.desde,
        hasta: window.hasta,
        soloTienda: dto.soloTienda ?? false,
        familiaId: familia?.id ?? null,
        usuarioId: user.id,
      };
      const offer = await tx.oferta.create({ data });
      if (products.length > 0) {
        await tx.ofertaProducto.createMany({
          data: products.map((p) => ({
            empresaId: companyId,
            ofertaId: offer.id,
            productoId: p.id,
          })),
        });
      }
      await recordAudit(tx, companyId, user.id, {
        accion: 'OFERTA_CREADA',
        entidad: 'Oferta',
        entidadId: offer.id,
        despues: {
          nombre: offer.nombre,
          tipo: offer.tipo,
          descuentoPorcentaje: offer.descuentoPorcentaje?.toNumber() ?? null,
          precioOferta: offer.precioOferta?.toNumber() ?? null,
          desde: dto.desde,
          hasta: dto.hasta,
          soloTienda: offer.soloTienda,
          categoria: familia?.nombre ?? null,
          productos: products.map((p) => p.nombre),
        },
      });
      return offer;
    });
  }

  @RequirePermission('productos.gestionar')
  @CanonicalPermission('PROMOTIONS_MANAGE')
  @Post(':id/terminar')
  @HttpCode(200)
  async end(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const companyId = await this.companyOf(user);
    const db = this.prismaFactory.forCompany(companyId);
    return db.$transaction(async (tx) => {
      const offer = await tx.oferta.findFirst({ where: { id } });
      if (!offer) throw new NotFoundException('Oferta no encontrada');
      const now = new Date();
      const before = offerState(offer, now);
      if (before === 'terminada') throw new ConflictException('Esa oferta ya terminó.');
      const ended = await tx.oferta.update({ where: { id }, data: { terminadaEn: now } });
      await recordAudit(tx, companyId, user.id, {
        accion: 'OFERTA_TERMINADA',
        entidad: 'Oferta',
        entidadId: id,
        antes: { nombre: offer.nombre, estado: before },
        despues: { nombre: offer.nombre, estado: 'terminada' },
      });
      return { ...ended, estado: 'terminada' as const };
    });
  }
}
