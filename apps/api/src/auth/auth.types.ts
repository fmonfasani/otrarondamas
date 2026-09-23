/**
 * Payload embebido en el JWT emitido por /auth/login.
 * `permisos` viaja como lista de nombres (ej. 'caja.gastos') para que
 * PermissionsGuard no necesite volver a consultar la base en cada request.
 * Nota: si un permiso se revoca, el cambio no se refleja hasta que el
 * usuario vuelva a loguearse (el token no se invalida en el acto). Es una
 * limitación conocida del enfoque "permisos en el token", aceptable para
 * este incremento; no hay mecanismo de revocación todavía.
 */
// RF-17 (docs/spec-login-roles.md): mismos valores que el enum Prisma
// RolUsuario — repetido acá en vez de importar @prisma/client para no
// atar auth.types.ts (consumido también fuera del contexto de request)
// a la generación del cliente Prisma.
export type RolUsuario = 'OWNER' | 'ASISTENTE_LOCAL' | 'PROVEEDOR' | 'REPARTIDOR';
export type EstadoLegajo = 'PENDIENTE' | 'APROBADO';

export interface JwtPayload {
  sub: string; // Usuario.id o Cliente.id según `type`
  email: string;
  nombre: string;
  empresaId: string;
  permisos: string[];
  // RF-17: viajan en el token por el mismo motivo que `permisos` —
  // LegajoAprobadoGuard necesita `estadoLegajo` sin volver a consultar
  // la base en cada request protegido. Misma limitación ya documentada
  // para `permisos`: si el dueño aprueba un legajo, el cambio no se
  // refleja hasta que esa persona vuelva a loguearse.
  rol: RolUsuario;
  estadoLegajo: EstadoLegajo;
  // RF-17 cliente: distingue si el sub es un Usuario o un Cliente —
  // el mismo JWT_SECRET firma ambos para no necesitar dos estrategias
  // Passport; los guards leen este campo para saber qué tabla consultar.
  type: 'usuario' | 'cliente';
  // Solo presente cuando type === 'cliente'
  esMayorista?: boolean;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  nombre: string;
  empresaId: string;
  permisos: string[];
  rol: RolUsuario;
  estadoLegajo: EstadoLegajo;
  // RF-17 cliente
  type: 'usuario' | 'cliente';
  esMayorista?: boolean;
}

/**
 * Shape de GET /auth/me — a diferencia de AuthenticatedUser (que sale
 * del JWT, sin volver a tocar la base en cada request protegido), este
 * sí consulta Prisma fresco: incluye datos de perfil (foto, nombre de
 * empresa) que no tiene sentido embeber en el token firmado porque
 * pueden cambiar sin que el usuario vuelva a loguearse.
 */
export interface PerfilUsuario extends AuthenticatedUser {
  empresaNombre: string;
  fotoUrl: string | null;
  metodoLogin: 'google' | 'password';
  createdAt: string;
}
