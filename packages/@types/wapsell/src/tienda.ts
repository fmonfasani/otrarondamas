/**
 * E-commerce / Online Store types
 * Types for products, orders, categories, and customer shopping
 */

import { z } from 'zod';
import { Id, Timestamps, Decimal, DecimalSchema } from './common';

/**
 * Product entity
 */
export interface Product extends Timestamps {
  id: Id;
  empresaId: Id;
  nombre: string;
  codigoInterno: string;
  codigoBarras?: string;
  marca?: string;
  descripcion?: string;
  imagenes?: string[];
  unidadBase: string;
  costo: Decimal;
  precioMinorista: Decimal;
  precioMayorista?: Decimal;
  activo: boolean;
  stockMinimo: Decimal;
  descuentoPorcentaje?: Decimal;
  familiaId: Id;
  subfamiliaId: Id;
  tipoId: Id;
  subtipoId: Id;
  stock?: Decimal; // Computed or cached
}

/**
 * Product category
 */
export interface Category extends Timestamps {
  id: Id;
  empresaId: Id;
  nombre: string;
  slug: string;
  descripcion?: string;
  imagen?: string;
  activo: boolean;
  orden: number;
  parentCategoryId?: Id;
  productsCount?: number;
}

/**
 * Product family (classification)
 */
