import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { PurchasesService } from './purchases.service';

const toNumber = (value: Prisma.Decimal | null) => (value === null ? null : value.toNumber());

/**
 * The purchase suggestion brings each product to twice its minimum stock: enough to not be low
 * again right away. The person edits the quantities before creating the order.
 */
export function suggestedQuantity(available: number, minimum: number): number {
  return Math.max(1, Math.ceil(minimum * 2 - available));
}

/**
 * OR-B4-052 (stage D1) — the products each supplier provides (its code, last cost, last purchase and
 * whether it is the usual supplier), and the purchase suggestion: the products under their minimum
 * stock, grouped by their usual supplier, ready to become a draft purchase. Everything is read and
 * written through the business's scoped client.
 */
@Injectable()
export class SupplierProductsService {
  constructor(
    private readonly prismaFactory: CompanyScopedPrismaService,
    private readonly inventory: InventoryService,
    private readonly purchases: PurchasesService,
  ) {}

  private async supplierOrFail(companyId: string, supplierId: string) {
    const db = this.prismaFactory.forCompany(companyId);
    const supplier = await db.proveedor.findFirst({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    return supplier;
  }

  async list(companyId: string, supplierId: string) {
    await this.supplierOrFail(companyId, supplierId);
    const db = this.prismaFactory.forCompany(companyId);
    const links = await db.productoProveedor.findMany({
      where: { proveedorId: supplierId },
      include: { Producto: { select: { nombre: true, codigoInterno: true, costo: true } } },
      orderBy: { Producto: { nombre: 'asc' } },
    });
    return links.map((link) => ({
      productoId: link.productoId,
      nombre: link.Producto.nombre,
      codigoInterno: link.Producto.codigoInterno,
      codigoProveedor: link.codigoProveedor,
      costoUnitario: toNumber(link.costoUnitario),
      ultimaCompra: link.ultimaCompra?.toISOString() ?? null,
      habitual: link.habitual,
    }));
  }

  /** Links a product to the supplier (or changes the link); marking it usual unmarks the previous one. */
  async save(
    companyId: string,
    supplierId: string,
    productId: string,
    data: { codigoProveedor?: string | null; costoUnitario?: number | null; habitual?: boolean },
  ) {
    await this.supplierOrFail(companyId, supplierId);
    const db = this.prismaFactory.forCompany(companyId);
    const product = await db.producto.findFirst({ where: { id: productId }, select: { id: true } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const fields = {
      ...(data.codigoProveedor === undefined
        ? {}
        : { codigoProveedor: data.codigoProveedor?.trim() || null }),
      ...(data.costoUnitario === undefined ? {} : { costoUnitario: data.costoUnitario }),
      ...(data.habitual === undefined ? {} : { habitual: data.habitual }),
    };
    return db.$transaction(async (tx) => {
      if (data.habitual) {
        await tx.productoProveedor.updateMany({
          where: { productoId: productId, habitual: true, NOT: { proveedorId: supplierId } },
          data: { habitual: false },
        });
      }
      // findFirst + create/update: companyScopeExtension has no tenant handling for upsert.
      const link = await tx.productoProveedor.findFirst({
        where: { productoId: productId, proveedorId: supplierId },
        select: { id: true },
      });
      return link
        ? tx.productoProveedor.update({ where: { id: link.id }, data: fields })
        : tx.productoProveedor.create({
            data: {
              empresaId: companyId,
              productoId: productId,
              proveedorId: supplierId,
              ...fields,
            },
          });
    });
  }

  async remove(companyId: string, supplierId: string, productId: string) {
    await this.supplierOrFail(companyId, supplierId);
    const db = this.prismaFactory.forCompany(companyId);
    const { count } = await db.productoProveedor.deleteMany({
      where: { proveedorId: supplierId, productoId: productId },
    });
    if (count === 0) throw new NotFoundException('Ese producto no está en el proveedor');
    return { quitados: count };
  }

  /** The products under their minimum stock, by usual supplier (or without one). */
  async suggestion(companyId: string) {
    const low = await this.inventory.consolidatedStock(companyId, undefined, true);
    const ids = low.map((row) => row.productoId);
    const db = this.prismaFactory.forCompany(companyId);
    const [products, links] = await Promise.all([
      db.producto.findMany({ where: { id: { in: ids } }, select: { id: true, costo: true } }),
      db.productoProveedor.findMany({
        where: { productoId: { in: ids }, habitual: true },
        include: { Proveedor: { select: { id: true, nombre: true } } },
      }),
    ]);
    const costOf = new Map(products.map((p) => [p.id, p.costo]));
    const usualOf = new Map(links.map((link) => [link.productoId, link]));
    const groups = new Map<
      string,
      { proveedor: { id: string; nombre: string } | null; productos: unknown[] }
    >();
    for (const row of low) {
      const link = usualOf.get(row.productoId);
      const key = link?.proveedorId ?? '';
      if (!groups.has(key)) groups.set(key, { proveedor: link?.Proveedor ?? null, productos: [] });
      groups.get(key)!.productos.push({
        productoId: row.productoId,
        nombre: row.nombre,
        codigoInterno: row.codigoInterno,
        codigoProveedor: link?.codigoProveedor ?? null,
        disponible: row.disponible,
        stockMinimo: row.stockMinimo,
        cantidadSugerida: suggestedQuantity(row.disponible, row.stockMinimo),
        costoUnitario: toNumber(link?.costoUnitario ?? costOf.get(row.productoId) ?? null),
      });
    }
    // Suppliers by name, and the products without a usual supplier last.
    return [...groups.values()].sort((a, b) =>
      !a.proveedor ? 1 : !b.proveedor ? -1 : a.proveedor.nombre.localeCompare(b.proveedor.nombre),
    );
  }

  /** A draft purchase from the suggestion, at each product's last cost with that supplier. */
  async draftFromSuggestion(
    companyId: string,
    userId: string,
    supplierId: string,
    items: Array<{ productoId: string; cantidad: number }>,
  ) {
    await this.supplierOrFail(companyId, supplierId);
    const db = this.prismaFactory.forCompany(companyId);
    const ids = items.map((i) => i.productoId);
    const [products, links] = await Promise.all([
      db.producto.findMany({ where: { id: { in: ids } }, select: { id: true, costo: true } }),
      db.productoProveedor.findMany({
        where: { proveedorId: supplierId, productoId: { in: ids } },
      }),
    ]);
    if (products.length !== new Set(ids).size)
      throw new NotFoundException('Producto no encontrado');
    const productCost = new Map(products.map((p) => [p.id, p.costo]));
    const supplierCost = new Map(links.map((l) => [l.productoId, l.costoUnitario]));
    return this.purchases.createPurchase(
      companyId,
      {
        proveedorId: supplierId,
        items: items.map((item) => ({
          productoId: item.productoId,
          cantidadPedida: item.cantidad,
          costoUnitario: Number(
            supplierCost.get(item.productoId) ?? productCost.get(item.productoId),
          ),
        })),
      },
      userId,
    );
  }
}
