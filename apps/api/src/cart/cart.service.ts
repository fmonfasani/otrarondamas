import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

    // Verify stock availability (informative only, no reservation)
    const stocks = await this.inventoryService.consolidatedStock(businessId);
    const productStock = stocks.find((s) => s.productoId === productoId);
    const availableStock = productStock?.stockTotal ?? 0;
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
          cartId,
          productoId,
          cantidad,
        },
        include: { Producto: { select: { nombre: true, precioMinorista: true } } },
      });
    }

    return item;
  }

  async updateItemQuantity(cartId: string, cartItemId: string, cantidad: number, businessId: string) {
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

    // Verify stock availability
    const stocks = await this.inventoryService.consolidatedStock(businessId);
    const productStock = stocks.find((s) => s.productoId === item.productoId);
    const availableStock = productStock?.stockTotal ?? 0;
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
                precioMinorista: true,
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

    return cart;
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
                precioMinorista: true,
                descuentoPorcentaje: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return cart;
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
