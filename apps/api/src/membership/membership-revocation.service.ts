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
