import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthCustomerService } from './auth.customer.service';

// Prevent the Jest unit test from loading the ESM-only JwtService dependency.
jest.mock('@nestjs/jwt', () => ({ JwtService: class JwtService {} }));

describe('AuthCustomerService.loginWithGoogleInBusiness (ADR-IDN-007)', () => {
  const profile = {
    googleId: 'g-1',
    email: 'Ana@Example.com',
    emailVerified: true,
    nombre: 'Ana',
    fotoUrl: null,
  };
  const setup = (existing: object | null, holder: object | null = null) => {
    const cliente = {
      findUnique: jest.fn().mockResolvedValue(holder),
      findFirst: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...existing, ...data })),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'new', ...data })),
    };
    const service = new AuthCustomerService(
      { cliente } as unknown as PrismaService,
      {} as JwtService,
    );
    const issue = jest
      .spyOn(service, 'issueCustomerSession')
      .mockReturnValue({ accessToken: 't' } as never);
    return { cliente, service, issue };
  };

  it('refuses an email Google did not verify', async () => {
    const { service, cliente } = setup(null);
    await expect(
      service.loginWithGoogleInBusiness('biz', { ...profile, emailVerified: false }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(cliente.findFirst).not.toHaveBeenCalled();
  });

  it('reuses the store account with that email, ignoring case, and links Google when free', async () => {
    const { service, cliente, issue } = setup({ id: 'c1', activo: true, googleId: null });
    await service.loginWithGoogleInBusiness('biz', profile);
    expect(cliente.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { empresaId: 'biz', email: { equals: 'ana@example.com', mode: 'insensitive' } },
      }),
    );
    expect(cliente.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' }, data: { googleId: 'g-1' } }),
    );
    expect(issue).toHaveBeenCalled();
  });

  it('does not move the Google id away from another store account', async () => {
    const { service, cliente } = setup(
      { id: 'c1', activo: true, googleId: null },
      { id: 'other-store' },
    );
    await service.loginWithGoogleInBusiness('biz', profile);
    expect(cliente.update).not.toHaveBeenCalled();
  });

  it('creates the account in this store when there is none', async () => {
    const { service, cliente } = setup(null, { id: 'other-store' });
    await service.loginWithGoogleInBusiness('biz', profile);
    expect(cliente.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          empresaId: 'biz',
          email: 'ana@example.com',
          googleId: null,
        }),
      }),
    );
  });

  it('refuses a disabled account', async () => {
    const { service } = setup({ id: 'c1', activo: false, googleId: null });
    await expect(service.loginWithGoogleInBusiness('biz', profile)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('AuthCustomerService register method', () => {
  it('throws BadRequestException when email already exists', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'existing-customer',
      email: 'test@example.com',
    });
    const prisma = {
      cliente: { findFirst },
    } as unknown as PrismaService;
    const service = new AuthCustomerService(prisma, {} as JwtService);

    await expect(
      service.register('company-123', {
        email: 'test@example.com',
        nombre: 'Test',
        password: 'Password123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(findFirst).toHaveBeenCalledWith({
      where: { empresaId: 'company-123', email: 'test@example.com' },
    });
  });
});
