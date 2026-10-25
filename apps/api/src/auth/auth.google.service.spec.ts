import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { AuthGoogleService } from './auth.google.service';

// Prevent the Jest unit test from loading the ESM-only JwtService dependency.
jest.mock('@nestjs/jwt', () => ({ JwtService: class JwtService {} }));

describe('AuthGoogleService verified email boundary', () => {
  it('does not look up, link, or create a staff identity for an unverified email', async () => {
    const findUnique = jest.fn();
    const prisma = {
      usuario: { findUnique },
    } as unknown as PrismaService;
    const authService = {
      issueSession: jest.fn(),
    } as unknown as AuthService;
    const service = new AuthGoogleService(prisma, authService);

    await expect(
      service.loginWithGoogle({
        googleId: 'google-user-1',
        email: 'federico@example.com',
        emailVerified: false,
        nombre: 'Federico',
        fotoUrl: null,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(findUnique).not.toHaveBeenCalled();
  });

  it('does not self-register a staff identity when no invited/existing account matches Google', async () => {
    const findUnique = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const prisma = {
      usuario: { findUnique, create: jest.fn() },
    } as unknown as PrismaService;
    const issueSession = jest.fn();
    const authService = { issueSession } as unknown as AuthService;
    const service = new AuthGoogleService(prisma, authService);

    await expect(
      service.loginWithGoogle({
        googleId: 'google-uninvited-user',
        email: 'uninvited@example.com',
        emailVerified: true,
        nombre: 'Uninvited User',
        fotoUrl: null,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(prisma.usuario.create).not.toHaveBeenCalled();
    expect(issueSession).not.toHaveBeenCalled();
  });
});
