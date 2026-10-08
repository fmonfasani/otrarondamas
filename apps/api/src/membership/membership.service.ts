import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// S-V1-01 — Memberships read (read-only).
//
// This service NEVER creates, updates or deletes Users/Memberships (that is
// done by the migration and the backfill, outside the runtime). It only
// resolves which memberships correspond to an authenticated identity.
//
// Isolation rule: the caller passes the SESSION id (Usuario.id from the
// JWT), never an arbitrary userId. The Usuario → User link is the explicit
// `usuarioId` from the backfill; without a link there are no memberships.
// This makes it impossible for User A to see User B's memberships through
// input.
@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  // Resolves the canonical User from the session's legacy Usuario.
  // null = identity not yet backfilled (pre-migration or new account without
  // running the script): the caller returns an empty list, never invents.
  async findUserByLegacyUserId(userId: string) {
    return this.prisma.user.findUnique({ where: { usuarioId: userId } });
  }

  // Own memberships of the given User, with the Business resolved.
  // It does not accept businessId: it neither filters nor skips tenancy, it
  // returns EVERYTHING that is its own (isolation lives in the userId coming
  // from the session).
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
}
