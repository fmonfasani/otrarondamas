import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BusinessContextService } from './business-context.service';
import type { BusinessContext } from './business-context.types';

type RequestWithBusinessContext = {
  user?: AuthenticatedUser;
  businessContext?: BusinessContext;
};

/**
 * Resolves the tenant context after JWT authentication and attaches it to the
 * request. Parameter decorators must read request data; they cannot resolve
 * Nest providers through Express's request.app.get().
 */
@Injectable()
export class BusinessContextGuard implements CanActivate {
  constructor(
    private readonly businessContextService: BusinessContextService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<RequestWithBusinessContext>();

    if (!request.user) {
      throw new UnauthorizedException('Se requiere una identidad autenticada');
    }

    if (request.user.type === 'usuario') {
      request.businessContext =
        await this.businessContextService.resolveForAuthenticatedUser(request.user);
      return true;
    }

    if (request.user.type === 'cliente') {
      request.businessContext =
        await this.businessContextService.resolveForCustomer(request.user);
      return true;
    }

    throw new ForbiddenException('Tipo de identidad no habilitado para BusinessContext');
  }
}
