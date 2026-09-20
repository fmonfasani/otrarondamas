import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Registrado como guard GLOBAL (ver auth.module.ts, APP_GUARD) — no se
 * aplica por-controller con @UseGuards. Motivo (encontrado probando, no
 * teórico): un controller con un provider Scope.REQUEST en su
 * constructor (ver EmpresaScopedPrismaService) hace que Nest resuelva
 * ese provider ANTES de ejecutar un guard aplicado solo a ese
 * controller/método, dejando request.user sin poblar en ese punto. Como
 * guard global, Nest sí garantiza que corre antes de instanciar
 * cualquier provider request-scoped del árbol de esa request.
 *
 * Todo endpoint requiere JWT válido por defecto. Para exceptuar uno
 * (ej. POST /auth/login), usar @Public().
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
