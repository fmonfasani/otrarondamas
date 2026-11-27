import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoPedido, Prisma } from '@prisma/client';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import {
  BEST_SELLERS_DAYS,
  browse,
  suggest,
  type BrowseParams,
  type CatalogRow,
} from './store-catalog';
import { currentOffers } from '../offers/current-offers';
import { sellingPrice, type PriceShown } from '../offers/offer-price';
import { reservedByProduct } from '../inventory/reservations';

/** Orders whose units count as sold: from confirmed on, and not cancelled or failed. */
const SOLD_ORDER_STATES: EstadoPedido[] = [
  'CONFIRMADO',
  'EN_PREPARACION',
  'LISTO',
  'ASIGNADO',
  'EN_CAMINO',
  'ENTREGADO',
  'PARCIALMENTE_ENTREGADO',
];

type StoreRow = CatalogRow & {
  precio: string;
  precioSinDescuento: string | null;
  descuentoPorcentaje: number | null;
  /** The offer that sets the price (stage C3), with its end, for the «Oferta» mark. */
  oferta: PriceShown['oferta'];
  /** The first photo (OR-B4-046 rule 12), shown in the store's list. */
  foto: string | null;
};

/** What the store shows of a product in a list (no cost, no internal counts). */
const publicItem = (row: StoreRow) => ({
  productoId: row.productoId,
  nombre: row.nombre,
  marca: row.marca,
  codigoInterno: row.codigoInterno,
  familiaId: row.familiaId,
  subfamiliaId: row.subfamiliaId,
  unidadBase: row.unidadBase,
  destacado: row.destacado,
  foto: row.foto,
  precio: row.precio,
  precioSinDescuento: row.precioSinDescuento,
  descuentoPorcentaje: row.descuentoPorcentaje,
  oferta: row.oferta,
  disponible: row.stockTotal > 0,
  stockTotal: row.stockTotal,
});

const sumBy = (rows: Array<{ productoId: string; cantidad: Prisma.Decimal }>) => {
  const totals = new Map<string, number>();
  for (const r of rows)
    totals.set(r.productoId, (totals.get(r.productoId) ?? 0) + Number(r.cantidad));
  return totals;
};

/**
 * OR-B4-047 — the practical store over the Catálogo (OR-B4-046): search without accents,
 * categories with counts, filters, order, best sellers, paging, suggestions and the product page.
 * Everything is read through the Business's scoped client, so another Business's products never
 * enter the listing. The rules themselves live in store-catalog.ts.
 */
@Injectable()
export class StoreCatalogService {
  constructor(private readonly prismaFactory: CompanyScopedPrismaService) {}

  /** The published products, with their price, stock and (when asked) units sold in 30 days. */
  private async rows(
    companyId: string,
    options: { hideOutOfStock: boolean; withSales: boolean },
  ): Promise<StoreRow[]> {
    const db = this.prismaFactory.forCompany(companyId);
    const published = { activo: true, publicado: true };
    const since = new Date(Date.now() - BEST_SELLERS_DAYS * 24 * 60 * 60 * 1000);
    const [products, batches, photos, sales, orders] = await Promise.all([
      db.producto.findMany({
        where: published,
        select: {
          id: true,
          nombre: true,
          marca: true,
          codigoInterno: true,
          familiaId: true,
          subfamiliaId: true,
          unidadBase: true,
          destacado: true,
          createdAt: true,
          precioMinorista: true,
          descuentoPorcentaje: true,
        },
      }),
      db.lote.findMany({
        where: { Producto: published },
        select: { productoId: true, cantidad: true },
      }),
      db.productoFoto.findMany({
        where: { Producto: published },
        orderBy: { orden: 'asc' },
        select: { id: true, productoId: true },
      }),
      options.withSales
        ? db.ventaItem.findMany({
            where: { Venta: { estado: 'CONFIRMADA', createdAt: { gte: since } } },
            select: { productoId: true, cantidad: true },
          })
        : [],
      options.withSales
        ? db.pedidoItem.findMany({
            where: { Pedido: { estado: { in: SOLD_ORDER_STATES }, createdAt: { gte: since } } },
            select: { productoId: true, cantidad: true },
          })
        : [],
    ]);
    const stock = sumBy(batches);
    // OR-B4-049: the store offers what is available; what confirmed orders reserved is promised.
    const reserved = await reservedByProduct(db, [...stock.keys()]);
    for (const [productId, quantity] of reserved) {
      stock.set(productId, Math.max(0, (stock.get(productId) ?? 0) - quantity));
    }
    const sold = sumBy([...sales, ...orders]);
    // OR-B4-046 §4.4, stage C3: the store sees every offer in force, «solo tienda» included.
    const offers = await currentOffers(db, products, 'tienda');
    const cover = new Map<string, string>();
    for (const photo of photos)
      if (!cover.has(photo.productoId)) cover.set(photo.productoId, photo.id);
    const rows = products.map((p) => {
      const price = sellingPrice(p.precioMinorista, p.descuentoPorcentaje, offers.get(p.id) ?? []);
      return {
        productoId: p.id,
        nombre: p.nombre,
        marca: p.marca,
        codigoInterno: p.codigoInterno,
        familiaId: p.familiaId,
        subfamiliaId: p.subfamiliaId,
        unidadBase: p.unidadBase,
        destacado: p.destacado,
        createdAt: p.createdAt,
        precioCentavos: Math.round(Number(price.precio) * 100),
        stockTotal: stock.get(p.id) ?? 0,
        vendidos: sold.get(p.id) ?? 0,
        foto: cover.get(p.id) ?? null,
        ...price,
        enOferta: price.precioSinDescuento !== null,
      };
    });
    return options.hideOutOfStock ? rows.filter((r) => r.stockTotal > 0) : rows;
  }

