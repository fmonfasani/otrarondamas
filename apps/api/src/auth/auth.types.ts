/**
 * Payload embebido en el JWT emitido por /auth/login.
 * `permisos` viaja como lista de nombres (ej. 'caja.gastos') para que
 * PermissionsGuard no necesite volver a consultar la base en cada request.
 * Nota: si un permiso se revoca, el cambio no se refleja hasta que el
 * usuario vuelva a loguearse (el token no se invalida en el acto). Es una
 * limitación conocida del enfoque "permisos en el token", aceptable para
 * este incremento; no hay mecanismo de revocación todavía.
 */
export interface JwtPayload {
  sub: string; // Usuario.id
  email: string;
  nombre: string;
  empresaId: string;
  permisos: string[];
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  nombre: string;
  empresaId: string;
  permisos: string[];
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
