import {
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Subject } from 'rxjs';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BusinessContextService } from '../business-context/business-context.service';
import { PrismaService } from '../prisma/prisma.service';

export type MembershipStatusChangedEvent = {
  membershipId: string;
  userId: string;
  businessId: string;
  previousStatus: 'ACTIVE' | 'SUSPENDED';
  newStatus: 'ACTIVE' | 'SUSPENDED';
  occurredAt: string;
};

@Injectable()
export class MembershipService {
  private readonly statusChangedSubject = new Subject<MembershipStatusChangedEvent>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => BusinessContextService))
    private readonly businessContext: BusinessContextService,
  ) {}

  findUserByLegacyUserId(userId: string) {
    return this.prisma.user.findUnique({ where: { usuarioId: userId } });
  }

  async getMembershipsForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { business: { select: { id: true, nombre: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.id,
      role: m.role,
      status: m.status,
      businessId: m.businessId,
      businessNombre: m.business.nombre,
      createdAt: m.createdAt.toISOString(),
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

    if (context.role !== 'OWNER') {
      throw new ForbiddenException('Solo el Owner puede gestionar Memberships');
    }

    const target = await this.prisma.membership.findFirst({
      where: { id: membershipId, businessId: context.businessId },
      select: { id: true, userId: true, businessId: true, status: true },
    });

    if (!target) {
      throw new NotFoundException('Membership no encontrada');
    }

    if (target.id === context.membershipId) {
      throw new ConflictException('El Owner no puede suspender su propia Membership');
    }

    if (target.status !== expectedStatus) {
      throw new ConflictException(
        `Transición de Membership inválida: ${target.status} → ${newStatus}`,
      );
    }

    const updated = await this.prisma.membership.update({
      where: { id: target.id },
      data: { status: newStatus },
      select: { id: true, userId: true, businessId: true, status: true },
    });

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
