// Tipos compartidos entre apps/api y los frontends para los endpoints ya
// implementados. Se mantienen sincronizados a mano con los DTOs/respuestas
// reales de apps/api/src (no son un espejo automático de schema.prisma).

export interface AuthenticatedUser {
  id: string;
  email: string;
  nombre: string;
  empresaId: string;
  permisos: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  usuario: AuthenticatedUser;
}
