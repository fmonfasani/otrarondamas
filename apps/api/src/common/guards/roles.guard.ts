import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Roles Guard
 * Checks if user has required role(s)
 * Role values: OWNER, SELLER, ADMIN, CUSTOMER
 *
 * Usage:
 * @UseGuards(RolesGuard)
 * @Roles('OWNER', 'ADMIN')
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException(
        'User not found in request',
      );
    }

    if (!user.role) {
      throw new ForbiddenException('User has no role assigned');
    }

    const hasRole = requiredRoles.some(
      (role) => user.role === role,
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `User role '${user.role}' does not have access. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
