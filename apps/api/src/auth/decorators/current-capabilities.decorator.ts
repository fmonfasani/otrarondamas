import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';

/**
 * Returns capabilities resolved by AuthorizationGuard for the current request.
 * This decorator fails closed when used without the authorization guard.
 */
export const CurrentCapabilities = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string[] => {
    const request = ctx.switchToHttp().getRequest<{ capabilities?: string[] }>();

    if (!Array.isArray(request.capabilities)) {
      throw new InternalServerErrorException(
        'AuthorizationGuard debe ejecutarse antes de @CurrentCapabilities',
      );
    }

    return request.capabilities;
  },
);
