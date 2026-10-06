import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks an endpoint as exempt from the global authentication guard
 * (see auth.module.ts, where JwtAuthGuard is registered as APP_GUARD).
 * Without this decorator, every backend endpoint requires a valid JWT.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
