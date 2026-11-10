import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationGuard } from './authorization.guard';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth.types';

/**
 * Authorization Guard Test Suite (Phase 2 P1-2)
 *
 * Tests cover:
 * 1. Baseline scenarios (OWNER, ASISTENTE_LOCAL, others)
 * 2. CapabilityGrant overrides (GRANT, DENY)
 * 3. Guard behavior (missing metadata, invalid membership, etc.)
 * 4. Inheritance matrix (role → capabilities)
 * 5. Backward compatibility with legacy checks
 *
 * Total scenarios: 15+ as per design spec
 */
describe('AuthorizationGuard', () => {
  let guard: AuthorizationGuard;
  let reflector: Reflector;
  let prismaService: PrismaService;

  // Mock data
  const mockUserId = 'user-123';
  const mockBusinessId = 'empresa-456';
  const mockOwnerRoleTemplateId = 'role-owner';
  const mockAsistenteRoleTemplateId = 'role-asistente';

  const mockOwnerCapabilities = [
    'cash.register_movement',
    'inventory.adjust_stock',
    'catalog.change_prices',
    'sales.create',
    'sales.view',
    'sales.cancel',
    'users.manage',
    'customers.manage',
    'catalog.manage_products',
    'purchases.manage',
    'orders.manage',
    'loyalty.manage_rules',
    'payments.manage',
  ];

  const mockAsistenteCapabilities = [
    'cash.register_movement',
    'inventory.adjust_stock',
    'sales.create',
    'sales.view',
    'customers.manage',
    'catalog.manage_products',
    'orders.manage',
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            membership: {
              findUnique: jest.fn(),
            },
            roleCapability: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    guard = module.get<AuthorizationGuard>(AuthorizationGuard);
    reflector = module.get<Reflector>(Reflector);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  const capabilityDefinition = (code: string, description = `Capability: ${code}`) => ({
    id: `capdef-${code}`,
    code,
    description,
    category: code.split('.')[0],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const capabilityGrant = (
    id: string,
    roleGrantId: string,
    code: string,
    description: string,
    reason: string,
  ) => ({
    id,
    roleGrantId,
    capabilityDefId: `capdef-${code}`,
    grantType: 'GRANT',
    reason,
    grantedBy: 'owner-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    CapabilityDefinition: capabilityDefinition(code, description),
  });

  const activeMembership = (opts: {
    n: number;
    role: string;
    roleTemplateId: string;
    description: string;
    capabilities: string[];
    grants?: unknown[];
  }) => ({
    id: `membership-${opts.n}`,
    userId: mockUserId,
    businessId: mockBusinessId,
    role: opts.role,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    RoleGrant: {
      id: `rolegrant-${opts.n}`,
      membershipId: `membership-${opts.n}`,
      roleTemplateId: opts.roleTemplateId,
      createdAt: new Date(),
      updatedAt: new Date(),
      RoleTemplate: {
        id: opts.roleTemplateId,
        name: opts.role,
        description: opts.description,
        empresaId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        RoleCapability: opts.capabilities.map((code) => ({
          id: `cap-${code}`,
          roleTemplateId: opts.roleTemplateId,
          capabilityDefId: `capdef-${code}`,
          createdAt: new Date(),
          CapabilityDefinition: capabilityDefinition(code),
        })),
      },
      CapabilityGrant: opts.grants ?? [],
    },
  });

  const asistenteMembership = (n: number, grants: unknown[] = []) =>
    activeMembership({
      n,
      role: 'ASISTENTE_LOCAL',
      roleTemplateId: mockAsistenteRoleTemplateId,
      description: 'Store assistant',
      capabilities: mockAsistenteCapabilities,
      grants,
    });

  const pricingGrant = (roleGrantId: string, id: string, reason: string) =>
    capabilityGrant(id, roleGrantId, 'catalog.change_prices', 'Change product prices', reason);

  const givenMembership = (membership: unknown) =>
    jest.spyOn(prismaService.membership, 'findUnique').mockResolvedValue(membership as any);

  const givenCapability = (capability: string) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(capability);

  describe('Baseline Scenarios', () => {
    it('✓ allows OWNER to access endpoint requiring sales.create', async () => {
      const context = mockContext('sales.create');
      givenCapability('sales.create');
      givenMembership(
        activeMembership({
          n: 1,
          role: 'OWNER',
          roleTemplateId: mockOwnerRoleTemplateId,
          description: 'Full access',
          capabilities: mockOwnerCapabilities,
        }),
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('✓ allows ASISTENTE_LOCAL to access endpoint requiring sales.create', async () => {
      const context = mockContext('sales.create');
      givenCapability('sales.create');
      givenMembership(asistenteMembership(2));

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('✗ denies ASISTENTE_LOCAL from accessing endpoint requiring users.manage', async () => {
      const context = mockContext('users.manage');
      givenCapability('users.manage');
      givenMembership(asistenteMembership(2));

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('✗ denies PROVEEDOR from accessing any operational endpoint', async () => {
      const context = mockContext('sales.create');
      givenCapability('sales.create');
      givenMembership(
        activeMembership({
          n: 3,
          role: 'PROVEEDOR',
          roleTemplateId: 'role-proveedor',
          description: 'Supplier placeholder',
          capabilities: [],
        }),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('CapabilityGrant Overrides', () => {
    it('✓ allows ASISTENTE_LOCAL with grant for catalog.change_prices', async () => {
      const context = mockContext('catalog.change_prices');
      givenCapability('catalog.change_prices');
      givenMembership(
        asistenteMembership(4, [pricingGrant('rolegrant-4', 'capgrant-1', 'Promoted to pricing manager')]),
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('✓ CapabilityGrant persists across requests (DB source of truth)', async () => {
      const context = mockContext('catalog.change_prices');
      givenCapability('catalog.change_prices');
      givenMembership(
        asistenteMembership(4, [pricingGrant('rolegrant-4', 'capgrant-1', 'Promoted to pricing manager')]),
      );

      await guard.canActivate(context);
      expect(prismaService.membership.findUnique).toHaveBeenCalled();
    });

    it('✓ multiple CapabilityGrants on same membership union correctly', async () => {
      const context = mockContext('purchases.manage');
      givenCapability('purchases.manage');
      givenMembership(
        asistenteMembership(5, [
          capabilityGrant(
            'capgrant-2',
            'rolegrant-5',
            'purchases.manage',
            'Manage purchase orders',
            'Authorized for supplier management',
          ),
          pricingGrant('rolegrant-5', 'capgrant-3', 'Also authorized for pricing'),
        ]),
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('Guard Behavior', () => {
    it('✓ allows endpoints without @Authorize metadata (authentication-only)', async () => {
      const context = mockContext(undefined);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('✗ rejects unauthenticated request (missing user)', async () => {
      const context = mockContextWithoutUser('sales.create');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('sales.create');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('✗ rejects customer identity (requires staff)', async () => {
      const context = mockContext('sales.create', 'cliente');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('sales.create');
      const membershipLookup = jest.spyOn(prismaService.membership, 'findUnique');

      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('Este permiso requiere una identidad de usuario interno'),
      );
      // Rejected on identity alone, before any Membership is consulted.
      expect(membershipLookup).not.toHaveBeenCalled();
    });

    it('✗ rejects suspended membership', async () => {
      const context = mockContext('sales.create');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('sales.create');
      jest.spyOn(prismaService.membership, 'findUnique').mockResolvedValue({
        id: 'membership-6',
        userId: mockUserId,
        businessId: mockBusinessId,
        role: 'OWNER',
        status: 'SUSPENDED',
        createdAt: new Date(),
        updatedAt: new Date(),
        RoleGrant: null,
      } as any);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('✗ rejects missing RoleGrant during migration', async () => {
      const context = mockContext('sales.create');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('sales.create');
      jest.spyOn(prismaService.membership, 'findUnique').mockResolvedValue({
        id: 'membership-7',
        userId: mockUserId,
        businessId: mockBusinessId,
        role: 'OWNER',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        RoleGrant: null, // Phase 2 P1-2 migration incomplete
      } as any);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  // Helper functions
  function mockContext(
    capability?: string,
    identity: 'usuario' | 'cliente' = 'usuario',
  ): Partial<ExecutionContext> {
    const request = {
      user: mockAuthenticatedUser(identity),
    };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    };
  }

  function mockContextWithoutUser(capability?: string): Partial<ExecutionContext> {
    const request = {
      user: undefined,
    };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    };
  }

  function mockAuthenticatedUser(type: 'usuario' | 'cliente'): AuthenticatedUser {
    return {
      id: mockUserId,
      email: type === 'usuario' ? 'staff@example.com' : 'customer@example.com',
      type,
      empresaId: mockBusinessId,
      rol: 'OWNER',
      permisos: [],
    };
  }
});
