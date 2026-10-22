import { Prisma } from '@prisma/client';

/**
 * Stable response projection for the cart endpoints.
 * Keeps Prisma Decimal values serializable while exposing the loaded relations.
 */
export class CartItemResponseDto {
  id: string;
  cartId: string;
  productoId: string;
  cantidad: Prisma.Decimal | number;
  createdAt: Date;
  updatedAt: Date;
  producto?: {
    id?: string;
    nombre: string;
    precioMinorista: Prisma.Decimal | number;
    descuentoPorcentaje?: Prisma.Decimal | number | null;
  };

  constructor(item: {
    id: string;
    cartId: string;
    productoId: string;
    cantidad: Prisma.Decimal | number;
    createdAt: Date;
    updatedAt: Date;
    producto?: {
      id?: string;
      nombre: string;
      precioMinorista: Prisma.Decimal | number;
      descuentoPorcentaje?: Prisma.Decimal | number | null;
    };
  }) {
    this.id = item.id;
    this.cartId = item.cartId;
    this.productoId = item.productoId;
    this.cantidad = item.cantidad;
    this.createdAt = item.createdAt;
    this.updatedAt = item.updatedAt;
    if (item.producto) this.producto = item.producto;
  }
}

export class CartResponseDto {
  id: string;
  customerId: string;
  businessId: string;
  createdAt: Date;
  updatedAt: Date;
  items: CartItemResponseDto[];

  constructor(cart: {
    id: string;
    customerId: string;
    businessId: string;
    createdAt: Date;
    updatedAt: Date;
    items?: Array<{
      id: string;
      cartId: string;
      productoId: string;
      cantidad: Prisma.Decimal | number;
      createdAt: Date;
      updatedAt: Date;
      producto?: {
        id?: string;
        nombre: string;
        precioMinorista: Prisma.Decimal | number;
        descuentoPorcentaje?: Prisma.Decimal | number | null;
      };
    }>;
  }) {
    this.id = cart.id;
    this.customerId = cart.customerId;
    this.businessId = cart.businessId;
    this.createdAt = cart.createdAt;
    this.updatedAt = cart.updatedAt;
    this.items = (cart.items ?? []).map((item) => new CartItemResponseDto(item));
  }
}
