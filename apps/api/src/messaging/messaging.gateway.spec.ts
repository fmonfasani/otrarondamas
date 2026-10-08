import type { JwtService } from '@nestjs/jwt';
import type { Namespace, Socket } from 'socket.io';
import type { AuthenticatedUser, JwtPayload } from '../auth/auth.types';
import type { BusinessContext } from '../business-context/business-context.types';
import { JwtStrategy } from '../auth/jwt.strategy';
import { BusinessContextService } from '../business-context/business-context.service';
import { MessagingGateway } from './messaging.gateway';

describe('MessagingGateway — M4-02 handshake authentication', () => {
  const auth: AuthenticatedUser = {
    id: 'user-a',
    email: 'owner@example.com',
    nombre: 'Owner',
    empresaId: 'legacy-business-a',
    permisos: [],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
  };

  const context: BusinessContext = {
    businessId: 'business-a',
    customerId: null,
    userId: 'canonical-user-a',
    membershipId: 'membership-a',
    role: 'OWNER',
    permissions: [],
    actorType: 'USER',
  };

  const payload: JwtPayload = {
    sub: auth.id,
    email: auth.email,
    nombre: auth.nombre,
    empresaId: auth.empresaId,
    permisos: auth.permisos,
    rol: auth.rol,
    estadoLegajo: auth.estadoLegajo,
    type: auth.type,
  };

  const jwtService = {
    verifyAsync: jest.fn(),
  } as unknown as JwtService;
  const jwtStrategy = {
    validate: jest.fn(),
  } as unknown as JwtStrategy;
  const businessContextService = {
    resolveForAuthenticatedUser: jest.fn(),
  } as unknown as BusinessContextService;

  let gateway: MessagingGateway;
  let middleware: (socket: Socket, next: (error?: Error) => void) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new MessagingGateway(jwtService, jwtStrategy, businessContextService);
    const namespace = { use: jest.fn() } as unknown as Namespace;
    gateway.afterInit(namespace);
    middleware = (namespace.use as jest.Mock).mock.calls[0][0];
  });

  it('authenticates the existing JWT and resolves canonical BusinessContext', async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);
    (jwtStrategy.validate as jest.Mock).mockResolvedValue(auth);
    (businessContextService.resolveForAuthenticatedUser as jest.Mock).mockResolvedValue(context);

    const socket = {
      handshake: { auth: { token: 'jwt-token' } },
      data: {},
    } as Socket;
    const next = jest.fn();

    await middleware(socket, next);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('jwt-token');
    expect(jwtStrategy.validate).toHaveBeenCalledWith(payload);
    expect(businessContextService.resolveForAuthenticatedUser).toHaveBeenCalledWith(auth);
    expect(socket.data.authenticatedUser).toEqual(auth);
    expect(socket.data.businessContext).toEqual(context);
    expect(next).toHaveBeenCalledWith();
  });

  it('fails closed when the handshake has no token', async () => {
    const socket = { handshake: { auth: {} }, data: {} } as Socket;
    const next = jest.fn();

    await middleware(socket, next);

    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('fails closed when JWT verification or BusinessContext resolution fails', async () => {
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('invalid token'));

    const socket = {
      handshake: { auth: { token: 'invalid-token' } },
      data: {},
    } as Socket;
    const next = jest.fn();

    await middleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect((next.mock.calls[0][0] as Error).message).toBe('Realtime authentication failed');
    expect(socket.data.authenticatedUser).toBeUndefined();
    expect(socket.data.businessContext).toBeUndefined();
  });
});
