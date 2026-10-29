import { z } from 'zod';
import {
  UUIDSchema,
  CurrencySchema,
  QuantitySchema,
  PercentageSchema,
  EmailSchema,
  NameSchema,
  PhoneSchema,
  AddressSchema,
} from './common';

/**
 * Point of Sale (POS) validation schemas
 */

/**
 * Create sale item validation schema
 */
export const CreateSaleItemSchema = z.object({
  productoId: UUIDSchema,
  cantidad: QuantitySchema,
  descuentoItem: PercentageSchema.optional(),
});

export type CreateSaleItem = z.infer<typeof CreateSaleItemSchema>;

/**
 * Create sale validation schema
 */
export const CreateSaleSchema = z.object({
  canal: z.enum(['presencial', 'mayorista', 'online'], {
    errorMap: () => ({
      message: 'Canal de venta inválido',
    }),
  }),
  clienteId: UUIDSchema.optional(),
  items: z
    .array(CreateSaleItemSchema)
    .min(1, 'Debe haber al menos un item en la venta'),
  idempotencyKey: z
    .string()
    .uuid('Clave de idempotencia inválida')
    .optional(),
});

export type CreateSale = z.infer<typeof CreateSaleSchema>;

/**
 * Update cart validation schema
 */
export const UpdateCartSchema = z.object({
  items: z
    .array(CreateSaleItemSchema)
    .min(1, 'El carrito debe tener al menos un item'),
  clienteId: UUIDSchema.optional(),
  descuentoManual: PercentageSchema.optional(),
});

export type UpdateCart = z.infer<typeof UpdateCartSchema>;

/**
 * Payment method type
 */
export const PaymentMethodSchema = z.enum(['efectivo', 'transferencia', 'QR'], {
  errorMap: () => ({
    message: 'Método de pago inválido',
  }),
});

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

/**
 * Create payment validation schema
 */
export const PaymentSchema = z
  .object({
    medio: PaymentMethodSchema,
    monto: CurrencySchema,
    montoRecibido: CurrencySchema.optional(), // For cash payments
    referencia: z
      .string()
      .max(100, 'Referencia es muy larga')
      .optional(), // For transfer/QR
    vuelto: CurrencySchema.optional(),
  })
  .refine(
    (data) => {
      if (data.medio === 'efectivo') {
        return data.montoRecibido !== undefined && data.montoRecibido >= data.monto;
      }
      return true;
    },
    {
      message: 'El monto recibido debe ser mayor o igual al monto de la venta',
      path: ['montoRecibido'],
    }
  );

export type Payment = z.infer<typeof PaymentSchema>;

/**
 * Quotation request validation schema
 */
export const QuotationRequestSchema = z.object({
  canal: z.enum(['presencial', 'mayorista', 'online'], {
    errorMap: () => ({
      message: 'Canal de venta inválido',
    }),
  }),
  clienteId: UUIDSchema.optional(),
  items: z
    .array(CreateSaleItemSchema)
    .min(1, 'Debe haber al menos un item en la cotización'),
});

export type QuotationRequest = z.infer<typeof QuotationRequestSchema>;

/**
 * Create customer validation schema (for POS)
 */
export const CreateCustomerSchema = z.object({
  nombre: NameSchema,
  email: EmailSchema.optional(),
  telefono: PhoneSchema.optional(),
  direccion: AddressSchema.optional(),
});

export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;

/**
 * Update customer validation schema
 */
export const UpdateCustomerSchema = CreateCustomerSchema.partial().refine(
  (obj) => Object.values(obj).some((val) => val !== undefined),
  {
    message: 'Al menos un campo debe ser actualizado',
  }
);

export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;

/**
 * Cash register validation schema
 */
export const OpenCashRegisterSchema = z.object({
  montoInicial: CurrencySchema,
});

export type OpenCashRegister = z.infer<typeof OpenCashRegisterSchema>;

/**
 * Register cash movement validation schema
 */
export const RegisterCashMovementSchema = z.object({
  tipo: z.enum(['Ingreso', 'Egreso', 'Gasto', 'Retiro'], {
    errorMap: () => ({
      message: 'Tipo de movimiento inválido',
    }),
  }),
  monto: CurrencySchema,
  descripcion: z
    .string()
    .max(255, 'Descripción es muy larga')
    .optional(),
});

export type RegisterCashMovement = z.infer<typeof RegisterCashMovementSchema>;

/**
 * Close cash register validation schema
 */
export const CloseCashRegisterSchema = z.object({
  usuarioEntranteId: UUIDSchema,
  efectivoContado: CurrencySchema,
});

export type CloseCashRegister = z.infer<typeof CloseCashRegisterSchema>;

/**
 * Authorize cash register audit validation schema
 */
export const AuthorizeCashAuditSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Contraseña es requerida'),
  motivo: z
    .string()
    .max(255, 'Motivo es muy largo')
    .optional(),
});

export type AuthorizeCashAudit = z.infer<typeof AuthorizeCashAuditSchema>;
