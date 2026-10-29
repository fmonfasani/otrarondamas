import { z } from 'zod';
import {
  UUIDSchema,
  EmailSchema,
  NameSchema,
  PhoneSchema,
  AddressSchema,
  QuantitySchema,
  PercentageSchema,
  CurrencySchema,
  PaginationSchema,
} from './common';

/**
 * Online store (Tienda Online) validation schemas
 */

/**
 * Product order item validation schema
 */
export const OrderItemSchema = z.object({
  productoId: UUIDSchema,
  cantidad: QuantitySchema,
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

/**
 * Create order validation schema
 */
export const OrderSchema = z.object({
  nombre: NameSchema,
  email: EmailSchema,
  telefono: PhoneSchema.optional(),
  direccion: AddressSchema.optional(),
  items: z
    .array(OrderItemSchema)
    .min(1, 'El pedido debe tener al menos un item'),
  descuentoManual: PercentageSchema.optional(),
  notas: z
    .string()
    .max(500, 'Las notas son muy largas')
    .optional(),
});

export type Order = z.infer<typeof OrderSchema>;

/**
 * Checkout validation schema (extended order with payment info)
 */
export const CheckoutSchema = OrderSchema.extend({
  medioPago: z.enum(['efectivo', 'transferencia', 'QR', 'tarjeta'], {
    errorMap: () => ({
      message: 'Método de pago inválido',
    }),
  }),
  numeroTarjeta: z
    .string()
    .regex(/^\d{13,19}$/, 'Número de tarjeta inválido')
    .optional(),
  fechaVencimiento: z
    .string()
    .regex(/^\d{2}\/\d{2}$/, 'Formato de vencimiento inválido (MM/YY)')
    .optional(),
  cvv: z
    .string()
    .regex(/^\d{3,4}$/, 'CVV inválido')
    .optional(),
});

export type Checkout = z.infer<typeof CheckoutSchema>;

/**
 * Product review validation schema
 */
export const ReviewSchema = z.object({
  productoId: UUIDSchema,
  rating: z
    .number()
    .int('La calificación debe ser un número entero')
    .min(1, 'La calificación debe ser al menos 1')
    .max(5, 'La calificación no puede ser mayor a 5'),
  titulo: z
    .string()
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(100, 'El título es muy largo'),
  comentario: z
    .string()
    .min(10, 'El comentario debe tener al menos 10 caracteres')
    .max(500, 'El comentario es muy largo'),
  nombreComprador: NameSchema,
  email: EmailSchema.optional(),
});

export type Review = z.infer<typeof ReviewSchema>;

/**
 * Update order status validation schema
 */
export const UpdateOrderStatusSchema = z.object({
  estado: z.enum([
    'RECIBIDO',
    'CONFIRMADO',
    'EN_PREPARACION',
    'LISTO',
    'ASIGNADO',
    'EN_CAMINO',
    'ENTREGADO',
    'PARCIALMENTE_ENTREGADO',
    'ENTREGA_FALLIDA',
    'CANCELADO',
  ]),
});

export type UpdateOrderStatus = z.infer<typeof UpdateOrderStatusSchema>;

/**
 * Track order validation schema
 */
export const TrackOrderSchema = z.object({
  orderId: UUIDSchema,
  email: EmailSchema,
});

export type TrackOrder = z.infer<typeof TrackOrderSchema>;

/**
 * Product search/filter validation schema
 */
export const ProductSearchSchema = z.object({
  search: z
    .string()
    .max(255, 'La búsqueda es muy larga')
    .optional(),
  familiaId: UUIDSchema.optional(),
  subfamiliaId: UUIDSchema.optional(),
  minPrecio: CurrencySchema.optional(),
  maxPrecio: CurrencySchema.optional(),
  ordenar: z
    .enum(['precio_asc', 'precio_desc', 'nombre', 'popular'], {
      errorMap: () => ({
        message: 'Orden inválido',
      }),
    })
    .default('popular'),
  ...PaginationSchema.shape,
});

export type ProductSearch = z.infer<typeof ProductSearchSchema>;

/**
 * Wishlist item validation schema
 */
export const WishlistItemSchema = z.object({
  productoId: UUIDSchema,
});

export type WishlistItem = z.infer<typeof WishlistItemSchema>;

/**
 * Coupon validation schema
 */
export const CouponSchema = z.object({
  codigo: z
    .string()
    .min(3, 'El código debe tener al menos 3 caracteres')
    .max(50, 'El código es muy largo')
    .toUpperCase(),
  descuentoPorcentaje: PercentageSchema.optional(),
  montoDescuento: CurrencySchema.optional(),
});

export type Coupon = z.infer<typeof CouponSchema>;

/**
 * Newsletter subscription validation schema
 */
export const NewsletterSubscriptionSchema = z.object({
  email: EmailSchema,
  nombre: NameSchema.optional(),
  aceptaPromociones: z.boolean().default(true),
});

export type NewsletterSubscription = z.infer<
  typeof NewsletterSubscriptionSchema
>;
