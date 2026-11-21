import { Prisma } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { currentOffers } from '../offers/current-offers';
import { sellingPrice } from '../offers/offer-price';
import { bestLinePrice } from '../offers/best-price';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { InventoryService } from '../inventory/inventory.service';

/**
 * C5B Cart Service — Multi-Tenant Isolation
 *
 * IMPORTANT: Cart and CartItem models are NOT included in CompanyScopedPrisma's
 * automatic filtering (MODELS_WITH_COMPANY_ID). This means every query MUST
 * explicitly include businessId validation. Do not add Cart queries without
 * verifying businessId scoping.
 *
 * Pattern: Use `where: { id, cart: { businessId } }` for CartItem queries,
 * or `where: { id, businessId }` for Cart queries. Verify at query time,
 * not post-query.
 */
@Injectable()
export class CartService {
  constructor(
    private readonly prismaFactory: CompanyScopedPrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async getOrCreateCart(customerId: string, businessId: string) {
    const db = this.prismaFactory.forCompany(businessId);

    // Verify customer exists and belongs to this business
    const customer = await db.cliente.findFirst({
      where: { id: customerId, empresaId: businessId, activo: true },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado o inactivo en este negocio');
    }

    let cart = await db.cart.findFirst({
      where: { customerId, businessId },
      include: {
        CartItem: { include: { Producto: { select: { nombre: true, precioMinorista: true } } } },
      },
    });

    if (!cart) {
      cart = await db.cart.create({
        data: {
          customerId,
          businessId,
          CartItem: { create: [] },
        },
        include: {
          CartItem: { include: { Producto: { select: { nombre: true, precioMinorista: true } } } },
        },
      });
    }

    // Answer exactly what GET /cart/:id answers (owner decision 2026-11-09),
    // so the two endpoints cannot drift apart.
    return this.getCart(cart.id, businessId);
  }

  async addItem(cartId: string, productoId: string, cantidad: number, businessId: string) {
    if (cantidad <= 0) {
      throw new BadRequestException('Cantidad debe ser mayor a 0');
    }

    const db = this.prismaFactory.forCompany(businessId);

    // Verify cart exists
    const cart = await db.cart.findFirst({
      where: { id: cartId, businessId },
      select: { id: true, customerId: true },
    });
    if (!cart) {
      throw new NotFoundException('Carrito no encontrado');
    }

    // Verify product exists and belongs to this business
    const product = await db.producto.findFirst({
      where: { id: productoId, empresaId: businessId, activo: true },
      select: { id: true, nombre: true },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado o inactivo en este negocio');
    }

    // Verify stock availability (informative only, the cart does not reserve). OR-B4-049: what
    // confirmed orders reserved is not available.
    const stocks = await this.inventoryService.consolidatedStock(businessId);
    const productStock = stocks.find((s) => s.productoId === productoId);
    const availableStock = productStock?.disponible ?? 0;
    if (availableStock < cantidad) {
      throw new BadRequestException(
        `Stock insuficiente para ${product.nombre}. Disponible: ${availableStock}`,
      );
    }

    // Check if item already exists in cart
    // SECURITY: Include Cart.businessId in where to prevent cross-tenant access
    const existingItem = await db.cartItem.findFirst({
      where: {
        cartId,
        productoId,
        Cart: { businessId }, // Explicit businessId validation at query time
      },
    });

    let item;
    if (existingItem) {
      // Atomic increment, constrained again by cart and tenant to avoid a
      // time-of-check/time-of-use gap between lookup and mutation.
      const updated = await db.cartItem.updateMany({
        where: { id: existingItem.id, cartId, Cart: { businessId } },
        data: { cantidad: { increment: cantidad } },
      });
      if (updated.count !== 1) {
        throw new NotFoundException('Item del carrito no encontrado');
      }
      item = await db.cartItem.findFirstOrThrow({
        where: { id: existingItem.id, cartId, Cart: { businessId } },
        include: { Producto: { select: { nombre: true, precioMinorista: true } } },
      });
    } else {
      // Create new item
      item = await db.cartItem.create({
        data: {
          businessId,
          cartId,
          productoId,
          cantidad,
        },
        include: { Producto: { select: { nombre: true, precioMinorista: true } } },
      });
    }

    return item;
  }

  async updateItemQuantity(
    cartId: string,
    cartItemId: string,
    cantidad: number,
    businessId: string,
  ) {
    if (cantidad <= 0) {
      throw new BadRequestException('Cantidad debe ser mayor a 0');
    }

    const db = this.prismaFactory.forCompany(businessId);

    // SECURITY: Include Cart.businessId in where clause for primary validation
    // Do not rely on post-query checks alone (defense in depth)
    const item = await db.cartItem.findFirst({
      where: {
        id: cartItemId,
        cartId,
        Cart: { businessId }, // Validate item, route cart, and tenant at query time
      },
      include: { Cart: true, Producto: true },
    });

    if (!item) {
      throw new NotFoundException('Item del carrito no encontrado');
    }

    // Verify stock availability (OR-B4-049: without what confirmed orders reserved)
    const stocks = await this.inventoryService.consolidatedStock(businessId);
    const productStock = stocks.find((s) => s.productoId === item.productoId);
    const availableStock = productStock?.disponible ?? 0;
    if (availableStock < cantidad) {
      throw new BadRequestException(`Stock insuficiente. Disponible: ${availableStock}`);
    }

    const updated = await db.cartItem.updateMany({
      where: { id: cartItemId, cartId, Cart: { businessId } },
      data: { cantidad },
    });
    if (updated.count !== 1) {
      throw new NotFoundException('Item del carrito no encontrado');
    }

    return db.cartItem.findFirstOrThrow({
      where: { id: cartItemId, cartId, Cart: { businessId } },
      include: { Producto: { select: { nombre: true, precioMinorista: true } } },
    });
  }

  async removeItem(cartId: string, cartItemId: string, businessId: string) {
    const db = this.prismaFactory.forCompany(businessId);

    // SECURITY: Include Cart.businessId in where clause for primary validation
    const deleted = await db.cartItem.deleteMany({
      where: { id: cartItemId, cartId, Cart: { businessId } },
    });

    if (deleted.count !== 1) {
      throw new NotFoundException('Item del carrito no encontrado');
    }
  }

  /**
   * OR-B4-029: the cart must belong to this Customer in this Business. A cart of someone
   * else answers exactly like a missing one (404), so ids reveal nothing.
   */
  async assertOwnedCart(cartId: string, customerId: string, businessId: string) {
    const db = this.prismaFactory.forCompany(businessId);
    const cart = await db.cart.findFirst({
      where: { id: cartId, customerId, businessId },
      select: { id: true },
    });
    if (!cart) {
      throw new NotFoundException('Carrito no encontrado');
    }
  }

  async getCart(cartId: string, businessId: string) {
    const db = this.prismaFactory.forCompany(businessId);

    const cart = await db.cart.findFirst({
      where: { id: cartId, businessId },
      include: {
        CartItem: {
          include: {
            Producto: {
              select: {
                id: true,
                nombre: true,
                familiaId: true,
                precioMinorista: true,
                precioMayorista: true,
                descuentoPorcentaje: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Carrito no encontrado');
    }

    return this.withPrices(db, cart);
  }

  /**
   * OR-B4-046 §4.4, stage C3: each line carries the price the store charges today (`precio`), with
   * the product's discount or the best offer in force (never both), and the offer behind it.
   */
  private async withPrices<
    C extends {
      CartItem: Array<{
        Producto: {
          id: string;
          familiaId: string;
          precioMinorista: Prisma.Decimal;
          descuentoPorcentaje: Prisma.Decimal | null;
          precioMayorista: Prisma.Decimal | null;
        };
      }>;
      customerId?: string | null;
    },
  >(db: ReturnType<CompanyScopedPrismaService['forCompany']>, cart: C) {
    const offers = await currentOffers(
      db,
      cart.CartItem.map((item) => item.Producto),
      'tienda',
    );
    // OR-B4-051 (D6): a wholesale customer sees their price; the lowest candidate wins (D5).
    const wholesale = cart.customerId
      ? ((
          await db.cliente.findFirst({
            where: { id: cart.customerId },
            select: { esMayorista: true },
          })
        )?.esMayorista ?? false)
      : false;
    return {
      ...cart,
      CartItem: cart.CartItem.map((item) => {
        const shown = sellingPrice(
          item.Producto.precioMinorista,
          item.Producto.descuentoPorcentaje,
          offers.get(item.Producto.id) ?? [],
        );
        const line = bestLinePrice({
          list: item.Producto.precioMinorista,
          productDiscount: item.Producto.descuentoPorcentaje,
          offers: offers.get(item.Producto.id) ?? [],
          wholesale: wholesale ? item.Producto.precioMayorista : null,
        });
        return {
          ...item,
          precio: line.precioEfectivo.toFixed(2),
          oferta: line.origen === 'OFERTA' ? shown.oferta : null,
        };
      }),
    };
  }

  async clearCart(cartId: string, businessId: string) {
    const db = this.prismaFactory.forCompany(businessId);

    const cart = await db.cart.findFirst({
      where: { id: cartId, businessId },
    });

    if (!cart) {
      throw new NotFoundException('Carrito no encontrado');
    }

    await db.cartItem.deleteMany({
      where: { cartId, Cart: { businessId } },
    });
  }

  async getCartForCustomer(customerId: string, businessId: string) {
    const db = this.prismaFactory.forCompany(businessId);

    const cart = await db.cart.findFirst({
      where: { customerId, businessId },
      include: {
        CartItem: {
          include: {
            Producto: {
              select: {
                id: true,
                nombre: true,
                familiaId: true,
                precioMinorista: true,
                precioMayorista: true,
                descuentoPorcentaje: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return cart ? this.withPrices(db, cart) : cart;
  }

  async assertCartBelongsToCustomer(cartId: string, customerId: string, businessId: string) {
    const db = this.prismaFactory.forCompany(businessId);

    const cart = await db.cart.findFirst({
      where: { id: cartId, customerId, businessId },
      select: { id: true },
    });

    if (!cart) {
      throw new ForbiddenException('El carrito no pertenece a este cliente');
    }
  }
}
