jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtServiceMock {},
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { Namespace, Socket } from 'socket.io';
import type { AuthenticatedUser, JwtPayload } from '../auth/auth.types';
import type { BusinessContext } from '../business-context/business-context.types';
import { JwtStrategy } from '../auth/jwt.strategy';
import { BusinessContextService } from '../business-context/business-context.service';
import type { MembershipRevocationService } from '../membership/membership-revocation.service';
import type { MessagingService } from './messaging.service';
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

  const customerAuth: AuthenticatedUser = {
    id: 'customer-a',
    email: 'customer@example.com',
    nombre: 'Customer',
    empresaId: 'legacy-business-a',
    permisos: [],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'cliente',
  };

  const customerContext: BusinessContext = {
    businessId: 'business-a',
    customerId: 'customer-a',
    userId: null,
    membershipId: null,
    role: null,
    permissions: [],
    actorType: 'CUSTOMER',
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
    resolveForCustomer: jest.fn(),
  } as unknown as BusinessContextService;
  const messagingService = {
    getConversation: jest.fn(),
  } as unknown as MessagingService;
  const membershipRevocation = {
    onStatusChanged: jest.fn(),
  } as unknown as MembershipRevocationService;

  let gateway: MessagingGateway;
  let middleware: (socket: Socket, next: (error?: Error) => void) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new MessagingGateway(
      jwtService,
      jwtStrategy,
      businessContextService,
      messagingService,
      membershipRevocation,
    );
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
    } as unknown as Socket;
    const next = jest.fn();

    await middleware(socket, next);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('jwt-token');
    expect(jwtStrategy.validate).toHaveBeenCalledWith(payload);
    expect(businessContextService.resolveForAuthenticatedUser).toHaveBeenCalledWith(auth);
    expect(businessContextService.resolveForCustomer).not.toHaveBeenCalled();
    expect(socket.data.authenticatedUser).toEqual(auth);
    expect(socket.data.businessContext).toEqual(context);
    expect(next).toHaveBeenCalledWith();
  });

  it('resolves the canonical customer BusinessContext for cliente identities (M4-D06)', async () => {
    const customerPayload: JwtPayload = { ...payload, sub: customerAuth.id, type: 'cliente' };
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue(customerPayload);
    (jwtStrategy.validate as jest.Mock).mockResolvedValue(customerAuth);
    (businessContextService.resolveForCustomer as jest.Mock).mockResolvedValue(customerContext);

    const socket = {
      handshake: { auth: { token: 'customer-jwt-token' } },
      data: {},
    } as unknown as Socket;
    const next = jest.fn();

    await middleware(socket, next);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('customer-jwt-token');
    expect(jwtStrategy.validate).toHaveBeenCalledWith(customerPayload);
    expect(businessContextService.resolveForCustomer).toHaveBeenCalledWith(customerAuth);
    expect(businessContextService.resolveForAuthenticatedUser).not.toHaveBeenCalled();
    expect(socket.data.authenticatedUser).toEqual(customerAuth);
    expect(socket.data.businessContext).toEqual(customerContext);
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
    } as unknown as Socket;
    const next = jest.fn();

    await middleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect((next.mock.calls[0][0] as Error).message).toBe('Realtime authentication failed');
    expect(socket.data.authenticatedUser).toBeUndefined();
    expect(socket.data.businessContext).toBeUndefined();
  });

  it('fails closed when customer BusinessContext resolution fails', async () => {
    const customerPayload: JwtPayload = { ...payload, sub: customerAuth.id, type: 'cliente' };
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue(customerPayload);
    (jwtStrategy.validate as jest.Mock).mockResolvedValue(customerAuth);
    (businessContextService.resolveForCustomer as jest.Mock).mockRejectedValue(
      new Error('no such customer'),
    );

    const socket = {
      handshake: { auth: { token: 'customer-jwt-token' } },
      data: {},
    } as unknown as Socket;
    const next = jest.fn();

    await middleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect((next.mock.calls[0][0] as Error).message).toBe('Realtime authentication failed');
    expect(socket.data.authenticatedUser).toBeUndefined();
    expect(socket.data.businessContext).toBeUndefined();
  });
});

