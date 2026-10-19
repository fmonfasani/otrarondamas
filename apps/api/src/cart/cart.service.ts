import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import type { BusinessContext } from '../business-context/business-context.types';

@Injectable()
export class CartService {
  constructor(
    private readonly prismaFactory: CompanyScopedPrismaService,
    private readonly prisma: PrismaService,
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
      include: { items: { include: { producto: { select: { nombre: true, precioMinorista: true } } } } },
    });

    if (!cart) {
      cart = await db.cart.create({
        data: {
          customerId,
          businessId,
          items: { create: [] },
        },
        include: { items: { include: { producto: { select: { nombre: true, precioMinorista: true } } } } },
      });
    }

    return cart;
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
    const existingItem = await db.cartItem.findFirst({
      where: { cartId, productoId },
    });

    let item;
    if (existingItem) {
      // Update quantity
      item = await db.cartItem.update({
        where: { id: existingItem.id },
        data: { cantidad: existingItem.cantidad.plus(cantidad) },
        include: { producto: { select: { nombre: true, precioMinorista: true } } },
      });
    } else {
      // Create new item
      item = await db.cartItem.create({
        data: {
          cartId,
          productoId,
          cantidad,
        },
        include: { producto: { select: { nombre: true, precioMinorista: true } } },
      });
    }

    return item;
  }

  async updateItemQuantity(cartItemId: string, cantidad: number, businessId: string) {
    if (cantidad <= 0) {
      throw new BadRequestException('Cantidad debe ser mayor a 0');
    }

    const db = this.prismaFactory.forCompany(businessId);

    const item = await db.cartItem.findFirst({
      where: { id: cartItemId },
      include: { cart: true, producto: true },
    });

    if (!item) {
      throw new NotFoundException('Item del carrito no encontrado');
    }

    if (item.cart.businessId !== businessId) {
      throw new ForbiddenException('No tienes acceso a este carrito');
    }

    // Verify stock availability
    const stocks = await this.inventoryService.consolidatedStock(businessId);
    const productStock = stocks.find((s) => s.productoId === item.productoId);
    const availableStock = productStock?.stockTotal ?? 0;
    if (availableStock < cantidad) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${availableStock}`,
      );
    }

    return db.cartItem.update({
      where: { id: cartItemId },
      data: { cantidad },
      include: { producto: { select: { nombre: true, precioMinorista: true } } },
    });
  }

  async removeItem(cartItemId: string, businessId: string) {
    const db = this.prismaFactory.forCompany(businessId);

    const item = await db.cartItem.findFirst({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!item) {
      throw new NotFoundException('Item del carrito no encontrado');
    }

    if (item.cart.businessId !== businessId) {
      throw new ForbiddenException('No tienes acceso a este carrito');
    }

    await db.cartItem.delete({
      where: { id: cartItemId },
    });
  }

  async getCart(cartId: string, businessId: string) {
    const db = this.prismaFactory.forCompany(businessId);

    const cart = await db.cart.findFirst({
      where: { id: cartId, businessId },
      include: {
        items: {
          include: {
            producto: {
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
        customer: {
          select: { id: true, nombre: true, email: true },
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
      where: { cartId },
    });
  }

  async getCartForCustomer(customerId: string, businessId: string) {
    const db = this.prismaFactory.forCompany(businessId);

    const cart = await db.cart.findFirst({
      where: { customerId, businessId },
      include: {
        items: {
          include: {
            producto: {
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
