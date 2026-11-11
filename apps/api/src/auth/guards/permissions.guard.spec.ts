import { ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../auth.types';
import type { PrismaService } from '../../prisma/prisma.service';
import { PermissionsGuard } from './permissions.guard';
import {
  CanonicalPermission,
  ORDER_STATUS_CHANGE,
} from '../../authorization/canonical-permission.decorator';

describe('PermissionsGuard current database authorization', () => {
  // These tests describe the default (shadow) mode; the "enforce mode" block sets its own.
  // Pinned so that a CI job running with AUTHZ_ENGINE_MODE=enforce does not change them.
  const ambientAuthzMode = process.env.AUTHZ_ENGINE_MODE;
  beforeEach(() => {
    process.env.AUTHZ_ENGINE_MODE = 'shadow';
  });
  afterEach(() => {
    if (ambientAuthzMode === undefined) delete process.env.AUTHZ_ENGINE_MODE;
    else process.env.AUTHZ_ENGINE_MODE = ambientAuthzMode;
  });

  let getAllAndOverride: jest.Mock;
  let findUnique: jest.Mock;
  let guard: PermissionsGuard;

  const user = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
    id: 'usuario-1',
    email: 'owner@example.com',
    nombre: 'Owner',
    empresaId: 'empresa-legacy',
    permisos: [],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
    ...overrides,
  });

  const executionContext = (authenticatedUser?: AuthenticatedUser) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: authenticatedUser }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    getAllAndOverride = jest.fn().mockReturnValue('ventas.crear');
    findUnique = jest.fn();
    const reflector = { getAllAndOverride } as unknown as Reflector;
    const prisma = { usuario: { findUnique } } as unknown as PrismaService;
    guard = new PermissionsGuard(reflector, prisma);
  });

  it('allows a permission granted in the database even when the JWT claim is stale and empty', async () => {
    findUnique.mockResolvedValue({
      activo: true,
      UsuarioPermiso: [{ Permiso: { nombre: 'ventas.crear' } }],
    });

    await expect(guard.canActivate(executionContext(user({ permisos: [] })))).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'usuario-1' },
      select: {
        activo: true,
        rol: true,
        UsuarioPermiso: { select: { Permiso: { select: { nombre: true } } } },
      },
    });
  });

  // #161 stage 2: the canonical engine runs in shadow mode and must never change the outcome.
  describe('canonical engine in shadow mode', () => {
    let warn: jest.SpyInstance;
    beforeEach(() => {
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => warn.mockRestore());

    const divergences = () =>
      warn.mock.calls
        .map(([message]) => JSON.parse(String(message)) as Record<string, unknown>)
        .filter((entry) => entry.event === 'authz.shadow.divergence');

    it('keeps denying an Owner without the legacy assignment and logs the divergence', async () => {
      findUnique.mockResolvedValue({ activo: true, rol: 'OWNER', UsuarioPermiso: [] });

      await expect(guard.canActivate(executionContext(user()))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(divergences()).toEqual([
        expect.objectContaining({
          source: 'RequirePermission',
          code: 'ventas.crear',
          principalId: 'usuario-1',
          legacyRole: 'OWNER',
          canonicalRole: 'OWNER',
          legacy: 'DENY',
          canonical: 'ALLOW',
        }),
      ]);
    });

    it('keeps allowing a legacy assignment the matrix would deny and logs the divergence', async () => {
      getAllAndOverride.mockReturnValue('precios.cambiar');
      findUnique.mockResolvedValue({
        activo: true,
        rol: 'ASISTENTE_LOCAL',
        UsuarioPermiso: [{ Permiso: { nombre: 'precios.cambiar' } }],
      });

      await expect(guard.canActivate(executionContext(user()))).resolves.toBe(true);
      expect(divergences()).toEqual([
        expect.objectContaining({ legacy: 'ALLOW', canonical: 'DENY', canonicalRole: 'VENDEDOR' }),
      ]);
    });

    it('evaluates the endpoint declaration with the request body (#168: Vendedor cannot cancel)', async () => {
      getAllAndOverride.mockReturnValue('pedidos.gestionar');
      findUnique.mockResolvedValue({
        activo: true,
        rol: 'ASISTENTE_LOCAL',
        UsuarioPermiso: [{ Permiso: { nombre: 'pedidos.gestionar' } }],
      });
      const handler = () => undefined;
      CanonicalPermission(ORDER_STATUS_CHANGE)(handler, 'updateStatus', { value: handler });
      const contextWith = (estado: string) =>
        ({
          getHandler: () => handler,
          getClass: () => class {},
          switchToHttp: () => ({ getRequest: () => ({ user: user(), body: { estado } }) }),
        }) as unknown as ExecutionContext;

      await expect(guard.canActivate(contextWith('CONFIRMADO'))).resolves.toBe(true);
      expect(divergences()).toEqual([]);

      await expect(guard.canActivate(contextWith('CANCELADO'))).resolves.toBe(true);
      expect(divergences()).toEqual([
        expect.objectContaining({
          legacy: 'ALLOW',
          canonical: 'DENY',
          declared: true,
          required: ['ORDER_CANCEL'],
        }),
      ]);
    });

    it('shadows authenticated-only endpoints without querying the database (AUTH-10)', async () => {
      getAllAndOverride.mockReturnValue(undefined);
      const contextFor = (handler: () => unknown, rol: AuthenticatedUser['rol']) =>
        ({
          getType: () => 'http',
          getHandler: () => handler,
          getClass: () => class {},
          switchToHttp: () => ({ getRequest: () => ({ user: user({ rol }), body: {} }) }),
        }) as unknown as ExecutionContext;
      const undeclared = () => undefined;
      const purchases = () => undefined;
      CanonicalPermission('PURCHASES_MANAGE')(purchases, 'list', { value: purchases });

      // Undeclared: still allowed, logged as UNDECLARED.
      await expect(guard.canActivate(contextFor(undeclared, 'OWNER'))).resolves.toBe(true);
      // Vendedor reading purchases: still allowed, the matrix would deny.
      await expect(guard.canActivate(contextFor(purchases, 'ASISTENTE_LOCAL'))).resolves.toBe(true);
      // Owner reading purchases: agreement, nothing logged.
      await expect(guard.canActivate(contextFor(purchases, 'OWNER'))).resolves.toBe(true);

      expect(findUnique).not.toHaveBeenCalled();
      expect(divergences()).toEqual([
        expect.objectContaining({
          source: 'Authenticated',
          canonical: 'DENY',
          reason: 'UNDECLARED',
        }),
        expect.objectContaining({
          source: 'Authenticated',
          legacy: 'ALLOW',
          canonical: 'DENY',
          canonicalRole: 'VENDEDOR',
          required: ['PURCHASES_MANAGE'],
        }),
      ]);
    });

    it('logs nothing when legacy and canonical agree', async () => {
      findUnique.mockResolvedValue({
        activo: true,
        rol: 'ASISTENTE_LOCAL',
        UsuarioPermiso: [{ Permiso: { nombre: 'ventas.crear' } }],
      });

      await expect(guard.canActivate(executionContext(user()))).resolves.toBe(true);
      expect(divergences()).toEqual([]);
    });
  });

  it('denies a permission revoked in the database even when the JWT still claims it', async () => {
    findUnique.mockResolvedValue({ activo: true, UsuarioPermiso: [] });

    await expect(
      guard.canActivate(executionContext(user({ permisos: ['ventas.crear'] }))),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a disabled or missing current Usuario', async () => {
    findUnique.mockResolvedValue({ activo: false, UsuarioPermiso: [] });

    await expect(guard.canActivate(executionContext(user()))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('does not treat a customer identity as a staff permission principal', async () => {
    await expect(
      guard.canActivate(executionContext(user({ type: 'cliente', permisos: ['ventas.crear'] }))),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(findUnique).not.toHaveBeenCalled();
  });

  it('keeps endpoints without permission metadata authenticated-only without querying the permission table', async () => {
    getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(executionContext(user()))).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  // #161 cut-over (OR-B4-026): with AUTHZ_ENGINE_MODE=enforce the role matrix decides.
  describe('enforce mode (AUTHZ_ENGINE_MODE=enforce)', () => {
    const previous = process.env.AUTHZ_ENGINE_MODE;
    beforeEach(() => {
      process.env.AUTHZ_ENGINE_MODE = 'enforce';
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => {
      jest.restoreAllMocks();
      if (previous === undefined) delete process.env.AUTHZ_ENGINE_MODE;
      else process.env.AUTHZ_ENGINE_MODE = previous;
    });

    const declaredContext = (
      requirement: Parameters<typeof CanonicalPermission>[0] | undefined,
      authenticatedUser: AuthenticatedUser | undefined,
      body: unknown = {},
    ) => {
      const handler = () => undefined;
      if (requirement !== undefined) {
        CanonicalPermission(requirement)(handler, 'h', { value: handler });
      }
      return {
        getType: () => 'http',
        getHandler: () => handler,
        getClass: () => class {},
        switchToHttp: () => ({ getRequest: () => ({ user: authenticatedUser, body }) }),
      } as unknown as ExecutionContext;
    };

    it('allows an Owner without the legacy assignment', async () => {
      findUnique.mockResolvedValue({ activo: true, rol: 'OWNER', UsuarioPermiso: [] });
      await expect(guard.canActivate(executionContext(user()))).resolves.toBe(true);
    });

    it('denies a legacy assignment outside the role (Vendedor cannot change prices)', async () => {
      getAllAndOverride.mockReturnValue('precios.cambiar');
      findUnique.mockResolvedValue({
        activo: true,
        rol: 'ASISTENTE_LOCAL',
        UsuarioPermiso: [{ Permiso: { nombre: 'precios.cambiar' } }],
      });
      await expect(guard.canActivate(executionContext(user()))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('denies the Vendedor cancelling an order but allows confirming it (#168)', async () => {
      getAllAndOverride.mockImplementation((key: string) =>
        key === 'permisoRequerido' ? 'pedidos.gestionar' : undefined,
      );
      findUnique.mockResolvedValue({ activo: true, rol: 'ASISTENTE_LOCAL', UsuarioPermiso: [] });
      const vendedor = user({ rol: 'ASISTENTE_LOCAL' });

      await expect(
        guard.canActivate(declaredContext(ORDER_STATUS_CHANGE, vendedor, { estado: 'CONFIRMADO' })),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(declaredContext(ORDER_STATUS_CHANGE, vendedor, { estado: 'CANCELADO' })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    describe('endpoints without a legacy permission', () => {
      beforeEach(() => getAllAndOverride.mockReturnValue(undefined));

      it('decide by role, reading the role from the database (not the JWT)', async () => {
        // JWT claims OWNER, database says ASISTENTE_LOCAL: the database wins.
        findUnique.mockResolvedValue({ activo: true, rol: 'ASISTENTE_LOCAL' });
        await expect(
          guard.canActivate(declaredContext('PURCHASES_VIEW', user({ rol: 'OWNER' }))),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(findUnique).toHaveBeenCalledWith({
          where: { id: 'usuario-1' },
          select: { activo: true, rol: true },
        });

        findUnique.mockResolvedValue({ activo: true, rol: 'ASISTENTE_LOCAL' });
        await expect(guard.canActivate(declaredContext('RETURNS_VIEW', user()))).resolves.toBe(
          true,
        );
      });

      it('reject an undeclared endpoint (AUTH-10) and an inactive account', async () => {
        findUnique.mockResolvedValue({ activo: true, rol: 'OWNER' });
        await expect(guard.canActivate(declaredContext(undefined, user()))).rejects.toBeInstanceOf(
          ForbiddenException,
        );

        findUnique.mockResolvedValue({ activo: false, rol: 'OWNER' });
        await expect(
          guard.canActivate(declaredContext('CATALOG_VIEW', user())),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      });

      it('leave policy markers, public routes and customers to their own guards, without a query', async () => {
        await expect(
          guard.canActivate(declaredContext('AUTHENTICATED', user({ rol: 'PROVEEDOR' }))),
        ).resolves.toBe(true);
        await expect(guard.canActivate(declaredContext('USERS_VIEW', undefined))).resolves.toBe(
          true,
        );
        await expect(
          guard.canActivate(declaredContext('CATALOG_VIEW', user({ type: 'cliente' }))),
        ).resolves.toBe(true);
        expect(findUnique).not.toHaveBeenCalled();
      });

      it('deny PROVEEDOR / REPARTIDOR on staff endpoints (OR-B4-006)', async () => {
        findUnique.mockResolvedValue({ activo: true, rol: 'PROVEEDOR' });
        await expect(
          guard.canActivate(declaredContext('CATALOG_VIEW', user({ rol: 'PROVEEDOR' }))),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });
    });
  });
});
