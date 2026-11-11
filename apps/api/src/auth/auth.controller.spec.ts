import type { AuthenticatedUser } from './auth.types';
import type { AuthService } from './auth.service';
import type { AuthGoogleService } from './auth.google.service';
import type { MembershipService } from '../membership/membership.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { PasswordResetService } from './password-reset.service';

// Register ESM mocks before loading the controller under test.
await jest.unstable_mockModule('@nestjs/jwt', () => ({ JwtService: class JwtService {} }));
await jest.unstable_mockModule('./auth.service', () => ({ AuthService: class AuthService {} }));
await jest.unstable_mockModule('./auth.google.service', () => ({
  AuthGoogleService: class AuthGoogleService {},
}));
await jest.unstable_mockModule('../membership/membership.service', () => ({
  MembershipService: class MembershipService {},
}));

const { AuthController } = await import('./auth.controller');

describe('AuthController GET /auth/me', () => {
  it('returns current database permissions instead of stale JWT claims', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'usuario-1',
      email: 'owner@example.com',
      nombre: 'Owner',
      empresaId: 'empresa-1',
      Empresa: { nombre: 'Negocio Uno' },
      UsuarioPermiso: [
        { Permiso: { nombre: 'ventas.crear' } },
        { Permiso: { nombre: 'productos.gestionar' } },
      ],
      fotoUrl: null,
      googleId: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
    });
    const prisma = { usuario: { findUnique } } as unknown as PrismaService;
    const controller = new AuthController(
      {} as AuthService,
      {} as AuthGoogleService,
      {} as MembershipService,
      prisma,
      {} as PasswordResetService,
    );
    const auth = {
      id: 'usuario-1',
      email: 'owner@example.com',
      nombre: 'Owner',
      empresaId: 'empresa-1',
      permisos: ['stale.permission'],
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
      type: 'usuario',
    } satisfies AuthenticatedUser;

    const profile = await controller.me(auth);

    expect(profile.permisos).toEqual(['ventas.crear', 'productos.gestionar']);
    expect(profile.permisos).not.toContain('stale.permission');
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'usuario-1' },
      include: {
        Empresa: true,
        UsuarioPermiso: {
          include: { Permiso: { select: { nombre: true } } },
        },
      },
    });
  });

  it('returns an empty permission list when the database has no current assignments', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'usuario-1',
      email: 'owner@example.com',
      nombre: 'Owner',
      empresaId: 'empresa-1',
      Empresa: { nombre: 'Negocio Uno' },
      UsuarioPermiso: [],
      fotoUrl: null,
      googleId: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
    });
    const controller = new AuthController(
      {} as AuthService,
      {} as AuthGoogleService,
      {} as MembershipService,
      { usuario: { findUnique } } as unknown as PrismaService,
      {} as PasswordResetService,
    );

    const profile = await controller.me({
      id: 'usuario-1',
      email: 'owner@example.com',
      nombre: 'Owner',
      empresaId: 'empresa-1',
      permisos: ['stale.permission'],
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
      type: 'usuario',
    });

    expect(profile.permisos).toEqual([]);
  });
});
