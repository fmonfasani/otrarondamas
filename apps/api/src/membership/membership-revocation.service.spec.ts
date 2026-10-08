import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembershipRevocationService } from './membership-revocation.service';

describe('MembershipRevocationService', () => {
  const prisma = {
    membership: { findFirst: jest.fn(), update: jest.fn() },
  };
  const businessContext = { resolveForAuthenticatedUser: jest.fn() };
  let service: MembershipRevocationService;

  const ownerAuth = { id: 'legacy-owner', type: 'usuario' } as any;
  const ownerContext = {
    businessId: 'business-a',
    membershipId: 'membership-owner',
    userId: 'user-owner',
    customerId: null,
    role: 'OWNER',
    permissions: [],
    actorType: 'USER',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MembershipRevocationService(prisma as any, businessContext as any);
    businessContext.resolveForAuthenticatedUser.mockResolvedValue(ownerContext);
  });

  it('suspends an ACTIVE Membership and emits the approved event', async () => {
    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership-target', userId: 'user-target', businessId: 'business-a', status: 'ACTIVE',
    });
    prisma.membership.update.mockResolvedValue({
      id: 'membership-target', userId: 'user-target', businessId: 'business-a', status: 'SUSPENDED',
    });
    const handler = jest.fn();
    service.onStatusChanged(handler);

    await expect(service.suspendMembership(ownerAuth, 'membership-target')).resolves.toEqual({
      membershipId: 'membership-target', businessId: 'business-a', status: 'SUSPENDED',
    });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      membershipId: 'membership-target', userId: 'user-target', businessId: 'business-a',
      previousStatus: 'ACTIVE', newStatus: 'SUSPENDED', occurredAt: expect.any(String),
    }));
  });

  it('reactivates a SUSPENDED Membership', async () => {
    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership-target', userId: 'user-target', businessId: 'business-a', status: 'SUSPENDED',
    });
    prisma.membership.update.mockResolvedValue({
      id: 'membership-target', userId: 'user-target', businessId: 'business-a', status: 'ACTIVE',
    });
    await expect(service.reactivateMembership(ownerAuth, 'membership-target')).resolves.toEqual({
      membershipId: 'membership-target', businessId: 'business-a', status: 'ACTIVE',
    });
  });

  it('denies non-Owner mutation', async () => {
    businessContext.resolveForAuthenticatedUser.mockResolvedValue({ ...ownerContext, role: 'ASISTENTE_LOCAL' });
    await expect(service.suspendMembership(ownerAuth, 'membership-target')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.membership.findFirst).not.toHaveBeenCalled();
  });

  it('denies cross-Business mutation through Business-scoped lookup', async () => {
    prisma.membership.findFirst.mockResolvedValue(null);
    await expect(service.suspendMembership(ownerAuth, 'foreign-membership')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.membership.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'foreign-membership', businessId: 'business-a' },
    }));
  });

  it('rejects Owner self-suspension', async () => {
    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership-owner', userId: 'user-owner', businessId: 'business-a', status: 'ACTIVE',
    });
    await expect(service.suspendMembership(ownerAuth, 'membership-owner')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.membership.update).not.toHaveBeenCalled();
  });

  it('rejects invalid state transitions', async () => {
    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership-target', userId: 'user-target', businessId: 'business-a', status: 'SUSPENDED',
    });
    await expect(service.suspendMembership(ownerAuth, 'membership-target')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.membership.update).not.toHaveBeenCalled();
  });

  it('does not modify Usuario.activo', async () => {
    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership-target', userId: 'user-target', businessId: 'business-a', status: 'ACTIVE',
    });
    prisma.membership.update.mockResolvedValue({
      id: 'membership-target', userId: 'user-target', businessId: 'business-a', status: 'SUSPENDED',
    });
    await service.suspendMembership(ownerAuth, 'membership-target');
    expect(prisma).not.toHaveProperty('usuario');
  });
});
