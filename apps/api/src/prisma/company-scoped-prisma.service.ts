import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from './tenant-prisma.service';
import { forCompanyWithRls } from './business-context';

/**
 * Factory of Prisma clients with the tenant isolation filter (INV-01)
 * already applied to models keyed by empresaId or businessId. Regular provider (singleton, NOT Scope.REQUEST).
 * The clients connect as `wapsell_app` (ADR-DAT-019), the database role limited to one
 * business by row-level security (INIT-019 PR 5), never as the system role.
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
 * from the authenticated business context (or the verified legacy company
 * context during the migration).
 *
 * Usage in a controller:
 *   constructor(private readonly prismaFactory: CompanyScopedPrismaService) {}
 *   getProduct(@ExtractBusinessContext() businessId: string) {
 *     const db = this.prismaFactory.forCompany(businessId);
 *     return db.producto.findMany(); // empresaId and businessId filters applied
 *   }
 */
@Injectable()
export class CompanyScopedPrismaService {
  constructor(private readonly prisma: TenantPrismaService) {}

  /**
   * INIT-019 PR 5: besides the business filter, every operation fixes `app.business_id` for
   * row-level security, and interactive transactions fix it once when they begin (business-context.ts).
   */
  forCompany(companyId: string) {
    return forCompanyWithRls(this.prisma, companyId);
  }
}
