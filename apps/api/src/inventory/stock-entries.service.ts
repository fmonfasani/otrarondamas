import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { recordAuditMany, type AuditEntry } from '../auditoria/audit-catalog';
import { applyEntryCosts, valuationCost } from '../catalog/product-cost';
import { InventoryService } from './inventory.service';
import { OpeningStockDto } from './dto/opening-stock.dto';
import { StockCountDto, StockCountItemDto } from './dto/stock-count.dto';

// Same pattern as inventory.service.ts: the real types of the company-scoped client.
type CompanyScopedClient = ReturnType<CompanyScopedPrismaService['forCompany']>;
type CompanyScopedTx = Parameters<Parameters<CompanyScopedClient['$transaction']>[0]>[0];
type Reader = Pick<CompanyScopedTx, 'lote' | 'movimientoStock'>;

type ProductRow = {
  id: string;
  nombre: string;
  costo: Prisma.Decimal;
  costoPromedio: Prisma.Decimal | null;
  controlaVencimiento: boolean;
};
type LotRow = {
  id: string;
  productoId: string;
  numeroLote: string;
  vencimiento: Date | null;
  cantidad: Prisma.Decimal;
  createdAt: Date;
};

/** The movement reasons of these two operations (MovimientoStock.motivo). */
export const OPENING_REASON = 'Carga inicial';
export const COUNT_REASON = 'Conteo físico';

/** Rows per sheet; a search or a category narrows the rest. */
export const SHEET_LIMIT = 300;

const ZERO = new Prisma.Decimal(0);
const qty = (value: Prisma.Decimal) => value.toDecimalPlaces(4).toNumber();

function searchWhere(search?: string): Prisma.ProductoWhereInput {
  const term = search?.trim();
  if (!term) return {};
  return {
    OR: [
      { nombre: { contains: term, mode: 'insensitive' } },
      { codigoInterno: { contains: term, mode: 'insensitive' } },
    ],
  };
}

/** A lot's name when the person did not type one: the operation, the day, its id and the row. */
function lotName(kind: 'INI' | 'CONTEO', operationId: string, row: number, now: Date) {
  const day = now.toISOString().slice(0, 10).replace(/-/g, '');
  const base = `${kind}-${day}-${operationId.slice(0, 6).toUpperCase()}`;
  return row > 1 ? `${base}-${row}` : base;
}

/** The first names of a list of products, for a message. */
function namesOf(names: string[]) {
  const shown = names.slice(0, 3).join(', ');
  return names.length > 3 ? `${shown} y ${names.length - 3} más` : shown;
}

function must<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new NotFoundException('Producto no encontrado');
  }
  return value;
}

/** Two operations racing on the same stock, or a lot number already taken. */
function rethrowAsConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2034') {
      throw new ConflictException(
        'Otra operación cambió el stock al mismo tiempo. Probá de nuevo.',
      );
    }
    if (error.code === 'P2002') {
      throw new ConflictException(
        'Ya hay un lote con ese número para ese producto. Usá otro número o dejalo vacío.',
      );
    }
  }
  throw error;
}

/**
 * OR-B4-046 D8: stock that does not come from a purchase.
 * - The opening stock: what a business already has when it starts using Wapsell.
 * - The physical count: the person counts, Wapsell shows the difference and adjusts it.
 *
 * Both keep the cost of each movement (ADR-DAT-009) and land in the audit trail (OR-B4-041). They run
 * in SERIALIZABLE transactions: a sale or a reception racing with them makes one of the two retry.
 */
@Injectable()
export class StockEntriesService {
  constructor(
    private readonly prismaFactory: CompanyScopedPrismaService,
    private readonly inventory: InventoryService,
  ) {}

