import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { companyScopeExtension } from './company-scope.extension';

/**
 * Factory of Prisma clients with the multi-company isolation filter
 * (INV-01) already applied. Regular provider (singleton, NOT Scope.REQUEST).
 *
 * History: the first version of this service used
 * `@Injectable({ scope: Scope.REQUEST })` + `@Inject(REQUEST)` to read the
 * empresaId straight from `request.user` in the constructor. It was discarded
 * because, tested against the real server, it was confirmed that NestJS
 * resolves a Scope.REQUEST provider (and therefore instantiates the
 * controller that injects it) at a point in the lifecycle that can precede
 * the execution of the guards — even guards registered as a global
 * APP_GUARD. The reproduced symptom: a request WITHOUT a token got to build
 * the service instead of being cut off by JwtAuthGuard. It is not an
 * assumption: it was verified with real server logs before discarding the
 * pattern.
 *
 * The replacement avoids the problem by design: it does not depend on
 * NestJS resolving anything special per request. The caller (a controller,
 * after the guard has already run) passes the empresaId explicitly, read
 * from @CurrentUser().
 *
 * Usage in a controller:
 *   constructor(private readonly prismaFactory: CompanyScopedPrismaService) {}
 *   getProduct(@CurrentUser() user: AuthenticatedUser) {
 *     const db = this.prismaFactory.forCompany(user.empresaId);
 *     return db.producto.findMany(); // already filtered by empresaId
 *   }
 */
@Injectable()
export class CompanyScopedPrismaService {
  constructor(private readonly prisma: PrismaService) {}

  forCompany(companyId: string) {
    return this.prisma.$extends(companyScopeExtension(companyId));
  }
}
