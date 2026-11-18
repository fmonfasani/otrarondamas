import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import type { JwtPayload } from './auth.types';
import type { MfaPolicyService } from './mfa/mfa-policy.service';

describe('JwtStrategy — only sessions are sessions', () => {
  process.env.JWT_SECRET = 'jwt-strategy-spec';
  const policy = { requiresMfa: jest.fn().mockResolvedValue(false) } as unknown as MfaPolicyService;
  const strategy = new JwtStrategy(policy);
  const session = {
    sub: 'u1',
    email: 'a@test',
    nombre: 'A',
    empresaId: 'e1',
    permisos: [],
    rol: 'VENDEDOR',
    type: 'usuario',
  } as unknown as JwtPayload;

  it('accepts a staff session', async () => {
    await expect(strategy.validate(session)).resolves.toMatchObject({ id: 'u1', type: 'usuario' });
  });

  it.each(['comprador', 'mfa-ticket', 'mfa-device', 'signup-google', 'store-google'])(
    'refuses a %s token signed with the same secret',
    async (typ) => {
      await expect(
        strategy.validate({ ...session, typ } as unknown as JwtPayload),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it('refuses a token without a subject', async () => {
    await expect(strategy.validate({ ...session, sub: '' } as JwtPayload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
