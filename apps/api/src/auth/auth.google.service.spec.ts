import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { AuthGoogleService } from './auth.google.service';

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
});
