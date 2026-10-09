jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtServiceMock {},
}));

import type { INestApplication } from '@nestjs/common';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import type { Namespace } from 'socket.io';
import type { AuthenticatedUser, JwtPayload } from '../auth/auth.types';
import type { BusinessContext } from '../business-context/business-context.types';
import type { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { BusinessContextService } from '../business-context/business-context.service';
import { MessagingService } from './messaging.service';
import { MembershipRevocationService } from '../membership/membership-revocation.service';
import { MessagingGateway } from './messaging.gateway';

// M4-03 — REAL Socket.IO transport validation of the ACK contract.
//
// Unlike messaging.gateway.spec.ts (which calls handleJoinConversation()
// directly), this spec exercises the actual transport path:
//
//   socket.io-client -> HTTP upgrade -> /messaging namespace
//   -> handshake middleware (real MessagingGateway.afterInit)
//   -> conversation.join event -> handler -> Socket.IO acknowledgement
//
// The NestJS/Socket.IO transport is real. JWT, BusinessContext and
// MessagingService are isolated test doubles (no database, no ESM runtime
// for @nestjs/jwt): what is proven here is the TRANSPORT behavior —
// handshake accept/reject, event delivery, ACK payloads, server-side room
// membership and connection state. Domain authorization semantics remain
// owned by MessagingService and its own specs.
//
// Server-side room membership is observed through the real /messaging
// Namespace object. Nest shares one Namespace per (port, path, namespace):
// SocketServerProvider reuses the underlying Socket.IO server and the
// platform IoAdapter resolves both gateways through the same
// `server.of('/messaging')` reference (verified in the installed
// @nestjs/websockets + @nestjs/platform-socket.io sources). This probe
// gateway only stores the reference — it registers no middleware and no
// handlers, so the handshake and join behavior under test is untouched.

@WebSocketGateway({ namespace: '/messaging' })
class NamespaceProbeGateway implements OnGatewayInit {
  public namespace?: Namespace;

  afterInit(namespace: Namespace): void {
    this.namespace = namespace;
  }
}

describe('MessagingGateway — M4-03 transport ACK contract (real Socket.IO)', () => {
  const ACK_TIMEOUT_MS = 4000;

  const userAuth: AuthenticatedUser = {
    id: 'user-a',
    email: 'owner@example.com',
    nombre: 'Owner',
    empresaId: 'legacy-business-a',
    permisos: [],
    rol: 'OWNER',
    estadoLegajo: 'APROBADO',
    type: 'usuario',
  };

  const userContext: BusinessContext = {
    businessId: 'business-a',
    customerId: null,
    userId: 'canonical-user-a',
    membershipId: 'membership-a',
    role: 'OWNER',
    permissions: [],
    actorType: 'USER',
  };

  // customerAuth/customerContext derive from the user fixtures above via
  // spread: same values, without repeating the 1:1 literals (Sonar
  // duplication). Behavior is unchanged — tests compare by deep equality.
  const customerAuth: AuthenticatedUser = {
    ...userAuth,
    id: 'customer-a',
    email: 'customer@example.com',
    nombre: 'Customer',
    type: 'cliente',
  };

  const customerContext: BusinessContext = {
    ...userContext,
    customerId: customerAuth.id,
    userId: null,
    membershipId: null,
    role: null,
    actorType: 'CUSTOMER',
  };

  const payloadFor = (actor: AuthenticatedUser): JwtPayload => ({
    sub: actor.id,
    email: actor.email,
    nombre: actor.nombre,
    empresaId: actor.empresaId,
    permisos: actor.permisos,
    rol: actor.rol,
    estadoLegajo: actor.estadoLegajo,
    type: actor.type,
  });

  const jwtService = { verifyAsync: jest.fn() };
  const jwtStrategy = { validate: jest.fn() };
  const businessContextService = {
    resolveForAuthenticatedUser: jest.fn(),
    resolveForCustomer: jest.fn(),
  };
  const messagingService = { getConversation: jest.fn() };

  // Real revocation service with stubbed persistence/context: the event bus
  // under test is real, only its inputs are doubled.
  const revocationPrisma = { membership: { findFirst: jest.fn(), update: jest.fn() } };
  const revocationContext = { resolveForAuthenticatedUser: jest.fn() };
  const membershipRevocation = new MembershipRevocationService(
    revocationPrisma as unknown as PrismaService,
    revocationContext as unknown as BusinessContextService,
  );
  const revocationOwnerAuth = {
    id: 'legacy-owner',
    type: 'usuario',
  } as unknown as AuthenticatedUser;
  const revocationOwnerContext: BusinessContext = {
    businessId: 'business-a',
    customerId: null,
    userId: 'user-owner',
    membershipId: 'membership-owner',
    role: 'OWNER',
    permissions: [],
    actorType: 'USER',
  };

  let app: INestApplication;
  let port: number;
  let namespace: Namespace;
  const clients: ClientSocket[] = [];

  const roomsOf = (): Map<string, Set<string>> =>
    namespace.adapter.rooms as unknown as Map<string, Set<string>>;

  const serverSocketIds = (): string[] => [
    ...(namespace.sockets as unknown as Map<string, unknown>).keys(),
  ];

  const conversationRooms = (): string[] =>
    [...roomsOf().keys()].filter((room) => room.startsWith('conversation:'));

  const connectClient = (token?: string): Promise<ClientSocket> =>
    new Promise((resolve, reject) => {
      const client: ClientSocket = ioClient(`http://127.0.0.1:${port}/messaging`, {
        auth: token === undefined ? {} : { token },
        reconnection: false,
        timeout: ACK_TIMEOUT_MS,
      });
      clients.push(client);
      const timer = setTimeout(() => reject(new Error('connect timeout')), ACK_TIMEOUT_MS);
      client.once('connect', () => {
        clearTimeout(timer);
        resolve(client);
      });
      client.once('connect_error', (error: Error) => {
        clearTimeout(timer);
        reject(error);
      });
    });

  const emitJoin = (client: ClientSocket, body: unknown): Promise<unknown> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('ACK timeout')), ACK_TIMEOUT_MS);
      client.emit('conversation.join', body, (response: unknown) => {
        clearTimeout(timer);
        resolve(response);
      });
    });

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingGateway,
        NamespaceProbeGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: JwtStrategy, useValue: jwtStrategy },
        { provide: BusinessContextService, useValue: businessContextService },
        { provide: MessagingService, useValue: messagingService },
        { provide: MembershipRevocationService, useValue: membershipRevocation },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
    const address = app.getHttpServer().address() as { port: number };
    port = address.port;

    const probe = app.get(NamespaceProbeGateway);
    if (!probe.namespace) {
      throw new Error('/messaging namespace was not initialized');
    }
    namespace = probe.namespace;
  }, 30000);

  afterAll(async () => {
    for (const client of clients) {
      if (client.connected) client.disconnect();
    }
    if (app) await app.close();
  });

  afterEach(async () => {
    for (const client of clients.splice(0)) {
      if (client.connected) client.disconnect();
    }
    // Drain server-side disconnects so room/socket assertions in the next
    // test never observe a stale socket.
    if (namespace) {
      const start = Date.now();
      while (serverSocketIds().length > 0) {
        if (Date.now() - start > 3000) throw new Error('server sockets did not drain');
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (jwtService.verifyAsync as jest.Mock).mockImplementation(async (token: string) => {
      if (token === 'user-jwt') return payloadFor(userAuth);
      if (token === 'customer-jwt') return payloadFor(customerAuth);
      throw new Error('invalid token');
    });
    (jwtStrategy.validate as jest.Mock).mockImplementation(async (payload: JwtPayload) =>
      payload.type === 'cliente' ? customerAuth : userAuth,
    );
    (businessContextService.resolveForAuthenticatedUser as jest.Mock).mockResolvedValue(
      userContext,
    );
    (businessContextService.resolveForCustomer as jest.Mock).mockResolvedValue(customerContext);
  });

  it('suspension through the existing revocation service disconnects the joined socket', async () => {
    (messagingService.getConversation as jest.Mock).mockResolvedValue({ id: 'conv-a' });
    (revocationContext.resolveForAuthenticatedUser as jest.Mock).mockResolvedValue(
      revocationOwnerContext,
    );
    (revocationPrisma.membership.findFirst as jest.Mock).mockResolvedValue({
      id: 'membership-a',
      userId: 'canonical-user-a',
      businessId: 'business-a',
      status: 'ACTIVE',
    });
    (revocationPrisma.membership.update as jest.Mock).mockResolvedValue({
      id: 'membership-a',
      userId: 'canonical-user-a',
      businessId: 'business-a',
      status: 'SUSPENDED',
    });
    const client = await connectClient('user-jwt');

    const ack = await emitJoin(client, { conversationId: 'conv-a' });
    expect(ack).toEqual({ ok: true, room: 'conversation:conv-a' });
    expect(roomsOf().get('conversation:conv-a')).toEqual(new Set(serverSocketIds()));

    const disconnected = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('disconnect timeout')), ACK_TIMEOUT_MS);
      client.once('disconnect', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    await membershipRevocation.suspendMembership(revocationOwnerAuth, 'membership-a');
    await disconnected;

    expect(client.connected).toBe(false);
    expect(conversationRooms()).toEqual([]);
    expect(serverSocketIds()).toEqual([]);
  }, 15000);

  it('suspended user cannot establish a new connection or regain room access', async () => {
    // The canonical resolver fails closed for non-ACTIVE Memberships
    // (resolver semantics owned by the BusinessContext specs); the
    // transport must therefore reject the handshake.
    (businessContextService.resolveForAuthenticatedUser as jest.Mock).mockRejectedValueOnce(
      new ForbiddenException('Sin Membership activa: contexto denegado'),
    );

    await expect(connectClient('user-jwt')).rejects.toThrow('Realtime authentication failed');
    expect(serverSocketIds()).toEqual([]);
  });
});