export interface ProductFamily extends Timestamps {
  id: Id;
  empresaId: Id;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

/**
 * Product subfamily
 */
export interface ProductSubFamily extends Timestamps {
  id: Id;
  empresaId: Id;
  familiaId: Id;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

/**
 * Product type/clasificación
 */
export interface ProductType extends Timestamps {
  id: Id;
  empresaId: Id;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

/**
 * Product subtype
 */
export interface ProductSubType extends Timestamps {
  id: Id;
  empresaId: Id;
  tipoId: Id;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

/**
 * Product presentation/packaging
 */
export interface ProductPresentation extends Timestamps {
  id: Id;
  empresaId: Id;
  productoId: Id;
  nombre: string;
  factorConversion: Decimal;
  activo: boolean;
}

/**
 * Order (Pedido) - Customer order in online store
 */
export enum OrderStatus {
  RECEIVED = 'RECIBIDO',
  CONFIRMED = 'CONFIRMADO',
  PROCESSING = 'EN_PROCESO',
  READY = 'LISTO',
  SHIPPED = 'ENVIADO',
  DELIVERED = 'ENTREGADO',
  CANCELLED = 'CANCELADO',
  RETURNED = 'DEVUELTO',
  REFUNDED = 'REEMBOLSADO',
}

/**
 * Order entity
 */
export interface Order extends Timestamps {
  id: Id;
  empresaId: Id;
  clienteId: Id;
  usuarioId?: Id;
  estado: OrderStatus;
  canalOrigen: string;
  total: Decimal;
  descuento: Decimal;
  subtotal: Decimal;
  items: OrderItem[];
  idempotencyKey?: string;
  numero?: number;
}

/**
 * Order item
 */
export interface OrderItem {
  id: Id;
  pedidoId: Id;
  productoId: Id;
  cantidad: Decimal;
  precioUnitario: Decimal;
  descuentoItem: Decimal;
  descuentoFidelizacionPorcentaje?: Decimal;
  reglaFidelizacionId?: Id;
  subtotal: Decimal;
}

/**
 * Customer (Cliente)
 */
export enum CustomerType {
  RETAIL = 'MINORISTA',
  WHOLESALE = 'MAYORISTA',
}

/**
 * Customer entity
 */
export interface Customer extends Timestamps {
  id: Id;
  empresaId: Id;
  nombre: string;
  email: string;
  documento?: string;
  tipo: CustomerType;
  activo: boolean;
  telefono?: string;
  whatsapp?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  codigoPostal?: string;
  notas?: string;
  limiteCredito?: Decimal;
  creditoDisponible?: Decimal;
  esMayorista: boolean;
}

/**
 * Review/Rating
 */
export interface ProductReview extends Timestamps {
  id: Id;
  productoId: Id;
  clienteId: Id;
  calificacion: number; // 1-5
  titulo: string;
  contenido: string;
  verificadoComprador: boolean;
  utiles: number; // Helpful votes
  aprobado: boolean;
}

/**
 * Wishlist
 */
export interface Wishlist extends Timestamps {
  id: Id;
  clienteId: Id;
  empresaId: Id;
  nombre: string;
  items: WishlistItem[];
}

/**
 * Wishlist item
 */
export interface WishlistItem {
  id: Id;
  wishlistId: Id;
  productoId: Id;
  agregedAt: Date;
}

/**
 * Coupon/Promotional code
 */
export enum CouponType {
  PERCENTAGE = 'PORCENTAJE',
  FIXED = 'FIJO',
  FREE_SHIPPING = 'ENVIO_GRATIS',
}

/**
 * Coupon entity
 */
export interface Coupon extends Timestamps {
  id: Id;
  empresaId: Id;
  codigo: string;
  tipo: CouponType;
  valor: Decimal;
  montoMinimo?: Decimal;
  montoMaximoDescuento?: Decimal;
  usosPorCliente: number;
  usosMaximos?: number;
  usosActuales: number;
  validoDesde: Date;
  validoHasta: Date;
  activo: boolean;
  categorias?: Id[]; // Applicable to specific categories
  clientes?: Id[]; // Applicable to specific customers
}

/**
 * Create product request
 */
export interface CreateProductRequest {
  nombre: string;
  codigoInterno: string;
  codigoBarras?: string;
  marca?: string;
  descripcion?: string;
  imagenes?: string[];
  unidadBase: string;
  costo: Decimal;
  precioMinorista: Decimal;
  precioMayorista?: Decimal;
  stockMinimo?: Decimal;
  descuentoPorcentaje?: Decimal;
  familiaId: Id;
  subfamiliaId: Id;
  tipoId: Id;
  subtipoId: Id;
}

/**
 * Create order request
 */
export interface CreateOrderRequest {
  clienteId: Id;
  items: Array<{
    productoId: Id;
    cantidad: Decimal;
  }>;
  canalOrigen?: string;
  idempotencyKey?: string;
}

/**
 * Create customer request
 */
export interface CreateCustomerRequest {
  nombre: string;
  email: string;
  documento?: string;
  tipo?: CustomerType;
  telefono?: string;
  whatsapp?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  codigoPostal?: string;
  esMayorista?: boolean;
}

/**
 * Zod validation schemas
 */
export const CustomerTypeSchema = z.nativeEnum(CustomerType);
export const OrderStatusSchema = z.nativeEnum(OrderStatus);
export const CouponTypeSchema = z.nativeEnum(CouponType);

export const ProductSchema = z.object({
  id: z.string(),
  empresaId: z.string(),
  nombre: z.string().min(1),
  codigoInterno: z.string(),
  codigoBarras: z.string().optional(),
  marca: z.string().optional(),
  descripcion: z.string().optional(),
  imagenes: z.array(z.string().url()).optional(),
  unidadBase: z.string(),
  costo: DecimalSchema,
  precioMinorista: DecimalSchema,
  precioMayorista: DecimalSchema.optional(),
  activo: z.boolean(),
  stockMinimo: DecimalSchema,
  descuentoPorcentaje: DecimalSchema.optional(),
  familiaId: z.string(),
  subfamiliaId: z.string(),
  tipoId: z.string(),
  subtipoId: z.string(),
  stock: DecimalSchema.optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CategorySchema = z.object({
  id: z.string(),
  empresaId: z.string(),
  nombre: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  descripcion: z.string().optional(),
  imagen: z.string().url().optional(),
  activo: z.boolean(),
  orden: z.number(),
  parentCategoryId: z.string().optional(),
  productsCount: z.number().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const OrderItemSchema = z.object({
  id: z.string(),
  pedidoId: z.string(),
  productoId: z.string(),
  cantidad: DecimalSchema,
  precioUnitario: DecimalSchema,
  descuentoItem: DecimalSchema,
  descuentoFidelizacionPorcentaje: DecimalSchema.optional(),
  reglaFidelizacionId: z.string().optional(),
  subtotal: DecimalSchema,
});

export const OrderSchema = z.object({
  id: z.string(),
  empresaId: z.string(),
  clienteId: z.string(),
  usuarioId: z.string().optional(),
  estado: OrderStatusSchema,
  canalOrigen: z.string(),
  total: DecimalSchema,
  descuento: DecimalSchema,
  subtotal: DecimalSchema,
  items: z.array(OrderItemSchema),
  idempotencyKey: z.string().optional(),
  numero: z.number().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CustomerSchema = z.object({
  id: z.string(),
  empresaId: z.string(),
  nombre: z.string().min(1),
  email: z.string().email(),
  documento: z.string().optional(),
  tipo: CustomerTypeSchema,
  activo: z.boolean(),
  telefono: z.string().optional(),
  whatsapp: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  codigoPostal: z.string().optional(),
  notas: z.string().optional(),
  limiteCredito: DecimalSchema.optional(),
  creditoDisponible: DecimalSchema.optional(),
  esMayorista: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateProductRequestSchema = z.object({
  nombre: z.string().min(1),
  codigoInterno: z.string(),
  codigoBarras: z.string().optional(),
  marca: z.string().optional(),
  descripcion: z.string().optional(),
  imagenes: z.array(z.string().url()).optional(),
  unidadBase: z.string(),
  costo: DecimalSchema,
  precioMinorista: DecimalSchema,
  precioMayorista: DecimalSchema.optional(),
  stockMinimo: DecimalSchema.optional(),
  descuentoPorcentaje: DecimalSchema.optional(),
  familiaId: z.string(),
  subfamiliaId: z.string(),
  tipoId: z.string(),
  subtipoId: z.string(),
});

export const CreateOrderRequestSchema = z.object({
  clienteId: z.string(),
  items: z.array(
    z.object({
      productoId: z.string(),
      cantidad: DecimalSchema,
    }),
  ),
  canalOrigen: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const CreateCustomerRequestSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  documento: z.string().optional(),
  tipo: CustomerTypeSchema.optional(),
  telefono: z.string().optional(),
  whatsapp: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  codigoPostal: z.string().optional(),
  esMayorista: z.boolean().optional(),
});

/**
 * Type inference helpers
 */
export type ProductType = z.infer<typeof ProductSchema>;
export type CategoryType = z.infer<typeof CategorySchema>;
export type OrderType = z.infer<typeof OrderSchema>;
export type CustomerType = z.infer<typeof CustomerSchema>;
export type CreateProductRequestType = z.infer<typeof CreateProductRequestSchema>;
export type CreateOrderRequestType = z.infer<typeof CreateOrderRequestSchema>;
export type CreateCustomerRequestType = z.infer<typeof CreateCustomerRequestSchema>;
