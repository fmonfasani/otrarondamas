import { UnauthorizedException } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthCustomerService } from './auth.customer.service';
// Prevent the Jest unit test from loading the ESM-only JwtService dependency.
jest.mock('@nestjs/jwt', () => ({ JwtService: class JwtService {} }));


describe('AuthCustomerService verified email boundary', () => {
  it('does not look up, link, or create a customer identity for an unverified email', async () => {
    const findUnique = jest.fn();
    const findFirst = jest.fn();
    const prisma = {
      cliente: { findUnique, findFirst },
    } as unknown as PrismaService;
    const service = new AuthCustomerService(prisma, {} as JwtService);

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
    expect(findFirst).not.toHaveBeenCalled();
  });
});
