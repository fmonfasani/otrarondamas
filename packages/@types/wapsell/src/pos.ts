/**
 * Point of Sale (POS) types
 * Types for sales, payments, receipts, and cart operations
 */

import { z } from 'zod';
import { Id, Timestamps, Decimal, DecimalSchema } from './common';

/**
 * Sale (Venta) - Main POS transaction
 */
export enum SaleStatus {
  PENDING = 'PENDIENTE',
  CONFIRMED = 'CONFIRMADA',
  CANCELLED = 'CANCELADA',
  REFUNDED = 'REEMBOLSADA',
  COMPLETED = 'COMPLETADA',
}

/**
 * Sale channels
 */
export enum SaleChannel {
  COUNTER = 'mostrador',
  DELIVERY = 'delivery',
  ONLINE = 'online',
  PHONE = 'telefonico',
  WHATSAPP = 'whatsapp',
}

/**
 * Sale entity
 */
export interface Sale extends Timestamps {
  id: Id;
  empresaId: Id;
  usuarioId: Id;
  clienteId?: Id;
  canal: SaleChannel;
  total: Decimal;
  descuento: Decimal;
  estado: SaleStatus;
  numero?: number;
  idempotencyKey?: string;
  items: SaleItem[];
  payments?: Payment[];
}

/**
 * Sale item (product in a sale)
 */
export interface SaleItem {
  id: Id;
  ventaId: Id;
  productoId: Id;
  cantidad: Decimal;
  precioUnitario: Decimal;
  descuentoItem: Decimal;
  descuentoFidelizacionPorcentaje?: Decimal;
  reglaFidelizacionId?: Id;
  subtotal: Decimal; // calculated
}

/**
 * Payment method
 */
export enum PaymentMethod {
  CASH = 'EFECTIVO',
  CARD = 'TARJETA',
  CHECK = 'CHEQUE',
  TRANSFER = 'TRANSFERENCIA',
  DIGITAL_WALLET = 'BILLETERA_DIGITAL',
  MERCADOPAGO = 'MERCADOPAGO',
  CREDIT = 'CREDITO',
  CRYPTOCURRENCY = 'CRIPTOMONEDA',
}

/**
 * Payment status
 */
export enum PaymentStatus {
  PENDING = 'PENDIENTE',
  PROCESSED = 'PROCESADO',
  FAILED = 'FALLIDO',
  REFUNDED = 'REEMBOLSADO',
  CANCELLED = 'CANCELADO',
}

/**
 * Payment entity
 */
export interface Payment extends Timestamps {
  id: Id;
  ventaId: Id;
  empresaId: Id;
  monto: Decimal;
  metodo: PaymentMethod;
  estado: PaymentStatus;
  referencia?: string; // Cheque number, card auth code, etc.
  numeroAutorizacion?: string;
  procesado: boolean;
  procesadoEn?: Date;
}

/**
 * Receipt (Recibo)
 */
export interface Receipt extends Timestamps {
  id: Id;
  ventaId: Id;
  empresaId: Id;
  numero?: string;
  contenido: string; // HTML or text content
  emitidoA: {
    nombre: string;
    email?: string;
    documento?: string;
  };
  emitidoPor: Id;
  firmado: boolean;
  impreso: boolean;
  enviadoPor: ('email' | 'whatsapp' | 'sms')[];
}

/**
 * Cart for online store/orders
 */
export interface Cart extends Timestamps {
  id: Id;
  customerId: Id;
  businessId: Id;
  items: CartItem[];
  total: Decimal;
  descuento: Decimal;
  subtotal: Decimal;
}

/**
 * Cart item
 */
export interface CartItem {
  id: Id;
  cartId: Id;
  productoId: Id;
  cantidad: Decimal;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields
  precio?: Decimal;
  descuentoFidelizacion?: Decimal;
}

/**
 * Create sale request
 */
export interface CreateSaleRequest {
  clienteId?: Id;
  canal: SaleChannel;
  items: Array<{
    productoId: Id;
    cantidad: Decimal;
    precioUnitario?: Decimal;
    descuentoItem?: Decimal;
  }>;
  descuento?: Decimal;
  payments?: Array<{
    monto: Decimal;
    metodo: PaymentMethod;
    referencia?: string;
  }>;
  idempotencyKey?: string;
}

/**
 * Update sale request
 */
export interface UpdateSaleRequest {
  estado?: SaleStatus;
  descuento?: Decimal;
}

