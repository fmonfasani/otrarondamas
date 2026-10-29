/**
 * Authentication and authorization types
 * Core types for user sessions, JWT, roles and permissions
 */

import { z } from 'zod';
import { Id, Timestamps, ContactInfo, ContactInfoSchema } from './common';

/**
 * User roles in the system
 * OWNER: Full system access, business owner
 * ASISTENTE_LOCAL: Local assistant with limited permissions
 * PROVEEDOR: Supplier/provider account
 * REPARTIDOR: Delivery person account
 * CLIENTE: End customer
 */
export enum UserRole {
  OWNER = 'OWNER',
  ASISTENTE_LOCAL = 'ASISTENTE_LOCAL',
  PROVEEDOR = 'PROVEEDOR',
  REPARTIDOR = 'REPARTIDOR',
  CLIENTE = 'CLIENTE',
}

/**
 * User dossier/legajo status for approval workflow
 */
export enum DossierStatus {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
}

/**
 * User account status
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

/**
 * User type discriminator for JWT
 */
export type UserType = 'usuario' | 'cliente';

/**
 * Core user entity (staff/internal users)
 */
export interface User extends Timestamps {
  id: Id;
  empresaId: Id;
  nombre: string;
  email: string;
  passwordHash?: string;
  activo: boolean;
  fotoUrl?: string | null;
  googleId?: string | null;
  estadoLegajo: DossierStatus;
  rol: UserRole;
}

/**
 * User profile with additional details
 */
export interface UserProfile extends User {
  empresaNombre: string;
  metodoLogin: 'google' | 'password';
  empresasDetail?: Array<{
    id: Id;
    nombre: string;
    role: string;
    createdAt: string;
  }>;
}

/**
 * Company/Empresa reference in JWT
 */
export interface EmpresaInJwt {
  id: Id;
  nombre: string;
  role: string;
}

/**
 * JWT payload structure
 * Embedded in signed tokens issued by /auth/login
 */
export interface JwtPayload {
  // Subject: Usuario.id or Cliente.id depending on `type`
  sub: Id;
  email: string;
  nombre: string;
  empresaId: Id;
  // Permissions list (for backwards compatibility)
  permisos: string[];
  // User role
  rol: UserRole;
  // Dossier approval status
  estadoLegajo: DossierStatus;
  // Type discriminator: 'usuario' for staff, 'cliente' for customers
  type: UserType;
  // Customer-specific fields
  esMayorista?: boolean;
  // Multi-business support
  empresas?: EmpresaInJwt[];
  // Token metadata
  iat?: number;
  exp?: number;
  iss?: string;
}

/**
 * Authenticated user context (extracted from JWT)
 */
export interface AuthenticatedUser {
  id: Id;
  email: string;
  nombre: string;
  empresaId: Id;
  permisos: string[];
  rol: UserRole;
  estadoLegajo: DossierStatus;
  type: UserType;
  esMayorista?: boolean;
  empresas?: EmpresaInJwt[];
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response with token
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: UserProfile;
  expiresIn: number; // in seconds
}

/**
 * Token refresh request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Customer registration request
 */
export interface CustomerRegistrationRequest {
  email: string;
  nombre: string;
  password: string;
  phone?: string;
  esMayorista?: boolean;
}

/**
 * Sign up/registration request (generic)
 */
export interface SignUpRequest {
  email: string;
  nombre: string;
  password: string;
  type: UserType;
  rol?: UserRole;
}

/**
 * Session information
 */
export interface Session {
  id: Id;
  userId: Id;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  createdAt: Date;
  lastAccessedAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Permission/capability definition
 */
export interface Permission {
  id: Id;
  nombre: string;
  descripcion?: string;
  resource: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role definition
 */
export interface Role {
  id: Id;
  nombre: string;
  descripcion?: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

/**
 * Change password request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * OAuth provider configuration
 */
export type OAuthProvider = 'google' | 'github' | 'microsoft';

/**
 * OAuth callback payload
 */
export interface OAuthCallbackPayload {
  provider: OAuthProvider;
  code: string;
  state?: string;
}

/**
 * Zod validation schemas
 */
export const UserRoleSchema = z.nativeEnum(UserRole);
export const DossierStatusSchema = z.nativeEnum(DossierStatus);
export const UserStatusSchema = z.nativeEnum(UserStatus);
export const UserTypeSchema = z.enum(['usuario', 'cliente']);

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const SignUpRequestSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(2),
  password: z.string().min(8),
  type: UserTypeSchema,
  rol: UserRoleSchema.optional(),
});

export const CustomerRegistrationRequestSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(2),
  password: z.string().min(8),
  phone: z.string().optional(),
  esMayorista: z.boolean().optional(),
});

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const PasswordResetConfirmSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

export const JwtPayloadSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  nombre: z.string(),
  empresaId: z.string(),
  permisos: z.array(z.string()),
  rol: UserRoleSchema,
  estadoLegajo: DossierStatusSchema,
  type: UserTypeSchema,
  esMayorista: z.boolean().optional(),
  empresas: z
    .array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        role: z.string(),
      }),
    )
    .optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
  iss: z.string().optional(),
});

export const AuthenticatedUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  nombre: z.string(),
  empresaId: z.string(),
  permisos: z.array(z.string()),
  rol: UserRoleSchema,
  estadoLegajo: DossierStatusSchema,
  type: UserTypeSchema,
  esMayorista: z.boolean().optional(),
  empresas: z
    .array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        role: z.string(),
      }),
    )
    .optional(),
});

/**
 * Type inference helpers
 */
export type LoginRequestType = z.infer<typeof LoginRequestSchema>;
export type SignUpRequestType = z.infer<typeof SignUpRequestSchema>;
export type CustomerRegistrationRequestType = z.infer<typeof CustomerRegistrationRequestSchema>;
export type JwtPayloadType = z.infer<typeof JwtPayloadSchema>;
export type AuthenticatedUserType = z.infer<typeof AuthenticatedUserSchema>;
