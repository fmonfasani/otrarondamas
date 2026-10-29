/**
 * Admin and Management types
 * Types for user management, audit logging, and system settings
 */

import { z } from 'zod';
import { Id, Timestamps } from './common';

/**
 * Audit log action types
 */
export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  PUBLISH = 'PUBLISH',
  UNPUBLISH = 'UNPUBLISH',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PERMISSION_GRANT = 'PERMISSION_GRANT',
  PERMISSION_REVOKE = 'PERMISSION_REVOKE',
}

/**
 * Entity types for audit logging
 */
export enum EntityType {
  USER = 'USER',
  BUSINESS = 'BUSINESS',
  PRODUCT = 'PRODUCT',
  ORDER = 'ORDER',
  SALE = 'SALE',
  PAYMENT = 'PAYMENT',
  CUSTOMER = 'CUSTOMER',
  INVENTORY = 'INVENTORY',
  REPORT = 'REPORT',
  SETTINGS = 'SETTINGS',
  PERMISSION = 'PERMISSION',
  ROLE = 'ROLE',
}

/**
 * Audit log entry
 */
export interface AuditLog extends Timestamps {
  id: Id;
  empresaId: Id;
  usuarioId?: Id;
  accion: AuditAction;
  entidadAfectada: EntityType;
  entidadId?: Id;
  valoresAnteriores?: Record<string, unknown>;
  valoresPosteriores?: Record<string, unknown>;
  motivo?: string;
  autorizacionId?: Id;
  ventaId?: Id;
  cambios?: Array<{
    campo: string;
    anterior: unknown;
    nuevo: unknown;
  }>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit summary/statistics
 */
export interface AuditSummary {
  totalLogs: number;
  logsPorDia: Record<string, number>;
  accionesMasComunes: Array<{
    accion: AuditAction;
    cantidad: number;
  }>;
  usuariosMasActivos: Array<{
    usuarioId: Id;
    acciones: number;
  }>;
  entidadesMasModificadas: Array<{
    tipo: EntityType;
    cantidad: number;
  }>;
}

/**
 * User administration
 */
export interface AdminUserList {
  id: Id;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  createdAt: Date;
  ultimoAcceso?: Date;
  activo: boolean;
}

/**
 * Create user admin request
 */
export interface CreateUserAdminRequest {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  activo?: boolean;
  fotoUrl?: string;
}

/**
 * Update user admin request
 */
export interface UpdateUserAdminRequest {
  nombre?: string;
  email?: string;
  rol?: string;
  activo?: boolean;
  fotoUrl?: string;
  passwordHash?: string;
}

/**
 * User admin response
 */
export interface UserAdminResponse {
  id: Id;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  fotoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role definition for admin
 */
export interface RoleAdmin {
  id: Id;
  nombre: string;
  descripcion?: string;
  permisos: string[];
  createdAt: Date;
  updatedAt: Date;
  activo: boolean;
}

/**
 * Create role request
 */
export interface CreateRoleRequest {
  nombre: string;
  descripcion?: string;
  permisos: string[];
}

/**
 * System settings
 */
export interface SystemSettings {
  id: Id;
  empresaId?: Id;
  clave: string;
  valor: unknown;
  tipo: 'string' | 'number' | 'boolean' | 'json';
  descripcion?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Email settings
 */
export interface EmailSettings extends SystemSettings {
  clave: 'EMAIL_PROVIDER';
  valor: {
    provider: 'smtp' | 'sendgrid' | 'mailgun';
    host?: string;
    port?: number;
    username?: string;
    apiKey?: string;
    fromAddress: string;
    fromName: string;
  };
}

/**
 * Feature flag
 */
export interface FeatureFlag extends SystemSettings {
  clave: string; // 'FEATURE_*'
  valor: boolean;
  targets?: {
    businesses?: Id[];
    users?: Id[];
    percentage?: number;
  };
}

/**
 * Activity dashboard
 */
export interface ActivityDashboard {
  recentLogins: Array<{
    usuarioId: Id;
    nombre: string;
    timestamp: Date;
  }>;
  recentChanges: Array<{
    accion: AuditAction;
    entidad: EntityType;
    timestamp: Date;
    usuario: string;
  }>;
  systemHealth: {
    apiUptime: number; // percentage
    databaseStatus: 'online' | 'offline';
    lastBackup: Date;
    cacheStatus: 'online' | 'offline';
  };
}

/**
 * Bulk operations
 */
export interface BulkOperation {
  id: Id;
  tipo: 'IMPORT' | 'EXPORT' | 'DELETE' | 'UPDATE';
  estado: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalItems: number;
  procesados: number;
  fallidos: number;
  errores?: Array<{
    fila: number;
    error: string;
  }>;
  iniciado: Date;
  completado?: Date;
}

/**
 * Data export configuration
 */
export interface DataExport {
  id: Id;
  tipo: string; // 'SALES', 'CUSTOMERS', 'INVENTORY', etc
  formato: 'CSV' | 'JSON' | 'EXCEL';
  estado: 'PENDING' | 'GENERATING' | 'READY' | 'FAILED';
  url?: string;
  createdAt: Date;
  expiresAt: Date;
  tamaño?: number; // bytes
}

/**
 * System health check
 */
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    database: boolean;
    cache: boolean;
    storage: boolean;
    externalApis: boolean;
  };
  uptime: number; // seconds
  responseTime: number; // ms
}

/**
 * Dashboard KPI for admin
 */
export interface AdminDashboardKPI {
  totalUsers: number;
  activeUsers: number;
  totalBusinesses: number;
  totalRevenue: number;
  systemUptime: number;
  lastBackupTime: Date;
  failedJobs: number;
}

/**
 * Zod validation schemas
 */
export const AuditActionSchema = z.nativeEnum(AuditAction);
export const EntityTypeSchema = z.nativeEnum(EntityType);

export const AuditLogSchema = z.object({
  id: z.string(),
  empresaId: z.string(),
  usuarioId: z.string().optional(),
  accion: AuditActionSchema,
  entidadAfectada: EntityTypeSchema,
  entidadId: z.string().optional(),
  valoresAnteriores: z.record(z.unknown()).optional(),
  valoresPosteriores: z.record(z.unknown()).optional(),
  motivo: z.string().optional(),
  autorizacionId: z.string().optional(),
  ventaId: z.string().optional(),
  cambios: z
    .array(
      z.object({
        campo: z.string(),
        anterior: z.unknown(),
        nuevo: z.unknown(),
      }),
    )
    .optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateUserAdminRequestSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  rol: z.string(),
  activo: z.boolean().optional(),
  fotoUrl: z.string().url().optional(),
});

export const CreateRoleRequestSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  permisos: z.array(z.string()),
});

export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.coerce.date(),
  checks: z.object({
    database: z.boolean(),
    cache: z.boolean(),
    storage: z.boolean(),
    externalApis: z.boolean(),
  }),
  uptime: z.number(),
  responseTime: z.number(),
});

/**
 * Type inference helpers
 */
export type AuditLogType = z.infer<typeof AuditLogSchema>;
export type CreateUserAdminRequestType = z.infer<typeof CreateUserAdminRequestSchema>;
export type CreateRoleRequestType = z.infer<typeof CreateRoleRequestSchema>;
export type HealthCheckType = z.infer<typeof HealthCheckSchema>;
