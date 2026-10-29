import { z } from 'zod';
import {
  UUIDSchema,
  EmailSchema,
  NameSchema,
  PhoneSchema,
  AddressSchema,
  PasswordSchema,
  CurrencySchema,
} from './common';

/**
 * Admin panel validation schemas
 */

/**
 * Create tenant validation schema
 */
export const CreateTenantSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es muy largo')
    .trim(),
  email: EmailSchema,
  contacto: NameSchema,
  telefono: PhoneSchema.optional(),
  direccion: AddressSchema.optional(),
  plan: z.enum(['gratuito', 'profesional', 'empresarial'], {
    errorMap: () => ({
      message: 'Plan inválido',
    }),
  }),
  activo: z.boolean().default(true),
});

export type CreateTenant = z.infer<typeof CreateTenantSchema>;

/**
 * Update tenant validation schema
 */
export const UpdateTenantSchema = CreateTenantSchema.partial().refine(
  (obj) => Object.values(obj).some((val) => val !== undefined),
  {
    message: 'Al menos un campo debe ser actualizado',
  }
);

export type UpdateTenant = z.infer<typeof UpdateTenantSchema>;

/**
 * Update user admin validation schema
 */
export const UpdateUserAdminSchema = z.object({
  nombre: NameSchema.optional(),
  email: EmailSchema.optional(),
  password: PasswordSchema.optional(),
  telefono: PhoneSchema.optional(),
  rol: z
    .enum(['ADMIN', 'VENDEDOR', 'GESTOR_INVENTARIO', 'GERENTE'], {
      errorMap: () => ({
        message: 'Rol inválido',
      }),
    })
    .optional(),
  permisos: z.array(z.string()).optional(),
  activo: z.boolean().optional(),
});

export type UpdateUserAdmin = z.infer<typeof UpdateUserAdminSchema>;

/**
 * Create product validation schema (admin)
 */
export const CreateProductAdminSchema = z.object({
  nombre: NameSchema,
  codigoInterno: z
    .string()
    .min(1, 'Código interno es requerido')
    .max(50, 'Código interno es muy largo'),
  codigoBarras: z
    .string()
    .max(50, 'Código de barras es muy largo')
    .optional(),
  marca: z
    .string()
    .max(100, 'Marca es muy larga')
    .optional(),
  familiaId: UUIDSchema,
  subfamiliaId: UUIDSchema,
  tipoId: UUIDSchema,
  subtipoId: UUIDSchema,
  unidadBase: z.enum(['UNIDAD', 'KILOGRAMO', 'LITRO', 'METRO', 'PACK', 'CAJA'], {
    errorMap: () => ({
      message: 'Unidad base inválida',
    }),
  }),
  costo: CurrencySchema,
  precioMinorista: CurrencySchema,
  precioMayorista: CurrencySchema.optional(),
  descuentoPorcentaje: z
    .number()
    .min(0)
    .max(100)
    .optional(),
  activo: z.boolean().default(true),
});

export type CreateProductAdmin = z.infer<typeof CreateProductAdminSchema>;

/**
 * Update product validation schema (admin)
 */
export const UpdateProductAdminSchema = CreateProductAdminSchema.partial()
  .omit({ codigoInterno: true }) // SKU cannot be changed after creation
  .refine((obj) => Object.values(obj).some((val) => val !== undefined), {
    message: 'Al menos un campo debe ser actualizado',
  });

export type UpdateProductAdmin = z.infer<typeof UpdateProductAdminSchema>;

/**
 * Create category (Familia) validation schema
 */
export const CreateCategorySchema = z.object({
  nombre: NameSchema,
  prefijo: z
    .string()
    .min(2, 'El prefijo debe tener al menos 2 caracteres')
    .max(3, 'El prefijo no puede exceder 3 caracteres')
    .toUpperCase(),
  activo: z.boolean().default(true),
});

export type CreateCategory = z.infer<typeof CreateCategorySchema>;

/**
 * Update category validation schema
 */
export const UpdateCategorySchema = CreateCategorySchema.partial().refine(
  (obj) => Object.values(obj).some((val) => val !== undefined),
  {
    message: 'Al menos un campo debe ser actualizado',
  }
);

export type UpdateCategory = z.infer<typeof UpdateCategorySchema>;

/**
 * System settings validation schema
 */
export const SystemSettingsSchema = z.object({
  monedaDefault: z.enum(['ARS', 'USD'], {
    errorMap: () => ({
      message: 'Moneda inválida',
    }),
  }),
  precisionDecimal: z
    .number()
    .int()
    .min(0)
    .max(4)
    .default(2),
  impuestoDefault: z
    .number()
    .min(0)
    .max(100)
    .default(0),
  stockMinimoDefault: z
    .number()
    .int()
    .min(0)
    .default(0),
  diasAnticipadosVencimiento: z
    .number()
    .int()
    .positive()
    .default(7),
  permitirVentasConStockNegativo: z.boolean().default(false),
  requiereAuthorizacionAuditoCaja: z.boolean().default(true),
});

export type SystemSettings = z.infer<typeof SystemSettingsSchema>;

/**
 * Audit log query validation schema
 */
export const AuditLogQuerySchema = z.object({
  startDate: z
    .string()
    .datetime('Fecha de inicio inválida')
    .optional(),
  endDate: z
    .string()
    .datetime('Fecha de fin inválida')
    .optional(),
  usuarioId: UUIDSchema.optional(),
  accion: z.string().optional(),
  entidad: z.string().optional(),
  page: z
    .number()
    .int()
    .positive()
    .default(1),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .default(10),
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
