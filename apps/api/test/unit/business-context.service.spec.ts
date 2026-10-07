import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BusinessContextService } from '../../src/business-context/business-context.service';
import type { AuthenticatedUser } from '../../src/auth/auth.types';

describe('F-01 — canonical BusinessContext actors', () => {
  const membershipService = {
    findUserByLegacyUserId: jest.fn(),
    getMembershipsForUser: jest.fn(),
  };
  const prisma = {
    cliente: { findUnique: jest.fn() },
    empresa: { findUnique: jest.fn() },
    usuario: { findUnique: jest.fn() },
  };

  let service: BusinessContextService;

  const customerAuth = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
    id: 'customer-a',
    email: 'customer@example.test',
    nombre: 'Customer A',
    empresaId: 'business-from-jwt',
    permisos: [],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'cliente',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BusinessContextService(membershipService as never, prisma as never);
  });

  it('resolves CUSTOMER from Customer.empresaId, not JWT.empresaId', async () => {
    prisma.cliente.findUnique.mockResolvedValue({ id: 'customer-a', empresaId: 'business-a' });
    prisma.empresa.findUnique.mockResolvedValue({ id: 'business-a' });

    const context = await service.resolveForCustomer(customerAuth());

    expect(context).toEqual({
      businessId: 'business-a',
      customerId: 'customer-a',
      userId: null,
      membershipId: null,
      role: null,
      permissions: [],
      actorType: 'CUSTOMER',
    });
    expect(prisma.empresa.findUnique).toHaveBeenCalledWith({
      where: { id: 'business-a' },
      select: { id: true },
    });
  });

  it('rejects non-customer identities', async () => {
    await expect(service.resolveForCustomer(customerAuth({ type: 'usuario' }))).rejects.toThrow(ForbiddenException);
    expect(prisma.cliente.findUnique).not.toHaveBeenCalled();
  });

  it('fails closed when the Customer does not exist', async () => {
    prisma.cliente.findUnique.mockResolvedValue(null);

    await expect(service.resolveForCustomer(customerAuth())).rejects.toThrow(NotFoundException);
    expect(prisma.empresa.findUnique).not.toHaveBeenCalled();
  });

  it('fails closed when the Customer business does not exist', async () => {
    prisma.cliente.findUnique.mockResolvedValue({ id: 'customer-a', empresaId: 'missing-business' });
    prisma.empresa.findUnique.mockResolvedValue(null);

    await expect(service.resolveForCustomer(customerAuth())).rejects.toThrow(NotFoundException);
  });

  it('never creates Membership semantics for CUSTOMER', async () => {
    prisma.cliente.findUnique.mockResolvedValue({ id: 'customer-a', empresaId: 'business-a' });
    prisma.empresa.findUnique.mockResolvedValue({ id: 'business-a' });

    const context = await service.resolveForCustomer(customerAuth());

    expect(context.actorType).toBe('CUSTOMER');
    expect(context.membershipId).toBeNull();
    expect(context.userId).toBeNull();
    expect(context.role).toBeNull();
    expect(context.permissions).toEqual([]);
    expect(membershipService.findUserByLegacyUserId).not.toHaveBeenCalled();
  });

  it('keeps ANONYMOUS in the same canonical context contract', async () => {
    prisma.empresa.findUnique.mockResolvedValue({ id: 'business-a' });

    const context = await service.resolveForAnonymous('business-a');

    expect(context).toEqual({
      businessId: 'business-a',
      customerId: null,
      userId: null,
      membershipId: null,
      role: null,
      permissions: [],
      actorType: 'ANONYMOUS',
    });
  });

  it('rejects invalid ANONYMOUS slugs fail-closed', async () => {
    await expect(service.resolveForAnonymous('INVALID_SLUG')).rejects.toThrow(NotFoundException);
    expect(prisma.empresa.findUnique).not.toHaveBeenCalled();
  });

  it('keeps USER resolution contextual to ACTIVE Membership', async () => {
    membershipService.findUserByLegacyUserId.mockResolvedValue({ id: 'user-a' });
    membershipService.getMembershipsForUser.mockResolvedValue([
      { id: 'membership-a', businessId: 'business-a', role: 'OWNER', status: 'ACTIVE' },
    ]);
    prisma.empresa.findUnique.mockResolvedValue({ id: 'business-a' });
    prisma.usuario.findUnique.mockResolvedValue({ usuarioPermisos: [] });

    const context = await service.resolveForAuthenticatedUser({
      id: 'legacy-user-a',
      email: 'user@example.test',
      nombre: 'User A',
      empresaId: 'legacy-business',
      permisos: [],
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
      type: 'usuario',
    });

    expect(context.actorType).toBe('USER');
    expect(context.customerId).toBeNull();
    expect(context.businessId).toBe('business-a');
  });

  it('preserves fail-closed behavior for multiple ACTIVE Memberships', async () => {
    membershipService.findUserByLegacyUserId.mockResolvedValue({ id: 'user-a' });
    membershipService.getMembershipsForUser.mockResolvedValue([
      { id: 'membership-a', businessId: 'business-a', role: 'OWNER', status: 'ACTIVE' },
      { id: 'membership-b', businessId: 'business-b', role: 'OWNER', status: 'ACTIVE' },
    ]);

    await expect(service.resolveForAuthenticatedUser({
      id: 'legacy-user-a',
      email: 'user@example.test',
      nombre: 'User A',
      empresaId: 'legacy-business',
      permisos: [],
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
      type: 'usuario',
    })).rejects.toThrow(ConflictException);
  });
});
