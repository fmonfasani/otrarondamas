import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Registered as a GLOBAL guard (see auth.module.ts, APP_GUARD) — it is not
 * applied per controller with @UseGuards. Reason (found by testing, not
 * theoretical): a controller with a Scope.REQUEST provider in its
 * constructor (see CompanyScopedPrismaService) makes Nest resolve that
 * provider BEFORE running a guard applied only to that controller/method,
 * leaving request.user unpopulated at that point. As a global guard, Nest
 * does guarantee it runs before instantiating any request-scoped provider
 * in that request's tree.
 *
 * Every endpoint requires a valid JWT by default. To exempt one
 * (e.g. POST /auth/login), use @Public().
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