  private async hierarchy(companyId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const [familias, subfamilias] = await Promise.all([
      db.familia.findMany({ where: { activo: true }, select: { id: true, nombre: true } }),
      db.subfamilia.findMany({
        where: { activo: true },
        select: { id: true, nombre: true, familiaId: true, prefijo: true },
      }),
    ]);
    return {
      familias,
      subfamilias: subfamilias.map((s) => ({ ...s, general: s.prefijo === 'GEN' })),
    };
  }

  /**
   * Marketplace, step 3 — what Wapsell's search across stores reads of one store: the products a
   * customer can buy now (with stock), with the store's own price and the units sold in 30 days.
   */
  async available(companyId: string) {
    const rows = await this.rows(companyId, { hideOutOfStock: true, withSales: true });
    return rows.map((r) => ({
      ...publicItem(r),
      precioCentavos: r.precioCentavos,
      vendidos: r.vendidos,
      createdAt: r.createdAt,
      enOferta: r.enOferta,
    }));
  }

  /** The store listing: one page plus the facets the customer can still pick from. */
  async browse(companyId: string, params: BrowseParams, settings: { hideOutOfStock: boolean }) {
    const [rows, hierarchy] = await Promise.all([
      this.rows(companyId, {
        hideOutOfStock: settings.hideOutOfStock,
        withSales: params.orden === 'vendidos',
      }),
      this.hierarchy(companyId),
    ]);
    const result = browse(rows, params, hierarchy);
    return { ...result, productos: result.productos.map(publicItem) };
  }

  /** Suggestions while typing: a few products and the categories whose name matches. */
  async suggestions(companyId: string, q: string, settings: { hideOutOfStock: boolean }) {
    const [rows, hierarchy] = await Promise.all([
      this.rows(companyId, { hideOutOfStock: settings.hideOutOfStock, withSales: false }),
      this.hierarchy(companyId),
    ]);
    const found = suggest(rows, q, hierarchy.familias);
    return {
      productos: found.productos.map((r) => ({
        productoId: r.productoId,
        nombre: r.nombre,
        marca: r.marca,
        precio: r.precio,
      })),
      categorias: found.categorias,
    };
  }

  /**
   * The product page of a published product. A product without stock is still shown, as «Sin
   * stock», even when the Business hides those from the listing: someone may have its link.
   */
  async product(companyId: string, productId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const product = await db.producto.findFirst({
      where: { id: productId, activo: true, publicado: true },
      select: {
        id: true,
        nombre: true,
        marca: true,
        codigoInterno: true,
        descripcion: true,
        unidadBase: true,
        destacado: true,
        precioMinorista: true,
        descuentoPorcentaje: true,
        familiaId: true,
        Familia: { select: { id: true, nombre: true } },
        Subfamilia: { select: { id: true, nombre: true, prefijo: true } },
        ProductoFoto: { orderBy: { orden: 'asc' }, select: { id: true } },
      },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const batches = await db.lote.findMany({
      where: { productoId: product.id },
      select: { cantidad: true },
    });
    // OR-B4-049: what confirmed orders reserved is not available.
    const reserved = await reservedByProduct(db, [product.id]);
    const stockTotal = Math.max(
      0,
      batches.reduce((sum, b) => sum + Number(b.cantidad), 0) - (reserved.get(product.id) ?? 0),
    );
    return {
      productoId: product.id,
      nombre: product.nombre,
      marca: product.marca,
      codigoInterno: product.codigoInterno,
      descripcion: product.descripcion,
      unidadBase: product.unidadBase,
      destacado: product.destacado,
      fotos: product.ProductoFoto.map((f) => f.id),
      categoria: product.Familia,
      subcategoria:
        product.Subfamilia.prefijo === 'GEN'
          ? null
          : { id: product.Subfamilia.id, nombre: product.Subfamilia.nombre },
      ...sellingPrice(
        product.precioMinorista,
        product.descuentoPorcentaje,
        (await currentOffers(db, [{ id: product.id, familiaId: product.familiaId }], 'tienda')).get(
          product.id,
        ) ?? [],
      ),
      disponible: stockTotal > 0,
      stockTotal,
    };
  }
}
