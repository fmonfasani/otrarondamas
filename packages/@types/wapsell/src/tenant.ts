/**
 * Tenant and business context types
 * Core types for multi-tenant isolation and business entity management
 */

import { z } from 'zod';
import { Id, Timestamps, CurrencyCode, CurrencyCodeSchema, Decimal, DecimalSchema, Location, LocationSchema } from './common';

/**
 * Business entity (Empresa)
 * Represents a company/business/tenant in the system
 */
export interface Business extends Timestamps {
  id: Id;
  nombre: string;
  handle?: string;
  slug: string;
  configuracion: Record<string, unknown>;
  // Owner relationship is managed through Membership
}

/**
 * Business detailed information
 */
export interface BusinessDetail extends Business {
  ownerId?: Id;
  currency: CurrencyCode;
  location?: Location;
  taxId?: string;
  description?: string;
  logo?: string;
  website?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  membershipsCount: number;
}

/**
 * User membership in a business
 * Defines the relationship between a User and a Business
 */
export enum MembershipRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  READONLY = 'READONLY',
}

/**
 * User membership status
 */
export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  INVITED = 'INVITED',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Membership entity
 */
export interface Membership extends Timestamps {
  id: Id;
  userId: Id;
  businessId: Id;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: Date;
  lastAccessAt?: Date;
  capabilities?: string[]; // Granular permissions
}

/**
 * Membership with related data
 */
export interface MembershipDetail extends Membership {
  user?: {
    id: Id;
    nombre: string;
    email: string;
    fotoUrl?: string;
  };
  business?: {
    id: Id;
    nombre: string;
    slug: string;
  };
}

/**
 * Invitation to join a business
 */
export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/**
 * Business invitation
 */
export interface Invitation extends Timestamps {
  id: Id;
  businessId: Id;
  email: string;
  role: MembershipRole;
  status: InvitationStatus;
  invitedBy: Id;
  expiresAt: Date;
  acceptedAt?: Date;
  token: string;
}

/**
 * Tenant context passed through request
 */
export interface TenantContext {
  tenantId: Id;
  userId: Id;
  userRole: MembershipRole;
  capabilities: string[];
}

/**
 * Business configuration
 */
export interface BusinessConfig {
  // Feature flags
  enableInventory: boolean;
  enableOnlineStore: boolean;
  enableDelivery: boolean;
  enablePayments: boolean;
  enableNotifications: boolean;
  enableAnalytics: boolean;

  // Settings
  currency: CurrencyCode;
  timezone: string;
  language: string;

  // Business rules
  taxRate?: Decimal;
  defaultDiscountPercentage?: Decimal;
  minOrderAmount?: Decimal;
  maxOrderAmount?: Decimal;

  // Contact settings
  publicEmail?: string;
  publicPhone?: string;
  supportEmail?: string;

  // Integrations
  integrations?: {
    mercadopago?: {
      enabled: boolean;
      publicKey?: string;
    };
    twilio?: {
      enabled: boolean;
      accountSid?: string;
    };
    google?: {
      enabled: boolean;
      businessId?: string;
    };
  };

  // Custom fields
  customFields?: Record<string, unknown>;
}

/**
 * Business statistics
 */
export interface BusinessStats {
  totalUsers: number;
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: Decimal;
  activeProducts: number;
  monthlyActiveUsers: number;
}

/**
 * Create business request
 */
export interface CreateBusinessRequest {
  nombre: string;
  slug: string;
  currency?: CurrencyCode;
  description?: string;
  website?: string;
  configuration?: Partial<BusinessConfig>;
}

/**
 * Update business request
 */
export interface UpdateBusinessRequest {
  nombre?: string;
  slug?: string;
  description?: string;
  website?: string;
  configuration?: Partial<BusinessConfig>;
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
}

/**
 * Update membership request
 */
export interface UpdateMembershipRequest {
  role?: MembershipRole;
  status?: MembershipStatus;
  capabilities?: string[];
}

/**
 * Invite user request
 */
export interface InviteUserRequest {
  email: string;
  role: MembershipRole;
  message?: string;
}

/**
 * Zod validation schemas
 */
export const MembershipRoleSchema = z.nativeEnum(MembershipRole);
export const MembershipStatusSchema = z.nativeEnum(MembershipStatus);
export const InvitationStatusSchema = z.nativeEnum(InvitationStatus);

export const BusinessSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1),
  handle: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  configuracion: z.record(z.unknown()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const MembershipSchema = z.object({
  id: z.string(),
  userId: z.string(),
  businessId: z.string(),
  role: MembershipRoleSchema,
  status: MembershipStatusSchema,
  joinedAt: z.coerce.date(),
  lastAccessAt: z.coerce.date().optional(),
  capabilities: z.array(z.string()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const InvitationSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  email: z.string().email(),
  role: MembershipRoleSchema,
  status: InvitationStatusSchema,
  invitedBy: z.string(),
  expiresAt: z.coerce.date(),
  acceptedAt: z.coerce.date().optional(),
  token: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const BusinessConfigSchema = z.object({
  enableInventory: z.boolean(),
  enableOnlineStore: z.boolean(),
  enableDelivery: z.boolean(),
  enablePayments: z.boolean(),
  enableNotifications: z.boolean(),
  enableAnalytics: z.boolean(),
  currency: CurrencyCodeSchema,
  timezone: z.string(),
  language: z.string(),
  taxRate: DecimalSchema.optional(),
  defaultDiscountPercentage: DecimalSchema.optional(),
  minOrderAmount: DecimalSchema.optional(),
  maxOrderAmount: DecimalSchema.optional(),
  publicEmail: z.string().email().optional(),
  publicPhone: z.string().optional(),
  supportEmail: z.string().email().optional(),
  integrations: z
    .object({
      mercadopago: z.object({ enabled: z.boolean(), publicKey: z.string().optional() }).optional(),
      twilio: z.object({ enabled: z.boolean(), accountSid: z.string().optional() }).optional(),
      google: z.object({ enabled: z.boolean(), businessId: z.string().optional() }).optional(),
    })
    .optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const CreateBusinessRequestSchema = z.object({
  nombre: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  currency: CurrencyCodeSchema.optional(),
  description: z.string().optional(),
  website: z.string().url().optional(),
  configuration: BusinessConfigSchema.partial().optional(),
});

export const InviteUserRequestSchema = z.object({
  email: z.string().email(),
  role: MembershipRoleSchema,
  message: z.string().optional(),
});

/**
 * Type inference helpers
 */
export type BusinessType = z.infer<typeof BusinessSchema>;
export type MembershipType = z.infer<typeof MembershipSchema>;
export type InvitationType = z.infer<typeof InvitationSchema>;
export type BusinessConfigType = z.infer<typeof BusinessConfigSchema>;
export type CreateBusinessRequestType = z.infer<typeof CreateBusinessRequestSchema>;
export type InviteUserRequestType = z.infer<typeof InviteUserRequestSchema>;
