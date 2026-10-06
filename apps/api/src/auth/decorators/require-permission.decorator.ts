import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permisoRequerido';

/**
 * Marks a handler/controller as restricted to users who hold the given
 * permission (see Usuario.usuarioPermisos / Permiso.nombre in the
 * schema). It must be combined with JwtAuthGuard + PermissionsGuard —
 * this decorator alone, without the guards, restricts nothing.
 */
export const RequirePermission = (permission: string) => SetMetadata(PERMISSION_KEY, permission);
