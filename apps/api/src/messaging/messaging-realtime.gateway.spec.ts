jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    use: jest.fn(),
    on: jest.fn(),
    to: jest.fn(() => ({ emit: jest.fn() })),
    sockets: { sockets: new Map() },
    close: jest.fn(),
  })),
}));

import { Server } from 'socket.io';
import { MessagingRealtimeGateway } from './messaging-realtime.gateway';

describe('MessagingRealtimeGateway', () => {
  let server: any;


  const httpAdapterHost = {
    httpAdapter: { getHttpServer: jest.fn(() => ({})) },
  };
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const businessContext = {
    resolveForAuthenticatedUser: jest.fn(),
    resolveForCustomer: jest.fn(),
  };
  const messagingService = {
    authorizeRealtimeConversation: jest.fn(),
  };
  const membershipRevocation = {
    onStatusChanged: jest.fn(() => jest.fn()),
  };
  const eventBus = {
    subscribe: jest.fn(() => jest.fn()),
  };

  let gateway: MessagingRealtimeGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    server = (Server as unknown as { mock: { results: Array<{ value: any }> } }).mock.results[0]?.value;
    gateway = new MessagingRealtimeGateway(
      httpAdapterHost as any,
      jwtService as any,
      businessContext as any,
      messagingService as any,
      membershipRevocation as any,
      eventBus as any,
    );
  });

  it('authenticates Socket.IO handshake and resolves BusinessContext', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-a',
      email: 'owner@example.com',
      nombre: 'Owner',
      empresaId: 'legacy-business',
      permisos: [],
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
      type: 'usuario',
    });
    businessContext.resolveForAuthenticatedUser.mockResolvedValue({
      businessId: 'business-a',
      userId: 'user-a',
      customerId: null,
      membershipId: 'membership-a',
      role: 'OWNER',
      permissions: [],
      actorType: 'USER',
    });

    gateway.onModuleInit();
    const handshakeMiddleware = server.use.mock.calls[0][0];
    const socket: any = {
      handshake: { auth: { token: 'jwt-token' }, headers: {} },
      data: {},
    };
    const next = jest.fn();

    await handshakeMiddleware(socket, next);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('jwt-token');
    expect(businessContext.resolveForAuthenticatedUser).toHaveBeenCalled();
    expect(socket.data.businessId).toBe('business-a');
    expect(next).toHaveBeenCalledWith();
  });

  it('authorizes conversation join before entering the room', async () => {
    gateway.onModuleInit();
    const connectionHandler = server.on.mock.calls.find((call: any[]) => call[0] === 'connection')?.[1];
    const socket: any = {
      data: {
        auth: { id: 'user-a', type: 'usuario' },
        businessId: 'business-a',
        userId: 'user-a',
        customerId: null,
      },
      on: jest.fn(),
      join: jest.fn(),
    };
    connectionHandler(socket);
    const joinHandler = socket.on.mock.calls.find((call: any[]) => call[0] === 'conversation:join')?.[1];
    messagingService.authorizeRealtimeConversation.mockResolvedValue({ businessId: 'business-a' });
    const ack = jest.fn();

    await joinHandler('conversation-a', ack);

    expect(messagingService.authorizeRealtimeConversation).toHaveBeenCalledWith(
      socket.data.auth,
      'conversation-a',
    );
    expect(socket.join).toHaveBeenCalledWith('conversation:conversation-a');
    expect(ack).toHaveBeenCalledWith({ ok: true, conversationId: 'conversation-a' });
  });

  it('disconnects sockets when their Membership becomes suspended', async () => {
    gateway.onModuleInit();
    const socket: any = {
      data: { businessId: 'business-a', userId: 'user-a', customerId: null },
      disconnect: jest.fn(),
    };
    server.sockets.sockets.set('socket-a', socket);

    const handler = membershipRevocation.onStatusChanged.mock.calls[0][0];
    handler({
      membershipId: 'membership-a',
      userId: 'user-a',
      businessId: 'business-a',
      previousStatus: 'ACTIVE',
      newStatus: 'SUSPENDED',
      occurredAt: new Date().toISOString(),
    });

    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });
});
