import { Injectable, OnModuleDestroy, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import passport from 'passport';
import { Server, Socket } from 'socket.io';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BusinessContextService } from '../business-context/business-context.service';
import { MembershipRevocationService } from '../membership/membership-revocation.service';
import { MessagingService } from './messaging.service';
import { MessagingRealtimeEvent, MessagingRealtimeEventBus } from './messaging-realtime-event-bus';

type RealtimeSocketData = {
  auth: AuthenticatedUser;
  businessId: string;
  userId: string | null;
  customerId: string | null;
};

@Injectable()
export class MessagingRealtimeGateway implements OnModuleInit, OnModuleDestroy {
  private server?: Server;
  private readonly unsubscribeHandlers: Array<() => void> = [];

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly businessContext: BusinessContextService,
    private readonly messagingService: MessagingService,
    private readonly membershipRevocation: MembershipRevocationService,
    private readonly eventBus: MessagingRealtimeEventBus,
  ) {}

  onModuleInit(): void {
    const httpServer = this.httpAdapterHost.httpAdapter.getHttpServer();
    this.server = new Server(httpServer, { path: '/socket.io' });

    this.server.use(async (socket, next) => {
      try {
        const auth = await this.authenticate(socket);
        const context = auth.type === 'cliente'
          ? await this.businessContext.resolveForCustomer(auth)
          : await this.businessContext.resolveForAuthenticatedUser(auth);

        socket.data = {
          auth,
          businessId: context.businessId,
          userId: context.userId,
          customerId: context.customerId,
        } satisfies RealtimeSocketData;

        next();
      } catch {
        next(new Error('Realtime authentication failed'));
      }
    });

    this.server.on('connection', (socket) => this.onConnection(socket));
    this.unsubscribeHandlers.push(
      this.eventBus.subscribe((event) => this.publishDomainEvent(event)),
      this.membershipRevocation.onStatusChanged((event) =>
        this.handleMembershipStatusChanged(event),
      ),
    );
  }

  onModuleDestroy(): void {
    for (const unsubscribe of this.unsubscribeHandlers) unsubscribe();
    this.server?.close();
  }

  private async authenticate(socket: Socket): Promise<AuthenticatedUser> {
    const token = this.extractToken(socket);

    return new Promise<AuthenticatedUser>((resolve, reject) => {
      const middleware = passport.authenticate(
        'jwt',
        { session: false },
        (error, user) => {
          if (error) return reject(error);
          if (!user) return reject(new UnauthorizedException('Invalid JWT'));
          resolve(user as AuthenticatedUser);
        },
      );

      middleware(
        { headers: { authorization: 'Bearer ' + token } } as any,
        {} as any,
        () => reject(new UnauthorizedException('JWT authentication failed')),
      );
    });
  }

  private extractToken(socket: Socket): string {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) return authToken;

    const authorization = socket.handshake.headers.authorization;
    if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
      return authorization.slice(7);
    }

    throw new UnauthorizedException('Missing JWT');
  }

  private onConnection(socket: Socket): void {
    socket.on(
      'conversation:join',
      async (conversationId: string, acknowledge?: (result: unknown) => void) => {
        try {
          if (typeof conversationId !== 'string' || !conversationId) {
            throw new Error('Invalid conversationId');
          }

          const auth = (socket.data as RealtimeSocketData).auth;
          await this.messagingService.authorizeRealtimeConversation(auth, conversationId);

          socket.join(this.conversationRoom(conversationId));
          acknowledge?.({ ok: true, conversationId });
        } catch {
          acknowledge?.({ ok: false, error: 'Conversation access denied' });
        }
      },
    );

    socket.on(
      'conversation:leave',
      (conversationId: string, acknowledge?: (result: unknown) => void) => {
        if (typeof conversationId !== 'string' || !conversationId) {
          acknowledge?.({ ok: false, error: 'Invalid conversationId' });
          return;
        }

        socket.leave(this.conversationRoom(conversationId));
        acknowledge?.({ ok: true, conversationId });
      },
    );
  }

  private publishDomainEvent(event: MessagingRealtimeEvent): void {
    if (!this.server) return;
    this.server.to(this.conversationRoom(event.conversationId)).emit(event.type, event);
  }

  private handleMembershipStatusChanged(event: {
    membershipId: string;
    userId: string;
    businessId: string;
    newStatus: 'ACTIVE' | 'SUSPENDED';
  }): void {
    if (event.newStatus !== 'SUSPENDED' || !this.server) return;

    for (const socket of this.server.sockets.sockets.values()) {
      const data = socket.data as RealtimeSocketData;
      if (data.businessId === event.businessId && data.userId === event.userId) {
        socket.disconnect(true);
      }
    }
  }

  private conversationRoom(conversationId: string): string {
    return 'conversation:' + conversationId;
  }
}
