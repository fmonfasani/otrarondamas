import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessContextGuard } from './business-context.guard';
import { BusinessContextService } from './business-context.service';

describe('BusinessContextGuard', () => {
  const businessContext = {
    businessId: 'empresa-1',
    customerId: null,
    userId: 'user-1',
    membershipId: 'membership-1',
    role: 'OWNER',
    permissions: [],
    actorType: 'USER' as const,
  };

  const createContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  const createReflector = (isPublic = false) =>
    ({
      getAllAndOverride: jest.fn().mockReturnValue(isPublic),
    }) as unknown as Reflector;

  it('skips public routes such as email unsubscribe endpoints', async () => {
    const service = {
      resolveForAuthenticatedUser: jest.fn(),
      resolveForCustomer: jest.fn(),
    } as unknown as BusinessContextService;
    const guard = new BusinessContextGuard(service, createReflector(true));

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(service.resolveForAuthenticatedUser).not.toHaveBeenCalled();
    expect(service.resolveForCustomer).not.toHaveBeenCalled();
  });

  it('fails closed when JWT authentication did not populate request.user', async () => {
    const service = {
      resolveForAuthenticatedUser: jest.fn(),
      resolveForCustomer: jest.fn(),
    } as unknown as BusinessContextService;
    const guard = new BusinessContextGuard(service, createReflector());

    await expect(guard.canActivate(createContext({}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(service.resolveForAuthenticatedUser).not.toHaveBeenCalled();
    expect(service.resolveForCustomer).not.toHaveBeenCalled();
  });

  it('resolves and attaches the authenticated user business context', async () => {
    const user = { id: 'user-1', type: 'usuario' };
    const service = {
      resolveForAuthenticatedUser: jest.fn().mockResolvedValue(businessContext),
      resolveForCustomer: jest.fn(),
    } as unknown as BusinessContextService;
    const guard = new BusinessContextGuard(service, createReflector());
    const request: Record<string, unknown> = { user };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(service.resolveForAuthenticatedUser).toHaveBeenCalledWith(user);
    expect(request.businessContext).toEqual(businessContext);
  });

  it('resolves customer identities through the customer-specific context path', async () => {
    const user = { id: 'customer-1', type: 'cliente' };
    const customerContext = { ...businessContext, actorType: 'CUSTOMER' as const };
    const service = {
      resolveForAuthenticatedUser: jest.fn(),
      resolveForCustomer: jest.fn().mockResolvedValue(customerContext),
    } as unknown as BusinessContextService;
    const guard = new BusinessContextGuard(service, createReflector());
    const request: Record<string, unknown> = { user };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(service.resolveForCustomer).toHaveBeenCalledWith(user);
    expect(request.businessContext).toEqual(customerContext);
  });
});
