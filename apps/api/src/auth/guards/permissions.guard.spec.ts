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
});