/**
 * Sale summary/statistics
 */
export interface SaleSummary {
  totalSales: number;
  totalAmount: Decimal;
  totalDiscount: Decimal;
  avgSaleAmount: Decimal;
  paymentMethodBreakdown: Record<PaymentMethod, Decimal>;
  channelBreakdown: Record<SaleChannel, number>;
}

/**
 * Cart operations
 */
export interface AddToCartRequest {
  productoId: Id;
  cantidad: Decimal;
}

export interface UpdateCartItemRequest {
  cantidad?: Decimal;
}

export interface ApplyCouponRequest {
  code: string;
}

/**
 * Refund request
 */
export interface RefundRequest {
  ventaId: Id;
  monto: Decimal;
  motivo: string;
  items?: Array<{
    ventaItemId: Id;
    cantidad: Decimal;
  }>;
}

/**
 * Zod validation schemas
 */
export const SaleStatusSchema = z.nativeEnum(SaleStatus);
export const SaleChannelSchema = z.nativeEnum(SaleChannel);
export const PaymentMethodSchema = z.nativeEnum(PaymentMethod);
export const PaymentStatusSchema = z.nativeEnum(PaymentStatus);

export const SaleItemSchema = z.object({
  id: z.string(),
  ventaId: z.string(),
  productoId: z.string(),
  cantidad: DecimalSchema,
  precioUnitario: DecimalSchema,
  descuentoItem: DecimalSchema,
  descuentoFidelizacionPorcentaje: DecimalSchema.optional(),
  reglaFidelizacionId: z.string().optional(),
});

export const SaleSchema = z.object({
  id: z.string(),
  empresaId: z.string(),
  usuarioId: z.string(),
  clienteId: z.string().optional(),
  canal: SaleChannelSchema,
  total: DecimalSchema,
  descuento: DecimalSchema,
  estado: SaleStatusSchema,
  numero: z.number().optional(),
  idempotencyKey: z.string().optional(),
  items: z.array(SaleItemSchema),
  payments: z.array(z.any()).optional(), // Recursive definition
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const PaymentSchema = z.object({
  id: z.string(),
  ventaId: z.string(),
  empresaId: z.string(),
  monto: DecimalSchema,
  metodo: PaymentMethodSchema,
  estado: PaymentStatusSchema,
  referencia: z.string().optional(),
  numeroAutorizacion: z.string().optional(),
  procesado: z.boolean(),
  procesadoEn: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CartItemSchema = z.object({
  id: z.string(),
  cartId: z.string(),
  productoId: z.string(),
  cantidad: DecimalSchema,
  precio: DecimalSchema.optional(),
  descuentoFidelizacion: DecimalSchema.optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CartSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  businessId: z.string(),
  items: z.array(CartItemSchema),
  total: DecimalSchema,
  descuento: DecimalSchema,
  subtotal: DecimalSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateSaleRequestSchema = z.object({
  clienteId: z.string().optional(),
  canal: SaleChannelSchema,
  items: z.array(
    z.object({
      productoId: z.string(),
      cantidad: DecimalSchema,
      precioUnitario: DecimalSchema.optional(),
      descuentoItem: DecimalSchema.optional(),
    }),
  ),
  descuento: DecimalSchema.optional(),
  payments: z
    .array(
      z.object({
        monto: DecimalSchema,
        metodo: PaymentMethodSchema,
        referencia: z.string().optional(),
      }),
    )
    .optional(),
  idempotencyKey: z.string().optional(),
});

export const AddToCartRequestSchema = z.object({
  productoId: z.string(),
  cantidad: DecimalSchema,
});

export const RefundRequestSchema = z.object({
  ventaId: z.string(),
  monto: DecimalSchema,
  motivo: z.string(),
  items: z
    .array(
      z.object({
        ventaItemId: z.string(),
        cantidad: DecimalSchema,
      }),
    )
    .optional(),
});

/**
 * Type inference helpers
 */
export type SaleType = z.infer<typeof SaleSchema>;
export type PaymentType = z.infer<typeof PaymentSchema>;
export type CartType = z.infer<typeof CartSchema>;
export type CartItemType = z.infer<typeof CartItemSchema>;
export type CreateSaleRequestType = z.infer<typeof CreateSaleRequestSchema>;
export type AddToCartRequestType = z.infer<typeof AddToCartRequestSchema>;
export type RefundRequestType = z.infer<typeof RefundRequestSchema>;
