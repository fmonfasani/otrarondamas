import { z } from 'zod';
import {
  EmailSchema,
  NameSchema,
  PhoneSchema,
  AddressSchema,
  PasswordSchema,
  UUIDSchema,
} from './common';

/**
 * Dashboard and user management validation schemas
 */

/**
 * Update settings validation schema
 */
export const UpdateSettingsSchema = z
  .object({
    name: NameSchema.optional(),
    email: EmailSchema.optional(),
    telefono: PhoneSchema.optional(),
    direccion: AddressSchema.optional(),
    fotoUrl: z
      .string()
      .url('URL de foto inválida')
      .nullable()
      .optional(),
  })
  .refine((obj) => Object.values(obj).some((val) => val !== undefined), {
    message: 'Al menos un campo debe ser actualizado',
  });

export type UpdateSettings = z.infer<typeof UpdateSettingsSchema>;

/**
 * Create user validation schema (for admin)
 */
export const CreateUserSchema = z.object({
  nombre: NameSchema,
  email: EmailSchema,
  password: PasswordSchema,
  telefono: PhoneSchema.optional(),
  direccion: AddressSchema.optional(),
  rol: z
    .enum(['ADMIN', 'VENDEDOR', 'GESTOR_INVENTARIO', 'GERENTE'], {
      errorMap: () => ({
        message: 'Rol inválido',
      }),
    })
    .default('VENDEDOR'),
  activo: z.boolean().default(true),
  permisos: z
    .array(z.string())
    .default([]),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

/**
 * Update user validation schema (for admin)
 */
export const UpdateUserSchema = CreateUserSchema.partial().refine(
  (obj) => Object.values(obj).some((val) => val !== undefined),
  {
    message: 'Al menos un campo debe ser actualizado',
  }
);

export type UpdateUser = z.infer<typeof UpdateUserSchema>;

/**
 * User profile validation schema
 */
export const UserProfileSchema = z.object({
  id: UUIDSchema,
  nombre: NameSchema,
  email: EmailSchema,
  empresaId: UUIDSchema,
  rol: z.string(),
  permisos: z.array(z.string()),
  activo: z.boolean(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * Update company settings validation schema
 */
export const UpdateCompanySettingsSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es muy largo')
    .trim()
    .optional(),
  email: EmailSchema.optional(),
  telefono: PhoneSchema.optional(),
  direccion: AddressSchema.optional(),
  logoUrl: z
    .string()
    .url('URL del logo inválida')
    .nullable()
    .optional(),
  activo: z.boolean().optional(),
});

export type UpdateCompanySettings = z.infer<typeof UpdateCompanySettingsSchema>;

/**
 * Change company name validation schema
 */
export const ChangeCompanyNameSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es muy largo')
    .trim(),
});

export type ChangeCompanyName = z.infer<typeof ChangeCompanyNameSchema>;

/**
 * Dashboard metrics query validation schema
 */
export const DashboardMetricsQuerySchema = z.object({
  startDate: z
    .string()
    .datetime('Fecha de inicio inválida')
    .optional(),
  endDate: z
    .string()
    .datetime('Fecha de fin inválida')
    .optional(),
  period: z
    .enum(['day', 'week', 'month', 'year'], {
      errorMap: () => ({
        message: 'Período inválido',
      }),
    })
    .default('month'),
});

export type DashboardMetricsQuery = z.infer<typeof DashboardMetricsQuerySchema>;
