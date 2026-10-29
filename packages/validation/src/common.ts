import { z } from 'zod';

/**
 * Common validation schemas shared across all applications
 */

/**
 * Email validation schema
 */
export const EmailSchema = z
  .string()
  .email('Email inválido')
  .min(1, 'Email es requerido')
  .max(255, 'Email es muy largo')
  .transform((val) => val.toLowerCase().trim());

export type Email = z.infer<typeof EmailSchema>;

/**
 * Password validation schema
 * Minimum 6 characters, maximum 128
 */
export const PasswordSchema = z
  .string()
  .min(6, 'La contraseña debe tener al menos 6 caracteres')
  .max(128, 'La contraseña es muy larga')
  .refine(
    (val) => /[a-z]/.test(val) && /[A-Z]/.test(val) && /[0-9]/.test(val),
    'La contraseña debe contener mayúsculas, minúsculas y números'
  );

export type Password = z.infer<typeof PasswordSchema>;

/**
 * Strong password validation schema (with special characters requirement)
 */
export const StrongPasswordSchema = PasswordSchema.refine(
  (val) => /[!@#$%^&*(),.?":{}|<>]/.test(val),
  'La contraseña debe contener al menos un carácter especial'
);

export type StrongPassword = z.infer<typeof StrongPasswordSchema>;

/**
 * Name validation schema (2-100 characters)
 */
export const NameSchema = z
  .string()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(100, 'El nombre es muy largo')
  .trim();

export type Name = z.infer<typeof NameSchema>;

/**
 * Phone number validation schema
 * Accepts various formats: +54 9 11 1234-5678, 011 1234-5678, 1112345678, etc.
 */
export const PhoneSchema = z
  .string()
  .regex(
    /^(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/,
    'Número de teléfono inválido'
  )
  .transform((val) => val.replace(/\D/g, '').slice(-10)); // Extract last 10 digits for AR

export type Phone = z.infer<typeof PhoneSchema>;

/**
 * Address validation schema
 */
export const AddressSchema = z
  .string()
  .min(5, 'La dirección debe tener al menos 5 caracteres')
  .max(255, 'La dirección es muy larga')
  .trim();

export type Address = z.infer<typeof AddressSchema>;

/**
 * Currency amount validation schema (decimal with 2 places)
 */
export const CurrencySchema = z
  .number()
  .positive('El monto debe ser positivo')
  .max(999999999.99, 'El monto es demasiado grande')
  .refine((val) => Number.isFinite(val), 'El monto debe ser un número válido');

export type Currency = z.infer<typeof CurrencySchema>;

/**
 * Currency string validation schema (for Prisma Decimal serialization)
 */
export const CurrencyStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Formato de moneda inválido')
  .transform((val) => parseFloat(val));

export type CurrencyString = z.infer<typeof CurrencyStringSchema>;

/**
 * UUID validation schema
 */
export const UUIDSchema = z
  .string()
  .uuid('ID inválido')
  .min(1, 'ID es requerido');

export type UUID = z.infer<typeof UUIDSchema>;

/**
 * Quantity validation schema (positive integer)
 */
export const QuantitySchema = z
  .number()
  .int('La cantidad debe ser un número entero')
  .positive('La cantidad debe ser positiva')
  .max(999999, 'La cantidad es demasiado grande');

export type Quantity = z.infer<typeof QuantitySchema>;

/**
 * Percentage validation schema (0-100)
 */
export const PercentageSchema = z
  .number()
  .min(0, 'El porcentaje no puede ser negativo')
  .max(100, 'El porcentaje no puede ser mayor a 100');

export type Percentage = z.infer<typeof PercentageSchema>;

/**
 * Date validation schema (ISO string)
 */
export const DateSchema = z
  .string()
  .datetime('Fecha inválida')
  .optional();

export type DateValue = z.infer<typeof DateSchema>;

/**
 * Pagination validation schema
 */
export const PaginationSchema = z.object({
  page: z
    .number()
    .int('La página debe ser un número entero')
    .positive('La página debe ser positiva')
    .default(1),
  limit: z
    .number()
    .int('El límite debe ser un número entero')
    .positive('El límite debe ser positivo')
    .max(100, 'El límite no puede ser mayor a 100')
    .default(10),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Search query validation schema
 */
export const SearchQuerySchema = z
  .string()
  .min(1, 'La búsqueda no puede estar vacía')
  .max(255, 'La búsqueda es muy larga')
  .trim();

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
