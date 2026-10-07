import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MembershipService } from '../membership/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import type { BusinessContext } from './business-context.types';

// S-V1-02 — Business context resolution + adapter to legacy.
//
// Flow: AuthenticatedUser (request.user, JWT intact)
//   → canonical User via the explicit link from the backfill
//   → its ACTIVE Membership (single one in V1)
//   → BusinessContext
//   → verified businessId → empresaId adapter
//   → legacy infrastructure (forCompany).
//
// This service does NOT create a parallel isolation path: enforcement
// remains companyScopeExtension; here the context is only resolved and
// verified. Without a valid Membership → explicit fail-closed, never a
// partial context nor a silent default.
@Injectable()
export class BusinessContextService {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly prisma: PrismaService,
  ) {}

  // Resolves the context of the authenticated actor. Fails closed if:
  // - it is not a usuario identity (customers have no Membership in V1);
  // - there is no linked User (account without backfill);
  // - there is no ACTIVE Membership (including only-SUSPENDED);
  // - there is more than one ACTIVE (no Business selector: arbitrary choice
  //   forbidden; the selector belongs to a future slice).
  async resolveForAuthenticatedUser(auth: AuthenticatedUser): Promise<BusinessContext> {
    if (auth.type !== 'usuario') {
      throw new ForbiddenException('BusinessContext V1 requiere identidad de usuario');
    }
    const user = await this.membershipService.findUserByLegacyUserId(auth.id);
    if (!user) {
      throw new NotFoundException('Identidad sin User vinculado: backfill pendiente');
    }
    const memberships = await this.membershipService.getMembershipsForUser(user.id);
    const active = memberships.filter((m) => m.status === 'ACTIVE');
    if (active.length === 0) {
      throw new ForbiddenException('Sin Membership activa: contexto denegado');
    }
    if (active.length > 1) {
      throw new ConflictException(
        'Múltiples Memberships activas: se requiere selección explícita de Business (fuera de V1)',
      );
    }
    const membership = active[0];
    // Adapter as an assertion: verifies the Business→Empresa equivalence
    // before handing over the context (fails if the Business no longer
    // exists).
    await this.resolveCompanyId(membership.businessId);
    const permissions = await this.legacyPermissions(auth.id);
    return {
      businessId: membership.businessId,
      userId: user.id,
      membershipId: membership.id,
      role: membership.role,
      permissions,
      actorType: 'USER',
    };
  }

  // Resolves the public Business context from the stable Business slug.
  // Anonymous actors have no User/Membership and therefore receive only the
  // Business boundary plus an empty permission set. Invalid/nonexistent slugs
  // fail closed with the same 404 response.
  async resolveForAnonymous(slug: string): Promise<BusinessContext> {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new NotFoundException('Business no encontrado');
    }
    const business = await this.prisma.empresa.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!business) {
      throw new NotFoundException('Business no encontrado');
    }
    return {
      businessId: business.id,
      userId: null,
      membershipId: null,
      role: null,
      permissions: [],
      actorType: 'ANONYMOUS',
    };
  }

  // Business → Empresa adapter (V1: verified equivalence, not assumed).
  // Verifies that the businessId exists as an Empresa and returns its id
  // for the legacy infrastructure. A non-existent or arbitrary id → throw:
  // the adapter never invents an empresaId.
  async resolveCompanyId(businessId: string): Promise<string> {
    const company = await this.prisma.empresa.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!company) {
      throw new NotFoundException('Business inexistente: no se deriva empresaId');
    }
    return company.id;
  }

  // Legacy permissions of the session's Usuario (same source as login).
  // If the Usuario no longer exists: least privilege (empty list), never
  // invent permissions.
  private async legacyPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: { usuarioPermisos: { include: { permiso: true } } },
    });
    if (!user) return [];
    return user.usuarioPermisos.map((up) => up.permiso.nombre);
  }
}
