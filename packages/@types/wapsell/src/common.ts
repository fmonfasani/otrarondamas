/**
 * Common types shared across all Wapsell applications
 * These are foundational types used by other domain modules
 */

import { z } from 'zod';

/**
 * Unique identifier used across the system
 * Typically UUIDs
 */
export type Id = string;

/**
 * Supported currency codes
 * Currently focused on ARS (Argentine Peso)
 */
export enum CurrencyCode {
  ARS = 'ARS',
  USD = 'USD',
  EUR = 'EUR',
}

/**
 * Base timestamps present on all entities
 */
export interface Timestamps {
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Soft delete support for entities
 */
export interface SoftDeletable {
  deletedAt?: Date | string | null;
}

/**
 * Audit trail for entity changes
 */
export interface Auditable {
  createdBy?: string;
  updatedBy?: string;
  deletedBy?: string;
}

/**
 * Status enumerations
 */
export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Standard API response format
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: Record<string, unknown>;
}

/**
 * Decimal values for currency/money calculations
 * Stored as string to preserve precision
 */
export type Decimal = string | number;

/**
 * Contact information
 */
export interface ContactInfo {
  email: string;
  phone?: string;
  whatsapp?: string;
}

/**
 * Geographic location
 */
export interface Location {
  country?: string;
  province?: string;
  city?: string;
  postalCode?: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Zod schemas for common types
 */
export const IdSchema = z.string().uuid('Invalid ID format');

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DecimalSchema = z.union([z.string().regex(/^\d+(\.\d+)?$/), z.number().positive()]);

export const ContactInfoSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
});

export const LocationSchema = z.object({
  country: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  coordinates: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
});

export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  pages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.unknown()).optional(),
    })
    .optional(),
  meta: z.record(z.unknown()).optional(),
});

/**
 * Type inference helpers
 */
export type ContactInfoType = z.infer<typeof ContactInfoSchema>;
export type LocationType = z.infer<typeof LocationSchema>;
export type PaginationMetaType = z.infer<typeof PaginationMetaSchema>;
export type ApiResponseType<T = unknown> = z.infer<typeof ApiResponseSchema> & { data?: T };
