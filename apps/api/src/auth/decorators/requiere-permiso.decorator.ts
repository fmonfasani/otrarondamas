import { SetMetadata } from '@nestjs/common';

export const PERMISO_KEY = 'permisoRequerido';

/**
 * Marca un handler/controller como restringido a usuarios que tengan el
 * permiso indicado (ver Usuario.usuarioPermisos / Permiso.nombre en el
 * schema). Debe combinarse con JwtAuthGuard + PermissionsGuard — este
 * decorador solo, sin los guards, no restringe nada.
 */
export const RequierePermiso = (permiso: string) => SetMetadata(PERMISO_KEY, permiso);
