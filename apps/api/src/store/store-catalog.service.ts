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
import { storePrice } from './store-price';

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
  precio: row.precio,
  precioSinDescuento: row.precioSinDescuento,
  descuentoPorcentaje: row.descuentoPorcentaje,
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
    const [products, batches, sales, orders] = await Promise.all([
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
    const sold = sumBy([...sales, ...orders]);
    const rows = products.map((p) => {
      const price = storePrice(p.precioMinorista, p.descuentoPorcentaje);
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
        ...price,
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
        Familia: { select: { id: true, nombre: true } },
        Subfamilia: { select: { id: true, nombre: true, prefijo: true } },
      },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const batches = await db.lote.findMany({
      where: { productoId: product.id },
      select: { cantidad: true },
    });
    const stockTotal = batches.reduce((sum, b) => sum + Number(b.cantidad), 0);
    return {
      productoId: product.id,
      nombre: product.nombre,
      marca: product.marca,
      codigoInterno: product.codigoInterno,
      descripcion: product.descripcion,
      unidadBase: product.unidadBase,
      destacado: product.destacado,
      categoria: product.Familia,
      subcategoria:
        product.Subfamilia.prefijo === 'GEN'
          ? null
          : { id: product.Subfamilia.id, nombre: product.Subfamilia.nombre },
      ...storePrice(product.precioMinorista, product.descuentoPorcentaje),
      disponible: stockTotal > 0,
      stockTotal,
    };
  }
}
