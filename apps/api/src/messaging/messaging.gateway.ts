import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { OnModuleDestroy, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import type { AuthenticatedUser, JwtPayload } from '../auth/auth.types';
import { BusinessContextService } from '../business-context/business-context.service';
import { MembershipRevocationService } from '../membership/membership-revocation.service';
import { MessagingRealtimeEventBus, type MessagingRealtimeEvent } from './messaging-realtime.event-bus';
import { MessagingService } from './messaging.service';

type SocketState = {
  auth: AuthenticatedUser;
  businessId: string;
  membershipId: string | null;
};

@WebSocketGateway({ namespace: '/messaging', cors: true })
export class MessagingGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  private server!: Server;

  private readonly sockets = new Map<string, SocketState>();
  private readonly membershipSockets = new Map<string, Set<Socket>>();
  private unsubscribeEvents?: () => void;
  private unsubscribeMembership?: () => void;

  constructor(
    private readonly jwtService: JwtService,
    private readonly businessContext: BusinessContextService,
    private readonly membershipRevocation: MembershipRevocationService,
    private readonly events: MessagingRealtimeEventBus,
    private readonly messagingService: MessagingService,
  ) {}

  onModuleInit() {
    this.unsubscribeEvents = this.events.subscribe((event) => this.emitDomainEvent(event));
    this.unsubscribeMembership = this.membershipRevocation.onStatusChanged((event) => {
      if (event.newStatus !== 'SUSPENDED') return;
      const sockets = this.membershipSockets.get(event.membershipId);
      if (!sockets) return;
      for (const socket of sockets) {
        socket.emit('membership.revoked', {
          membershipId: event.membershipId,
          businessId: event.businessId,
          occurredAt: event.occurredAt,
        });
        socket.disconnect(true);
      }
      this.membershipSockets.delete(event.membershipId);
    });
  }

  onModuleDestroy() {
    this.unsubscribeEvents?.();
    this.unsubscribeMembership?.();
  }

  async handleConnection(socket: Socket) {
    try {
      const auth = await this.authenticate(socket);
      const context = auth.type === 'cliente'
        ? await this.businessContext.resolveForCustomer(auth)
        : await this.businessContext.resolveForAuthenticatedUser(auth);

      const state: SocketState = {
        auth,
        businessId: context.businessId,
        membershipId: context.membershipId ?? null,
      };
      this.sockets.set(socket.id, state);

      if (state.membershipId) {
        const set = this.membershipSockets.get(state.membershipId) ?? new Set<Socket>();
        set.add(socket);
        this.membershipSockets.set(state.membershipId, set);
      }

      socket.emit('connection.ready', {
        businessId: context.businessId,
        actorType: context.actorType,
      });
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const state = this.sockets.get(socket.id);
    if (state?.membershipId) {
      const set = this.membershipSockets.get(state.membershipId);
      set?.delete(socket);
      if (set && set.size === 0) this.membershipSockets.delete(state.membershipId);
    }
    this.sockets.delete(socket.id);
  }

  @SubscribeMessage('conversation.join')
  async joinConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { conversationId?: string },
  ) {
    const state = this.requireSocketState(socket);
    if (!body?.conversationId) throw new UnauthorizedException('conversationId requerido');

    const access = await this.messagingService.authorizeRealtimeConversation(
      state.auth,
      body.conversationId,
    );
    await socket.join(this.room(body.conversationId));

    return {
      event: 'conversation.joined',
      data: {
        conversationId: body.conversationId,
        businessId: access.businessId,
      },
    };
  }

  @SubscribeMessage('conversation.leave')
  async leaveConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { conversationId?: string },
  ) {
    this.requireSocketState(socket);
    if (!body?.conversationId) throw new UnauthorizedException('conversationId requerido');
    await socket.leave(this.room(body.conversationId));
    return {
      event: 'conversation.left',
      data: { conversationId: body.conversationId },
    };
  }

  private async authenticate(socket: Socket): Promise<AuthenticatedUser> {
    const raw = socket.handshake.auth?.token
      ?? socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!raw) throw new UnauthorizedException('Socket JWT requerido');

    const payload = await this.jwtService.verifyAsync<JwtPayload>(raw);
    return {
      id: payload.sub,
      email: payload.email,
      nombre: payload.nombre,
      empresaId: payload.empresaId,
      permisos: payload.permisos,
      rol: payload.rol,
      estadoLegajo: payload.estadoLegajo,
      type: payload.type ?? 'usuario',
      esMayorista: payload.esMayorista,
    };
  }

  private requireSocketState(socket: Socket) {
    const state = this.sockets.get(socket.id);
    if (!state) {
      socket.disconnect(true);
      throw new UnauthorizedException('Socket no autenticado');
    }
    return state;
  }

  private emitDomainEvent(event: MessagingRealtimeEvent) {
    if (!this.server) return;
    this.server.to(this.room(event.conversationId)).emit(event.name, event.payload);
  }

  private room(conversationId: string) {
    return `conversation:${conversationId}`;
  }
}
