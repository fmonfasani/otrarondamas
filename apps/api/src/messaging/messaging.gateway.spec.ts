import { UnauthorizedException } from '@nestjs/common';
import { MessagingGateway } from './messaging.gateway';

describe('MessagingGateway — M4 realtime', () => {
  const jwtService = { verifyAsync: jest.fn() };
  const businessContext = { resolveForAuthenticatedUser: jest.fn() };
  const membershipRevocation = { onStatusChanged: jest.fn() };
  const events = { subscribe: jest.fn() };
  const messagingService = { authorizeRealtimeConversation: jest.fn() };

  let gateway: MessagingGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    events.subscribe.mockReturnValue(() => undefined);
    membershipRevocation.onStatusChanged.mockReturnValue(() => undefined);
    gateway = new MessagingGateway(
      jwtService as any,
      businessContext as any,
      membershipRevocation as any,
      events as any,
      messagingService as any,
    );
  });

  it('rejects a socket without a JWT and disconnects it', async () => {
    const socket = {
      id: 'socket-1',
      handshake: { auth: {}, headers: {} },
      disconnect: jest.fn(),
    } as any;

    await gateway.handleConnection(socket);

    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('authenticates through the existing JWT and canonical BusinessContext', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
      nombre: 'User',
      empresaId: 'legacy-business',
      permisos: [],
      rol: 'OWNER',
      estadoLegajo: 'APROBADO',
      type: 'usuario',
    });
    businessContext.resolveForAuthenticatedUser.mockResolvedValue({
      businessId: 'business-a',
      membershipId: 'membership-1',
      userId: 'user-1',
      customerId: null,
      role: 'OWNER',
      permissions: [],
      actorType: 'USER',
    });

    const socket = {
      id: 'socket-1',
      handshake: { auth: { token: 'jwt' }, headers: {} },
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    await gateway.handleConnection(socket);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('jwt');
    expect(businessContext.resolveForAuthenticatedUser).toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('connection.ready', {
      businessId: 'business-a',
      actorType: 'USER',
    });
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('authorizes a conversation before joining its room', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1', email: 'user@example.com', nombre: 'User',
      empresaId: 'legacy-business', permisos: [], rol: 'OWNER',
      estadoLegajo: 'APROBADO', type: 'usuario',
    });
    businessContext.resolveForAuthenticatedUser.mockResolvedValue({
      businessId: 'business-a', membershipId: 'membership-1', userId: 'user-1',
      customerId: null, role: 'OWNER', permissions: [], actorType: 'USER',
    });
    messagingService.authorizeRealtimeConversation.mockResolvedValue({
      businessId: 'business-a', actorType: 'USER',
    });

    const socket = {
      id: 'socket-1',
      handshake: { auth: { token: 'jwt' }, headers: {} },
      emit: jest.fn(),
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
    } as any;

    await gateway.handleConnection(socket);
    await expect(gateway.joinConversation(socket, { conversationId: 'conversation-1' }))
      .resolves.toEqual({
        event: 'conversation.joined',
        data: { conversationId: 'conversation-1', businessId: 'business-a' },
      });

    expect(messagingService.authorizeRealtimeConversation).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      'conversation-1',
    );
    expect(socket.join).toHaveBeenCalledWith('conversation:conversation-1');
  });

  it('disconnects protected sockets when Membership becomes suspended', async () => {
    let handler: ((event: any) => void) | undefined;
    membershipRevocation.onStatusChanged.mockImplementation((callback: any) => {
      handler = callback;
      return () => undefined;
    });
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1', email: 'user@example.com', nombre: 'User',
      empresaId: 'legacy-business', permisos: [], rol: 'OWNER',
      estadoLegajo: 'APROBADO', type: 'usuario',
    });
    businessContext.resolveForAuthenticatedUser.mockResolvedValue({
      businessId: 'business-a', membershipId: 'membership-1', userId: 'user-1',
      customerId: null, role: 'OWNER', permissions: [], actorType: 'USER',
    });

    const socket = {
      id: 'socket-1',
      handshake: { auth: { token: 'jwt' }, headers: {} },
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    gateway.onModuleInit();
    await gateway.handleConnection(socket);

    handler?.({
      membershipId: 'membership-1',
      businessId: 'business-a',
      newStatus: 'SUSPENDED',
      previousStatus: 'ACTIVE',
      userId: 'user-1',
      occurredAt: '2026-10-08T00:00:00.000Z',
    });

    expect(socket.emit).toHaveBeenCalledWith('membership.revoked', {
      membershipId: 'membership-1',
      businessId: 'business-a',
      occurredAt: '2026-10-08T00:00:00.000Z',
    });
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('does not expose a room without an authenticated socket state', async () => {
    const socket = {
      id: 'unknown',
      handshake: { auth: {}, headers: {} },
      disconnect: jest.fn(),
    } as any;

    await expect(gateway.joinConversation(socket, { conversationId: 'conversation-1' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(messagingService.authorizeRealtimeConversation).not.toHaveBeenCalled();
  });
});
