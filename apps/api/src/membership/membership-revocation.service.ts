import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Subject } from 'rxjs';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BusinessContextService } from '../business-context/business-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { hasCanonicalPermission } from '../authorization/canonical-permissions';

export type MembershipStatusChangedEvent = {
  membershipId: string;
  userId: string;
  businessId: string;
  previousStatus: 'ACTIVE' | 'SUSPENDED';
  newStatus: 'ACTIVE' | 'SUSPENDED';
  occurredAt: string;
};

@Injectable()
export class MembershipRevocationService {
  private readonly statusChangedSubject = new Subject<MembershipStatusChangedEvent>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly businessContext: BusinessContextService,
  ) {}

  /**
   * The Business's team for the panel's Equipo screen: every Membership with the person's
   * name, email, role, status and dossier state (RF-17). USERS_VIEW, checked against the
   * role matrix here too so it holds in every authorization mode. Never credentials.
   */
  async listTeam(auth: AuthenticatedUser) {
    const context = await this.businessContext.resolveForAuthenticatedUser(auth);
    if (!hasCanonicalPermission(context.role, 'USERS_VIEW')) {
      throw new ForbiddenException('Requiere el permiso USERS_VIEW para ver el equipo');
    }
    const memberships = await this.prisma.membership.findMany({
      where: { businessId: context.businessId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        status: true,
        createdAt: true,
        User: { select: { id: true, nombre: true, email: true, usuarioId: true } },
      },
    });
    const legacyIds = memberships
      .map((m) => m.User.usuarioId)
      .filter((id): id is string => Boolean(id));
    const legacy = await this.prisma.usuario.findMany({
      where: { id: { in: legacyIds }, empresaId: context.businessId },
      select: { id: true, estadoLegajo: true },
    });
    const dossierOf = new Map(legacy.map((u) => [u.id, u.estadoLegajo]));
    return memberships.map((m) => ({
      membershipId: m.id,
      userId: m.User.id,
      usuarioId: m.User.usuarioId,
      nombre: m.User.nombre,
      email: m.User.email,
      role: m.role,
      status: m.status,
      estadoLegajo: m.User.usuarioId ? (dossierOf.get(m.User.usuarioId) ?? null) : null,
      since: m.createdAt,
      isViewer: m.id === context.membershipId,
    }));
  }

  onStatusChanged(handler: (event: MembershipStatusChangedEvent) => void): () => void {
    const subscription = this.statusChangedSubject.subscribe(handler);
    return () => subscription.unsubscribe();
  }

  async suspendMembership(auth: AuthenticatedUser, membershipId: string) {
    return this.changeStatus(auth, membershipId, 'ACTIVE', 'SUSPENDED');
  }

  async reactivateMembership(auth: AuthenticatedUser, membershipId: string) {
    return this.changeStatus(auth, membershipId, 'SUSPENDED', 'ACTIVE');
  }

  private async changeStatus(
    auth: AuthenticatedUser,
    membershipId: string,
    expectedStatus: 'ACTIVE' | 'SUSPENDED',
    newStatus: 'ACTIVE' | 'SUSPENDED',
  ) {
    const context = await this.businessContext.resolveForAuthenticatedUser(auth);

    // OR-B4-027: USERS_MANAGE (Owner and Admin); only the Owner acts on an Owner Membership.
    if (!hasCanonicalPermission(context.role, 'USERS_MANAGE')) {
      throw new ForbiddenException('Requiere el permiso USERS_MANAGE para gestionar Memberships');
    }

    const target = await this.prisma.membership.findFirst({
      where: { id: membershipId, businessId: context.businessId },
      select: { id: true, userId: true, businessId: true, status: true, role: true },
    });

    if (!target) {
      throw new NotFoundException('Membership no encontrada');
    }

    if (target.id === context.membershipId) {
      throw new ConflictException('No podés cambiar el estado de tu propia Membership');
    }

    if (target.role === 'OWNER' && context.role !== 'OWNER') {
      throw new ForbiddenException('Solo el Owner puede gestionar la Membership de un Owner');
    }

    if (target.status !== expectedStatus) {
      throw new ConflictException(
        `Transición de Membership inválida: ${target.status} → ${newStatus}`,
      );
    }

    // Compare-and-set: only the request that still observes the expected
    // state may transition this Membership. A concurrent request that loses
    // the race gets a conflict instead of emitting a duplicate/stale event.
    const result = await this.prisma.membership.updateMany({
      where: {
        id: target.id,
        businessId: context.businessId,
        status: expectedStatus,
      },
      data: { status: newStatus },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'La Membership cambió durante la operación; recargá el estado e intentá nuevamente',
      );
    }

    const updated = { ...target, status: newStatus };

    const event: MembershipStatusChangedEvent = {
      membershipId: updated.id,
      userId: updated.userId,
      businessId: updated.businessId,
      previousStatus: expectedStatus,
      newStatus: updated.status,
      occurredAt: new Date().toISOString(),
    };

    this.statusChangedSubject.next(event);

    return {
      membershipId: updated.id,
      businessId: updated.businessId,
      status: updated.status,
    };
  }
}
