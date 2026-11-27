import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StoreCatalogService } from '../store/store-catalog.service';

/** A buyer keeps at most this many favorites. */
export const MAX_FAVORITES = 500;

export type FavoriteProduct = {
  productoId: string;
  nombre: string;
  marca: string | null;
  /** Null when it can no longer be bought (unpublished, without stock, the store left). */
  precio: string | null;
  precioSinDescuento: string | null;
  descuentoPorcentaje: number | null;
  foto: string | null;
  disponible: boolean;
  tienda: { nombre: string; slug: string };
};

type Available = Awaited<ReturnType<StoreCatalogService['available']>>[number];

/**
 * Marketplace, step 3b (Owner, 2026-11-26) — the buyer's ♥ products, across every store. The
 * list belongs to the buyer (it never carries a business, and no Business reads it); the price
 * shown is the store's own (StoreCatalogService), so it is what the buyer pays inside.
 * Platform-wide on purpose (system client, ADR-DAT-019 allowlist).
 */
@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: StoreCatalogService,
  ) {}

  async ids(compradorId: string): Promise<string[]> {
    const rows = await this.prisma.compradorFavorito.findMany({
      where: { compradorId },
      select: { productoId: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => r.productoId);
  }

  /** ♥ a published product of a real store (not the platform's internal business). */
  async add(compradorId: string, productoId: string) {
    const product = await this.prisma.producto.findFirst({
      where: { id: productoId, activo: true, publicado: true, Empresa: { interno: false } },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Ese producto no está publicado.');
    const count = await this.prisma.compradorFavorito.count({ where: { compradorId } });
    if (count >= MAX_FAVORITES) {
      throw new BadRequestException(`Podés guardar hasta ${MAX_FAVORITES} favoritos.`);
    }
    await this.prisma.compradorFavorito.createMany({
      data: [{ compradorId, productoId }],
      skipDuplicates: true,
    });
    return { favorito: true };
  }

  async remove(compradorId: string, productoId: string) {
    await this.prisma.compradorFavorito.deleteMany({ where: { compradorId, productoId } });
    return { favorito: false };
  }

  /** The buyer's favorites, newest first, each at the store's price or «no disponible». */
  async list(compradorId: string): Promise<FavoriteProduct[]> {
    const rows = await this.prisma.compradorFavorito.findMany({
      where: { compradorId },
      orderBy: { createdAt: 'desc' },
      select: {
        Producto: {
          select: {
            id: true,
            nombre: true,
            marca: true,
            empresaId: true,
            Empresa: { select: { nombre: true, slug: true } },
          },
        },
      },
    });
    const stores = [...new Set(rows.map((r) => r.Producto.empresaId))];
    const available = new Map<string, Available>();
    await Promise.all(
      stores.map(async (id) => {
        const items = await this.catalog.available(id).catch(() => [] as Available[]);
        for (const item of items) available.set(item.productoId, item);
      }),
    );
    return rows.map(({ Producto: p }) => {
      const now = available.get(p.id);
      return {
        productoId: p.id,
        nombre: p.nombre,
        marca: p.marca ?? null,
        precio: now?.precio ?? null,
        precioSinDescuento: now?.precioSinDescuento ?? null,
        descuentoPorcentaje: now?.descuentoPorcentaje ?? null,
        foto: now?.foto ?? null,
        disponible: Boolean(now),
        tienda: { nombre: p.Empresa.nombre, slug: p.Empresa.slug },
      };
    });
  }
}
