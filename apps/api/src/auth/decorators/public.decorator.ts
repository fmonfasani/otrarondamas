import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca un endpoint como exento del guard de autenticación global
 * (ver auth.module.ts, donde JwtAuthGuard se registra como APP_GUARD).
 * Sin este decorador, todo endpoint del backend exige un JWT válido.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