  /** Active products that can still take an opening stock (no other stock operation yet). */
  async openingSheet(companyId: string, search?: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const products = await db.producto.findMany({
      where: { activo: true, ...searchWhere(search) },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        codigoInterno: true,
        unidadBase: true,
        controlaVencimiento: true,
        costo: true,
      },
    });
    const operated = await this.withOperations(
      db,
      products.map((p) => p.id),
    );
    const eligible = products.filter((p) => !operated.has(p.id));
    const page = eligible.slice(0, SHEET_LIMIT);
    const stock = await this.stockOf(
      db,
      page.map((p) => p.id),
    );
    return {
      total: eligible.length,
      productos: page.map((p) => ({
        productoId: p.id,
        nombre: p.nombre,
        codigoInterno: p.codigoInterno,
        unidadBase: p.unidadBase,
        controlaVencimiento: p.controlaVencimiento,
        costo: p.costo,
        stockTotal: qty(stock.get(p.id) ?? ZERO),
      })),
    };
  }

  /** The count sheet: active products and their stock, lot by lot for those that control expiry. */
  async countSheet(companyId: string, search?: string, familyId?: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const products = await db.producto.findMany({
      where: { activo: true, ...(familyId ? { familiaId: familyId } : {}), ...searchWhere(search) },
      orderBy: { nombre: 'asc' },
      take: SHEET_LIMIT + 1,
      select: {
        id: true,
        nombre: true,
        codigoInterno: true,
        unidadBase: true,
        controlaVencimiento: true,
      },
    });
    const page = products.slice(0, SHEET_LIMIT);
    const lots = await db.lote.findMany({
      where: { productoId: { in: page.map((p) => p.id) } },
      orderBy: [{ vencimiento: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      select: { id: true, productoId: true, numeroLote: true, vencimiento: true, cantidad: true },
    });
    const lotsOf = new Map<string, typeof lots>();
    for (const lot of lots) {
      lotsOf.set(lot.productoId, [...(lotsOf.get(lot.productoId) ?? []), lot]);
    }
    return {
      hayMas: products.length > SHEET_LIMIT,
      productos: page.map((p) => {
        const own = lotsOf.get(p.id) ?? [];
        return {
          productoId: p.id,
          nombre: p.nombre,
          codigoInterno: p.codigoInterno,
          unidadBase: p.unidadBase,
          controlaVencimiento: p.controlaVencimiento,
          stockTotal: qty(own.reduce((sum, l) => sum.plus(l.cantidad), ZERO)),
          // Lot by lot only when the product controls expiry. Empty lots are left out: a lot the count
          // finds is added as a new one.
          lotes: p.controlaVencimiento
            ? own
                .filter((l) => l.cantidad.gt(0))
                .map((l) => ({
                  id: l.id,
                  numeroLote: l.numeroLote,
                  vencimiento: l.vencimiento,
                  cantidad: l.cantidad,
                }))
            : [],
        };
      }),
    };
  }

  /**
   * D8: the opening stock, without inventing a purchase. Only for products with no other stock
   * operation yet (a sale, a purchase, an adjustment or a count): after that, the stock is corrected
   * with a count, which shows the difference. Until then a product may take several opening loads
   * (for example, one per expiry date).
   */
  async openingStock(companyId: string, dto: OpeningStockDto, userId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const loadId = randomUUID();
    try {
      return await db.$transaction(
        async (tx) => {
          const products = await this.productsOf(
            tx,
            dto.items.map((i) => i.productoId),
          );
          const single = new Set<string>();
          for (const item of dto.items) {
            const product = must(products.get(item.productoId));
            if (product.controlaVencimiento && !item.vencimiento) {
              throw new BadRequestException(
                `«${product.nombre}» controla vencimiento: indicá la fecha del lote.`,
              );
            }
            if (!product.controlaVencimiento && item.vencimiento) {
              throw new BadRequestException(
                `«${product.nombre}» no controla vencimiento: su stock entra sin fecha.`,
              );
            }
            if (!product.controlaVencimiento && single.has(product.id)) {
              throw new BadRequestException(
                `«${product.nombre}» está dos veces: usá una sola fila por producto.`,
              );
            }
            single.add(product.id);
          }

          const ids = [...products.keys()];
          const operated = await this.withOperations(tx, ids);
          const blocked = [...products.values()].filter((p) => operated.has(p.id));
          if (blocked.length > 0) {
            throw new ConflictException(
              `${namesOf(blocked.map((p) => `«${p.nombre}»`))} ya ${
                blocked.length === 1 ? 'tuvo' : 'tuvieron'
              } ventas, compras o ajustes: corregí su stock con un conteo físico.`,
            );
          }

          const stock = await this.stockOf(tx, ids);
          const now = new Date();
          const rows = new Map<string, number>();
          // OR-B4-046 stage C1: what enters with a cost updates the product's cost (ADR-DAT-009).
          const audit: AuditEntry[] = await applyEntryCosts(
            tx,
            dto.items.map((item) => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              costoUnitario: item.costoUnitario ?? must(products.get(item.productoId)).costo,
            })),
            OPENING_REASON,
          );
          for (const item of dto.items) {
            const product = must(products.get(item.productoId));
            const row = (rows.get(product.id) ?? 0) + 1;
            rows.set(product.id, row);
            const lot = await tx.lote.create({
              data: {
                empresaId: companyId,
                productoId: product.id,
                numeroLote: item.numeroLote?.trim() || lotName('INI', loadId, row, now),
                vencimiento: item.vencimiento ? new Date(item.vencimiento) : null,
                cantidad: item.cantidad,
              },
            });
            await tx.movimientoStock.create({
              data: {
                empresaId: companyId,
                productoId: product.id,
                loteId: lot.id,
                tipoMovimiento: 'Entrada',
                cantidad: item.cantidad,
                motivo: OPENING_REASON,
                referenciaId: loadId,
                usuarioId: userId,
                costoUnitario: item.costoUnitario ?? product.costo,
              },
            });
            const before = stock.get(product.id) ?? ZERO;
            const after = before.plus(item.cantidad);
            stock.set(product.id, after);
            audit.push({
              accion: 'STOCK_CARGA_INICIAL',
              entidad: 'Producto',
              entidadId: product.id,
              antes: { nombre: product.nombre, cantidad: qty(before) },
              despues: {
                nombre: product.nombre,
                lote: lot.numeroLote,
                vencimiento: lot.vencimiento,
                cantidad: qty(after),
              },
              motivo: OPENING_REASON,
            });
          }
          await recordAuditMany(tx, companyId, userId, audit);
          return { referenciaId: loadId, productos: products.size, lotes: dto.items.length };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      rethrowAsConflict(error);
    }
  }

  /**
   * D8: a physical count. For each counted row the stock becomes what was counted, and the
   * difference is a movement with its cost and an entry in the audit trail; rows without a
   * difference change nothing.
   * - Per lot (products that control expiry): the lot takes the counted quantity, and a lot the
   *   count found is created with its date.
   * - Per product (the rest): what is missing leaves like a sale would, the oldest first (FIFO), and
   *   what appeared goes to the newest lot.
   * If the stock of a row changed after the sheet was shown (a sale, a reception), the whole count is
   * refused, so nothing that happened in between is overwritten.
   */
  async count(companyId: string, dto: StockCountDto, userId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const countId = randomUUID();
    const note = dto.nota?.trim();
    const reason = note ? `${COUNT_REASON}: ${note}` : COUNT_REASON;
    try {
      return await db.$transaction(
        async (tx) => {
          const products = await this.productsOf(
            tx,
            dto.items.map((i) => i.productoId),
          );
          const lots: LotRow[] = await tx.lote.findMany({
            where: { productoId: { in: [...products.keys()] } },
            select: {
              id: true,
              productoId: true,
              numeroLote: true,
              vencimiento: true,
              cantidad: true,
              createdAt: true,
            },
          });
          const lines = this.linesOf(dto.items, products, lots);
          const changed = lines.filter(
            (line) =>
              !line.current
                .toDecimalPlaces(4)
                .equals(new Prisma.Decimal(line.item.cantidadSistema).toDecimalPlaces(4)),
          );
          if (changed.length > 0) {
            const names = changed.map((l) => `«${l.product.nombre}» (ahora ${qty(l.current)})`);
            throw new ConflictException(
              `El stock cambió mientras contabas: ${namesOf(names)}. Actualizá la planilla y volvé a contar esos productos.`,
            );
          }

          const now = new Date();
          const found = new Map<string, number>();
          const audit: AuditEntry[] = [];
          const differences: Array<{
            productoId: string;
            nombre: string;
            lote: string | null;
            sistema: number;
            contado: number;
            diferencia: number;
          }> = [];
          for (const line of lines) {
            const { item, product } = line;
            const counted = new Prisma.Decimal(item.cantidadContada);
            const difference = counted.minus(line.current);
            if (difference.isZero()) continue;
            let lotLabel: string | null = line.lot?.numeroLote ?? null;

            if (line.lot) {
              const lot = line.lot;
              const set = await tx.lote.updateMany({
                where: { id: lot.id, empresaId: companyId, cantidad: line.current },
                data: { cantidad: counted },
              });
              if (set.count !== 1) {
                throw new ConflictException(
                  `El stock de «${product.nombre}» cambió mientras contabas. Actualizá la planilla y volvé a contar.`,
                );
              }
              const expired =
                difference.isNegative() && lot.vencimiento !== null && lot.vencimiento <= now;
              await this.movement(tx, companyId, userId, product, lot.id, difference, reason, {
                referenceId: countId,
                expired,
              });
            } else if (item.vencimiento) {
              const row = (found.get(product.id) ?? 0) + 1;
              found.set(product.id, row);
              const lot = await tx.lote.create({
                data: {
                  empresaId: companyId,
                  productoId: product.id,
                  numeroLote: item.numeroLote?.trim() || lotName('CONTEO', countId, row, now),
                  vencimiento: new Date(item.vencimiento),
                  cantidad: counted,
                },
              });
              lotLabel = lot.numeroLote;
              await this.movement(tx, companyId, userId, product, lot.id, difference, reason, {
                referenceId: countId,
              });
            } else if (difference.isNegative()) {
              // What is missing leaves like a sale would: the oldest first (FIFO).
              await this.inventory.deductStock(
                tx,
                companyId,
                product.id,
                difference.abs().toNumber(),
                reason,
                countId,
                userId,
              );
            } else {
              // What appeared goes to the newest lot; a product without lots gets its first one.
              const newest = lots
                .filter((l) => l.productoId === product.id)
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
              let lotId: string;
              if (newest) {
                const added = await tx.lote.updateMany({
                  where: { id: newest.id, empresaId: companyId },
                  data: { cantidad: { increment: difference } },
                });
                if (added.count !== 1) {
                  throw new ConflictException(
                    `El stock de «${product.nombre}» cambió mientras contabas. Actualizá la planilla y volvé a contar.`,
                  );
                }
                lotId = newest.id;
              } else {
                const lot = await tx.lote.create({
                  data: {
                    empresaId: companyId,
                    productoId: product.id,
                    numeroLote: lotName('CONTEO', countId, 1, now),
                    vencimiento: null,
                    cantidad: difference,
                  },
                });
                lotId = lot.id;
              }
              await this.movement(tx, companyId, userId, product, lotId, difference, reason, {
                referenceId: countId,
              });
            }

            const lotPart = lotLabel ? { lote: lotLabel } : {};
            audit.push({
              accion: 'STOCK_CONTEO',
              entidad: 'Producto',
              entidadId: product.id,
              antes: { nombre: product.nombre, ...lotPart, cantidad: qty(line.current) },
              despues: { nombre: product.nombre, ...lotPart, cantidad: qty(counted) },
              motivo: reason,
            });
            differences.push({
              productoId: product.id,
              nombre: product.nombre,
              lote: lotLabel,
              sistema: qty(line.current),
              contado: qty(counted),
              diferencia: qty(difference),
            });
          }
          if (audit.length > 0) {
            await recordAuditMany(tx, companyId, userId, audit);
          }
          return {
            referenciaId: countId,
            contados: lines.length,
            ajustados: differences.length,
            diferencias: differences,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      rethrowAsConflict(error);
    }
  }

  /** Each counted row with what it counts (a lot, a found lot or the whole product) and its stock now. */
  private linesOf(items: StockCountItemDto[], products: Map<string, ProductRow>, lots: LotRow[]) {
    const lotById = new Map(lots.map((l) => [l.id, l]));
    const seen = new Set<string>();
    const modes = new Map<string, 'lote' | 'producto'>();
    return items.map((item) => {
      const product = must(products.get(item.productoId));
      let key: string;
      let lot: LotRow | undefined;
      let current: Prisma.Decimal;
      if (item.loteId) {
        lot = lotById.get(item.loteId);
        if (!lot || lot.productoId !== product.id) {
          throw new NotFoundException('Lote no encontrado');
        }
        key = `lote:${lot.id}`;
        current = lot.cantidad;
      } else if (item.vencimiento) {
        if (!product.controlaVencimiento) {
          throw new BadRequestException(
            `«${product.nombre}» no controla vencimiento: contalo sin lote.`,
          );
        }
        if (item.cantidadSistema !== 0) {
          throw new BadRequestException(
            `El lote nuevo de «${product.nombre}» no tiene stock en el sistema: su cantidad del sistema es 0.`,
          );
        }
        key = `nuevo:${product.id}:${item.vencimiento}:${item.numeroLote?.trim() ?? ''}`;
        current = ZERO;
      } else {
        if (product.controlaVencimiento) {
          throw new BadRequestException(
            `«${product.nombre}» controla vencimiento: contalo lote por lote.`,
          );
        }
        key = `producto:${product.id}`;
        current = lots
          .filter((l) => l.productoId === product.id)
          .reduce((sum, l) => sum.plus(l.cantidad), ZERO);
      }
      const mode = item.loteId || item.vencimiento ? 'lote' : 'producto';
      if (seen.has(key) || (modes.get(product.id) ?? mode) !== mode) {
        throw new BadRequestException(`«${product.nombre}» está dos veces en el conteo.`);
      }
      seen.add(key);
      modes.set(product.id, mode);
      return { item, product, lot, current };
    });
  }

  private movement(
    tx: CompanyScopedTx,
    companyId: string,
    userId: string,
    product: ProductRow,
    lotId: string,
    difference: Prisma.Decimal,
    reason: string,
    options: { referenceId: string; expired?: boolean },
  ) {
    return tx.movimientoStock.create({
      data: {
        empresaId: companyId,
        productoId: product.id,
        loteId: lotId,
        tipoMovimiento: difference.isNegative() ? 'Salida' : 'Entrada',
        cantidad: difference.abs(),
        motivo: reason,
        referenciaId: options.referenceId,
        usuarioId: userId,
        loteVencidoAlMomento: options.expired ?? false,
        // ADR-DAT-009: what enters or leaves in a count is valued at the product's average cost.
        costoUnitario: valuationCost(product),
      },
    });
  }

  private async productsOf(tx: CompanyScopedTx, ids: string[]) {
    const unique = [...new Set(ids)];
    const rows: ProductRow[] = await tx.producto.findMany({
      where: { id: { in: unique } },
      select: {
        id: true,
        nombre: true,
        costo: true,
        costoPromedio: true,
        controlaVencimiento: true,
      },
    });
    if (rows.length !== unique.length) {
      throw new NotFoundException('Producto no encontrado');
    }
    return new Map(rows.map((p) => [p.id, p]));
  }

  /** Products that already had a stock operation other than an opening load. */
  private async withOperations(reader: Reader, ids: string[]) {
    if (ids.length === 0) return new Set<string>();
    const moved = await reader.movimientoStock.findMany({
      where: { productoId: { in: ids }, motivo: { not: OPENING_REASON } },
      select: { productoId: true },
      distinct: ['productoId'],
    });
    return new Set(moved.map((m) => m.productoId));
  }

  private async stockOf(reader: Reader, ids: string[]) {
    const stock = new Map<string, Prisma.Decimal>();
    if (ids.length === 0) return stock;
    const lots = await reader.lote.findMany({
      where: { productoId: { in: ids } },
      select: { productoId: true, cantidad: true },
    });
    for (const lot of lots) {
      stock.set(lot.productoId, (stock.get(lot.productoId) ?? ZERO).plus(lot.cantidad));
    }
    return stock;
  }
}
