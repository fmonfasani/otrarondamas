import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../auth.types';
import type { PrismaService } from '../../prisma/prisma.service';
import { PermissionsGuard } from './permissions.guard';

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
      usuarioPermisos: [{ permiso: { nombre: 'ventas.crear' } }],
    });

    await expect(guard.canActivate(executionContext(user({ permisos: [] })))).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'usuario-1' },
      select: {
        activo: true,
        usuarioPermisos: { select: { permiso: { select: { nombre: true } } } },
      },
    });
  });

  it('denies a permission revoked in the database even when the JWT still claims it', async () => {
    findUnique.mockResolvedValue({ activo: true, usuarioPermisos: [] });

    await expect(
      guard.canActivate(executionContext(user({ permisos: ['ventas.crear'] }))),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a disabled or missing current Usuario', async () => {
    findUnique.mockResolvedValue({ activo: false, usuarioPermisos: [] });

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