describe('MessagingGateway — M4-03 conversation.join authorization', () => {
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

  const customerAuth: AuthenticatedUser = {
    id: 'customer-a',
    email: 'customer@example.com',
    nombre: 'Customer',
    empresaId: 'legacy-business-a',
    permisos: [],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'cliente',
  };

  const messagingService = {
    getConversation: jest.fn(),
  } as unknown as MessagingService;
  const membershipRevocation = {
    onStatusChanged: jest.fn(),
  } as unknown as MembershipRevocationService;

  let gateway: MessagingGateway;

  const joinSocket = (actor: AuthenticatedUser) =>
    ({
      handshake: { auth: { token: 'jwt-token' } },
      data: { authenticatedUser: actor },
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
    }) as unknown as Socket & { join: jest.Mock; disconnect: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new MessagingGateway(
      {} as JwtService,
      {} as JwtStrategy,
      {} as BusinessContextService,
      messagingService,
      membershipRevocation,
    );
  });

  it('OWNER + same Business + existing conversation => join allowed, exactly once with conversation:{id}', async () => {
    (messagingService.getConversation as jest.Mock).mockResolvedValue({ id: 'conversation-a' });
    const socket = joinSocket(auth);

    const result = await gateway.handleJoinConversation(socket, {
      conversationId: 'conversation-a',
    });

    expect(messagingService.getConversation).toHaveBeenCalledWith(auth, 'conversation-a');
    expect(socket.join).toHaveBeenCalledTimes(1);
    expect(socket.join).toHaveBeenCalledWith('conversation:conversation-a');
    expect(result).toEqual({ ok: true, room: 'conversation:conversation-a' });
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('OWNER + same Business + no participation => join allowed (service owns the owner bypass)', async () => {
    (messagingService.getConversation as jest.Mock).mockResolvedValue({ id: 'conversation-b' });
    const socket = joinSocket(auth);

    const result = await gateway.handleJoinConversation(socket, {
      conversationId: 'conversation-b',
    });

    expect(socket.join).toHaveBeenCalledTimes(1);
    expect(socket.join).toHaveBeenCalledWith('conversation:conversation-b');
    expect(result).toEqual({ ok: true, room: 'conversation:conversation-b' });
  });

  it('non-owner + same Business + active participant => join allowed', async () => {
    const seller: AuthenticatedUser = { ...auth, id: 'user-seller', rol: 'ASISTENTE_LOCAL' };
    (messagingService.getConversation as jest.Mock).mockResolvedValue({ id: 'conversation-a' });
    const socket = joinSocket(seller);

    const result = await gateway.handleJoinConversation(socket, {
      conversationId: 'conversation-a',
    });

    expect(messagingService.getConversation).toHaveBeenCalledWith(seller, 'conversation-a');
    expect(socket.join).toHaveBeenCalledWith('conversation:conversation-a');
    expect(result).toEqual({ ok: true, room: 'conversation:conversation-a' });
  });

  it('non-owner + same Business + inactive/nonparticipant => FORBIDDEN ack, no join, stays connected', async () => {
    const seller: AuthenticatedUser = { ...auth, id: 'user-seller', rol: 'ASISTENTE_LOCAL' };
    (messagingService.getConversation as jest.Mock).mockRejectedValue(
      new ForbiddenException('El actor no participa en la conversación'),
    );
    const socket = joinSocket(seller);

    const result = await gateway.handleJoinConversation(socket, {
      conversationId: 'conversation-a',
    });

    expect(result).toEqual({
      ok: false,
      error: 'FORBIDDEN',
      message: 'El actor no participa en la conversación',
    });
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('CUSTOMER + same Business + authorized participation => join allowed', async () => {
    (messagingService.getConversation as jest.Mock).mockResolvedValue({ id: 'conversation-a' });
    const socket = joinSocket(customerAuth);

    const result = await gateway.handleJoinConversation(socket, {
      conversationId: 'conversation-a',
    });

    expect(messagingService.getConversation).toHaveBeenCalledWith(customerAuth, 'conversation-a');
    expect(socket.join).toHaveBeenCalledTimes(1);
    expect(socket.join).toHaveBeenCalledWith('conversation:conversation-a');
    expect(result).toEqual({ ok: true, room: 'conversation:conversation-a' });
  });

  it.each([
    ['cross-Business USER', 'user-a'],
    ['cross-Business CUSTOMER', 'customer-a'],
    ['deleted conversation', 'user-a'],
    ['nonexistent conversation', 'user-a'],
  ])(
    '%s => NOT_FOUND ack without disclosing existence, no join, stays connected',
    async (_case, actorId) => {
      const actor = actorId === 'customer-a' ? customerAuth : auth;
      (messagingService.getConversation as jest.Mock).mockRejectedValue(
        new NotFoundException('Conversación no encontrada'),
      );
      const socket = joinSocket(actor);

      const result = await gateway.handleJoinConversation(socket, {
        conversationId: 'conversation-other',
      });

      expect(result).toEqual({
        ok: false,
        error: 'NOT_FOUND',
        message: 'Conversación no encontrada',
      });
      expect(socket.join).not.toHaveBeenCalled();
      expect(socket.disconnect).not.toHaveBeenCalled();
    },
  );

  it('missing conversationId => BAD_REQUEST ack without touching the service', async () => {
    const socket = joinSocket(auth);

    const result = await gateway.handleJoinConversation(socket, {});

    expect(result).toEqual({
      ok: false,
      error: 'BAD_REQUEST',
      message: 'conversationId requerido',
    });
    expect(messagingService.getConversation).not.toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('unexpected authorization errors are rethrown, never masked and never joined', async () => {
    const failure = new Error('database unavailable');
    (messagingService.getConversation as jest.Mock).mockRejectedValue(failure);
    const socket = joinSocket(auth);

    await expect(
      gateway.handleJoinConversation(socket, { conversationId: 'conversation-a' }),
    ).rejects.toBe(failure);
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.disconnect).not.toHaveBeenCalled();
  });
});

describe('MessagingGateway — M4-04 membership revocation', () => {
  const userAuth: AuthenticatedUser = {
    id: 'legacy-user-a',
    email: 'seller@example.com',
    nombre: 'Seller',
    empresaId: 'business-a',
    permisos: [],
    rol: 'ASISTENTE_LOCAL',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
  };

  const userContext: BusinessContext = {
    businessId: 'business-a',
    customerId: null,
    userId: 'user-a',
    membershipId: 'membership-a',
    role: 'ASISTENTE_LOCAL',
    permissions: [],
    actorType: 'USER',
  };

  // Derived via spread so the literals are not repeated (Sonar
  // duplication): same values, tests compare by deep equality.
  const customerAuth: AuthenticatedUser = {
    ...userAuth,
    id: 'customer-a',
    email: 'customer@example.com',
    nombre: 'Customer',
    type: 'cliente',
  };

  const customerContext: BusinessContext = {
    ...userContext,
    customerId: 'customer-a',
    userId: null,
    membershipId: null,
    role: null,
    actorType: 'CUSTOMER',
  };

  const messagingService = {
    getConversation: jest.fn(),
  } as unknown as MessagingService;
  const unsubscribe = jest.fn();
  const membershipRevocation = {
    onStatusChanged: jest.fn().mockReturnValue(unsubscribe),
  } as unknown as MembershipRevocationService;

  let gateway: MessagingGateway;
  let revocationHandler: (event: {
    membershipId: string;
    userId: string;
    businessId: string;
    previousStatus: 'ACTIVE' | 'SUSPENDED';
    newStatus: 'ACTIVE' | 'SUSPENDED';
    occurredAt: string;
  }) => void;

  const connectedSocket = (
    socketId: string,
    actor: AuthenticatedUser,
    context: BusinessContext,
  ) => {
    const socket = {
      id: socketId,
      handshake: { auth: { token: 'jwt-token' } },
      data: { authenticatedUser: actor, businessContext: context },
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
    } as unknown as Socket & { join: jest.Mock; disconnect: jest.Mock };
    gateway.handleConnection(socket);
    return socket;
  };

  const suspensionEvent = (overrides?: {
    userId?: string;
    businessId?: string;
    previousStatus?: 'ACTIVE' | 'SUSPENDED';
    newStatus?: 'ACTIVE' | 'SUSPENDED';
  }) => ({
    membershipId: 'membership-a',
    userId: overrides?.userId ?? 'user-a',
    businessId: overrides?.businessId ?? 'business-a',
    previousStatus: overrides?.previousStatus ?? ('ACTIVE' as const),
    newStatus: overrides?.newStatus ?? ('SUSPENDED' as const),
    occurredAt: new Date().toISOString(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new MessagingGateway(
      {} as JwtService,
      {} as JwtStrategy,
      {} as BusinessContextService,
      messagingService,
      membershipRevocation,
    );
    const namespace = { use: jest.fn() } as unknown as Namespace;
    gateway.afterInit(namespace);
    revocationHandler = (membershipRevocation.onStatusChanged as jest.Mock).mock.calls[0][0];
  });

  it('registers the revocation subscription on init and releases it on destroy', () => {
    expect(membershipRevocation.onStatusChanged).toHaveBeenCalledTimes(1);
    gateway.onModuleDestroy();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('suspension disconnects every matching socket', () => {
    const first = connectedSocket('socket-1', userAuth, userContext);
    const second = connectedSocket('socket-2', userAuth, userContext);

    revocationHandler(suspensionEvent());

    expect(first.disconnect).toHaveBeenCalledTimes(1);
    expect(first.disconnect).toHaveBeenCalledWith(true);
    expect(second.disconnect).toHaveBeenCalledTimes(1);
    expect(second.disconnect).toHaveBeenCalledWith(true);
  });

  it('does not invalidate a socket that already disconnected', () => {
    const socket = connectedSocket('socket-1', userAuth, userContext);
    gateway.handleDisconnect(socket);

    revocationHandler(suspensionEvent());

    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('a different user is unaffected', () => {
    const other = connectedSocket(
      'socket-other',
      { ...userAuth, id: 'legacy-user-b' },
      { ...userContext, userId: 'user-b', membershipId: 'membership-b' },
    );

    revocationHandler(suspensionEvent());

    expect(other.disconnect).not.toHaveBeenCalled();
  });

  it('a different Business is unaffected', () => {
    const foreign = connectedSocket('socket-foreign', userAuth, {
      ...userContext,
      businessId: 'business-b',
    });

    revocationHandler(suspensionEvent());

    expect(foreign.disconnect).not.toHaveBeenCalled();
  });

  it('customer sockets are unaffected by User Membership events', () => {
    const customer = connectedSocket('socket-customer', customerAuth, customerContext);

    revocationHandler(suspensionEvent());

    expect(customer.disconnect).not.toHaveBeenCalled();
  });

  it('reactivation does not disconnect sockets', () => {
    const socket = connectedSocket('socket-1', userAuth, userContext);

    revocationHandler(suspensionEvent({ previousStatus: 'SUSPENDED', newStatus: 'ACTIVE' }));

    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('a failure while processing the event does not escape the handler', () => {
    const failing = connectedSocket('socket-1', userAuth, userContext);
    (failing.disconnect as jest.Mock).mockImplementation(() => {
      throw new Error('socket already closed');
    });
    const second = connectedSocket('socket-2', userAuth, userContext);

    expect(() => revocationHandler(suspensionEvent())).not.toThrow();
    expect(second.disconnect).toHaveBeenCalledTimes(1);
  });
});
