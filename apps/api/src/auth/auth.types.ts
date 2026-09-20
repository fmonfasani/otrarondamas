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
