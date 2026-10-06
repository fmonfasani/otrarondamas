/**
 * Payload embedded in the JWT issued by /auth/login.
 * `permisos` travels as a list of names (e.g. 'caja.gastos') so that
 * PermissionsGuard does not need to query the database again on every
 * request.
 * Note: if a permission is revoked, the change is not reflected until
 * the user logs in again (the token is not invalidated immediately).
 * It is a known limitation of the 'permissions in the token' approach,
 * acceptable for this increment; there is no revocation mechanism yet.
 */
// RF-17 (docs/spec-login-roles.md): same values as the Prisma enum
// UserRole — repeated here instead of importing @prisma/client so as
// not to tie auth.types.ts (also consumed outside the request context)
// to the Prisma client generation.
export type UserRole = 'OWNER' | 'ASISTENTE_LOCAL' | 'PROVEEDOR' | 'REPARTIDOR';
export type DossierStatus = 'PENDIENTE' | 'APROBADO';

export interface JwtPayload {
  sub: string; // Usuario.id or Cliente.id depending on `type`
  email: string;
  nombre: string;
  empresaId: string;
  permisos: string[];
  // RF-17: they travel in the token for the same reason as `permisos` —
  // ApprovedDossierGuard needs `estadoLegajo` without querying the
  // database again on every protected request. Same limitation already
  // documented for `permisos`: if the owner approves a dossier, the
  // change is not reflected until that person logs in again.
  rol: UserRole;
  estadoLegajo: DossierStatus;
  // RF-17 customer: distinguishes whether the sub is a Usuario or a
  // Cliente — the same JWT_SECRET signs both so that two Passport
  // strategies are not needed; the guards read this field to know which
  // table to query.
  type: 'usuario' | 'cliente';
  // Only present when type === 'cliente'
  esMayorista?: boolean;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  nombre: string;
  empresaId: string;
  permisos: string[];
  rol: UserRole;
  estadoLegajo: DossierStatus;
  // RF-17 cliente
  type: 'usuario' | 'cliente';
  esMayorista?: boolean;
}

/**
 * Shape of GET /auth/me — unlike AuthenticatedUser (which comes from
 * the JWT, without touching the database again on every protected
 * request), this one does query Prisma fresh: it includes profile data
 * (photo, company name) that makes no sense to embed in the signed
 * token because it can change without the user logging in again.
 */
export interface UserProfile extends AuthenticatedUser {
  empresaNombre: string;
  fotoUrl: string | null;
  metodoLogin: 'google' | 'password';
  createdAt: string;
}
