import {
  ForbiddenException,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { DefaultEventsMap, Namespace, Socket } from 'socket.io';
import type { JwtPayload, AuthenticatedUser } from '../auth/auth.types';
import { JwtStrategy } from '../auth/jwt.strategy';
import type { BusinessContext } from '../business-context/business-context.types';
import { BusinessContextService } from '../business-context/business-context.service';
import type { MembershipStatusChangedEvent } from '../membership/membership-revocation.service';
import { MembershipRevocationService } from '../membership/membership-revocation.service';
import { canReadAllConversations, MessagingService } from './messaging.service';
import { toMessageWire, type SerializableMessage } from './message-serializer';
import { MessagingAlertsService } from './messaging-alerts.service';
import { CustomerNoticeService } from '../customer-notices/customer-notice.service';

interface MessagingSocketData {
  authenticatedUser: AuthenticatedUser;
  businessContext: BusinessContext;
}

type MessagingSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  MessagingSocketData
>;

// M4-D07: the room name is `conversation:{Conversation.id}`. The id is the
// existing Conversation UUID — no new identifier is created.
export const CONVERSATION_ROOM_PREFIX = 'conversation:';

// E1 (realtime inbox). Every socket joins, at connection, the room of its own actor in its
// Business, and staff who read every conversation (MESSAGING_MANAGE) also join the
// Business readers room. `inbox.changed` and `conversation.typing` go to those rooms, so
// a screen hears about any conversation it may read without joining each one. The events
// carry ids only, never content: the screen reloads through HTTP, which stays the
// authority on what each actor may see.
export function actorRoom(
  businessId: string,
  actor: { userId: string | null; customerId: string | null },
): string | null {
  if (actor.userId) return `actor:${businessId}:user:${actor.userId}`;
  if (actor.customerId) return `actor:${businessId}:customer:${actor.customerId}`;
  return null;
}

export function readersRoom(businessId: string): string {
  return `readers:${businessId}`;
}

/**
 * E2b — how long someone stays «en línea» after their last screen closed. A page reload or a
 * short network cut reconnects within it, so the status does not flicker.
 */
export function presenceGraceMs(): number {
  const configured = Number(process.env.PRESENCE_GRACE_MS);
  return Number.isFinite(configured) && configured >= 0 ? configured : 15_000;
}

// M4-D08 + minimal ACK convention (no established Socket.IO ACK error
// convention exists in this project, so M4-03 defines the smallest explicit
// one and nothing more — no generic realtime error framework):
//
// - Event: `conversation.join`, body `{ conversationId: string }`.
// - Success: the returned value is delivered through the Socket.IO
//   acknowledgement as `{ ok: true, room }`.
// - Unauthorized join: the returned value is delivered through the
//   acknowledgement as `{ ok: false, error, message }` and the socket stays
//   connected (never disconnected, never joined, no conversation data
//   emitted). `error` preserves the existing domain distinction:
//   NOT_FOUND (missing/deleted/cross-Business — same non-disclosing
//   semantics as the HTTP path) vs FORBIDDEN (inactive/nonparticipant).
// - Only the two domain exceptions of the authorization contract are
//   mapped. Any other error is a bug or infrastructure failure: it is
//   rethrown (loud, logged by the transport layer) instead of being masked
//   as an authorization outcome. No join has happened at that point either.
// WS3: the join ACK carries the same `viewerAccess` the HTTP contract
// already returns for a conversation. Joining a room means "you receive this
// conversation's events", which is NOT the same as "you may write to it": an
// Owner who is not a participant reads every conversation of its Business
// (INV-MSG-005) but is rejected on write (INV-MSG-004). Without this field
// the realtime client would have to infer write capability — or discover it
// through a 403 after the user already typed a message, which is exactly the
// reported "El actor no participa" symptom. Same shape and same values as
// HTTP, so the frontend has one rule, not two.
export interface ConversationViewerAccess {
  canSend: boolean;
  mode: 'PARTICIPANT' | 'OWNER_READ_ONLY';
}

export type JoinConversationResult =
  | { ok: true; room: string; viewerAccess: ConversationViewerAccess }
  | { ok: false; error: 'BAD_REQUEST' | 'NOT_FOUND' | 'FORBIDDEN'; message: string };

interface JoinConversationBody {
  conversationId?: unknown;
}

/**
 * M4-03 — Conversation room authorization.
 *
 * Socket.IO stays the transport boundary. The handshake authenticates the
 * JWT (users and customers) and resolves the canonical BusinessContext;
 * room subscription is an explicit `conversation.join` command that is
 * authorized through the existing MessagingService path BEFORE joining.
 * The gateway duplicates no Prisma authorization query: HTTP/services
 * remain the domain authority.
 */
@WebSocketGateway({
  namespace: '/messaging',
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private readonly logger = new Logger(MessagingGateway.name);

  @WebSocketServer()
  private namespace!: Namespace;

  private readonly connectedSockets = new Map<string, MessagingSocket>();

  // E2b: who is online, by actor room: open sockets, and the timer that marks them away.
  private readonly presence = new Map<
    string,
    { sockets: number; leaving?: ReturnType<typeof setTimeout> }
  >();

  private unsubscribeRevocation?: () => void;

  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtStrategy: JwtStrategy,
    private readonly businessContextService: BusinessContextService,
    private readonly messagingService: MessagingService,
    private readonly membershipRevocation: MembershipRevocationService,
    // E3: push to team members with Wapsell closed. Optional so unit tests may omit it.
    @Optional() private readonly alerts?: MessagingAlertsService,
    // OR-B4-053: a notice posted by the system (an order changed) updates the open screens.
    @Optional() private readonly notices?: CustomerNoticeService,
  ) {}

  afterInit(namespace: Namespace): void {
    // E3: alerts skip whoever has a screen open; only this gateway knows that.
    this.alerts?.usePresence((businessId, actor) => this.isOnline(businessId, actor));
    this.notices?.onPosted((conversationId) => this.publishInboxChanged(conversationId));
    namespace.use(async (socket, next) => {
      try {
        const token = this.extractToken(socket);
        if (!token) {
          throw new Error('Missing realtime authentication token');
        }

        const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
        const authenticatedUser = await this.jwtStrategy.validate(payload);
        // M4-D06: customers connect too. Same branching as
        // MessagingService.resolveContext — no new identity, tenancy or
        // BusinessContext mechanism, only the existing resolvers.
        const businessContext =
          authenticatedUser.type === 'cliente'
            ? await this.businessContextService.resolveForCustomer(authenticatedUser)
            : await this.businessContextService.resolveForAuthenticatedUser(authenticatedUser);

        socket.data.authenticatedUser = authenticatedUser;
        socket.data.businessContext = businessContext;
        next();
      } catch {
        next(new Error('Realtime authentication failed'));
      }
    });

    // M4-04 — consume the existing membership.status.changed domain event.
    // Membership stays the authority; this subscription only invalidates
    // transport access, it stores no Membership state.
    this.unsubscribeRevocation = this.membershipRevocation.onStatusChanged((event) =>
      this.handleRevocationEvent(event),
    );
  }

  handleConnection(@ConnectedSocket() client: MessagingSocket): void {
    // M4-02 authentication is enforced by the Socket.IO namespace middleware.
    // Authorized connection state is already attached to socket.data.
    // Room subscription is never implicit: it requires conversation.join.
    // M4-04: tracked so a later Membership revocation can invalidate it.
    this.connectedSockets.set(client.id, client);
    this.joinInboxRooms(client);
    this.cameOnline(client.data.businessContext);
    this.logger.log(
      JSON.stringify({
        event: 'messaging.socket.connected',
        socketId: client.id,
        actorType: client.data.authenticatedUser.type,
        connectedSockets: this.connectedSockets.size,
      }),
    );
  }

  handleDisconnect(@ConnectedSocket() client: MessagingSocket): void {
    // M4-02 had no disconnect side effects; E2b counts the actor's open screens.
    this.connectedSockets.delete(client.id);
    if (client.data?.businessContext) this.wentAway(client.data.businessContext);
    this.logger.log(
      JSON.stringify({
        event: 'messaging.socket.disconnected',
        socketId: client.id,
        connectedSockets: this.connectedSockets.size,
      }),
    );
  }

  // E1: a socket's own rooms (see actorRoom). Membership revocation disconnects the
  // socket, which leaves them; a role change takes effect on the next connection.
  private joinInboxRooms(client: MessagingSocket): void {
    try {
      const context = client.data.businessContext;
      const own = actorRoom(context.businessId, context);
      const rooms = [
        own,
        canReadAllConversations(context) ? readersRoom(context.businessId) : null,
      ];
      for (const room of rooms) {
        if (room) void client.join(room);
      }
    } catch (error) {
      this.logger.warn(
        `inbox rooms not joined for socket ${client.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** E2b — whether this actor has a screen open (or closed one less than the grace ago). */
  isOnline(
    businessId: string,
    actor: { userId: string | null; customerId: string | null },
  ): boolean {
    const key = actorRoom(businessId, actor);
    return key !== null && this.presence.has(key);
  }

  private cameOnline(context: BusinessContext): void {
    const key = actorRoom(context.businessId, context);
    if (!key) return;
    const entry = this.presence.get(key);
    if (entry) {
      entry.sockets += 1;
      if (entry.leaving) {
        clearTimeout(entry.leaving);
        entry.leaving = undefined;
      }
      return;
    }
    this.presence.set(key, { sockets: 1 });
    void this.publishPresence(context, true, null);
  }

  private wentAway(context: BusinessContext): void {
    const key = actorRoom(context.businessId, context);
    const entry = key ? this.presence.get(key) : undefined;
    if (!key || !entry) return;
    entry.sockets = Math.max(0, entry.sockets - 1);
    if (entry.sockets > 0 || entry.leaving) return;
    entry.leaving = setTimeout(() => {
      this.presence.delete(key);
      const at = new Date();
      // A timer has no caller to report to: every failure stays here, logged.
      Promise.resolve()
        .then(() => this.messagingService.recordLastSeen(context, at))
        .catch((error: unknown) => {
          this.logger.warn(
            `last seen not saved: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      void this.publishPresence(context, false, at);
    }, presenceGraceMs());
    entry.leaving.unref?.();
  }

  /**
   * E2b — tells who came online or left to everyone sharing a conversation with them. Staff
   * learn who and when; a customer only that the store's presence changed (never a team
   * member's last seen).
   */
  private async publishPresence(
    context: BusinessContext,
    online: boolean,
    at: Date | null,
  ): Promise<void> {
    try {
      if (!this.namespace) return;
      const audience = await this.messagingService.presenceAudience(context);
      const own = actorRoom(context.businessId, context);
      const exceptOwn = own ? [own] : [];
      const staff = [
        readersRoom(context.businessId),
        ...audience.userIds.map((userId) => `actor:${context.businessId}:user:${userId}`),
      ];
      this.namespace
        .to(staff)
        .except(exceptOwn)
        .emit('presence.changed', {
          userId: context.userId,
          customerId: context.customerId,
          online,
          lastSeenAt: at ? at.toISOString() : null,
        });
      if (context.userId && audience.customerIds.length > 0) {
        this.namespace
          .to(
            audience.customerIds.map(
              (customerId) => `actor:${context.businessId}:customer:${customerId}`,
            ),
          )
          .emit('presence.changed', {});
      }
    } catch (error) {
      this.logger.warn(
        `presence.changed failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  onModuleDestroy(): void {
    for (const entry of this.presence.values()) {
      if (entry.leaving) clearTimeout(entry.leaving);
    }
    this.presence.clear();
    this.unsubscribeRevocation?.();
    this.unsubscribeRevocation = undefined;
    this.connectedSockets.clear();
  }

  @SubscribeMessage('conversation.join')
  async handleJoinConversation(
    @ConnectedSocket() client: MessagingSocket,
    @MessageBody() body: JoinConversationBody,
  ): Promise<JoinConversationResult> {
    const conversationId =
      typeof body?.conversationId === 'string' ? body.conversationId.trim() : '';
    if (!conversationId) {
      return { ok: false, error: 'BAD_REQUEST', message: 'conversationId requerido' };
    }

    let viewerAccess: ConversationViewerAccess;
    try {
      // The service is the single authorization authority: the gateway runs
      // no Prisma query of its own and derives nothing. `viewerAccess` is
      // whatever HTTP would have answered for this same actor.
      const conversation = await this.messagingService.getConversation(
        client.data.authenticatedUser,
        conversationId,
      );
      const rawAccess = (conversation as { viewerAccess?: ConversationViewerAccess }).viewerAccess;
      if (!rawAccess) {
        // Contract violation: the service MUST return viewerAccess for every
        // authorized read. Failing explicitly prevents silent permission drift.
        this.logger.error(
          JSON.stringify({
            event: 'messaging.gateway.join.missing_viewerAccess',
            conversationId,
            actorType: client.data.authenticatedUser.type,
          }),
        );
        throw new Error(
          'Authorization contract incomplete: viewerAccess missing from service response',
        );
      }
      viewerAccess = rawAccess;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return { ok: false, error: 'FORBIDDEN', message: error.message };
      }
      if (error instanceof NotFoundException) {
        return { ok: false, error: 'NOT_FOUND', message: error.message };
      }
      throw error;
    }

    const room = `${CONVERSATION_ROOM_PREFIX}${conversationId}`;
    await client.join(room);
    this.logger.log(
      JSON.stringify({
        event: 'messaging.room.joined',
        socketId: client.id,
        conversationId,
        room,
        canSend: viewerAccess.canSend,
        mode: viewerAccess.mode,
      }),
    );
    return { ok: true, room, viewerAccess };
  }

  // Publish only after the HTTP service has committed persistence.
  // Realtime is best-effort: a transport failure must never turn a committed
  // HTTP mutation into an apparent failure. HTTP remains the recovery source.
  // P3/D-01: the realtime payload is produced by the SAME serializer the HTTP
  // layer uses (`toMessageWire`), not by a hand-built object. Before this the
  // event carried 8 ad-hoc fields while `GET /messages` returned 15, so a
  // client rendering a socket event was missing `type` and
  // `replyToMessageId` (a reply arrived without its thread) until a later
  // HTTP read corrected it. One serializer means HTTP and Socket.IO cannot
  // drift, and the allowlist keeps tenancy columns off the wire.
  publishMessageCreated(message: SerializableMessage): void {
    this.publishToConversation(
      'conversation.message.created',
      message.conversationId,
      toMessageWire(message),
    );
    // E3: push to the team members who are away. Best-effort, never back to the caller.
    if (this.alerts) {
      Promise.resolve()
        .then(() => this.alerts?.pushNewMessage(message.id))
        .catch((error: unknown) =>
          this.logger.warn(
            `push failed for message ${message.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
    }
  }

  publishMessageUpdated(message: {
    id: string;
    conversationId: string;
    content: string | null;
    editedAt: Date | null;
  }): void {
    this.publishToConversation('conversation.message.updated', message.conversationId, {
      id: message.id,
      conversationId: message.conversationId,
      content: message.content,
      editedAt: message.editedAt,
    });
  }

  publishMessageDeleted(message: {
    id: string;
    conversationId: string;
    deletedAt: Date | null;
  }): void {
    // Never include the pre-delete content in the event payload.
    this.publishToConversation('conversation.message.deleted', message.conversationId, {
      id: message.id,
      conversationId: message.conversationId,
      deletedAt: message.deletedAt,
    });
  }

  publishMessageRead(receipt: {
    messageId: string;
    conversationId: string;
    readAt: Date | string;
  }): void {
    this.publishToConversation('conversation.message.read', receipt.conversationId, receipt);
  }

  publishParticipantRemoved(event: {
    conversationId: string;
    participantId: string;
    userId: string | null;
    customerId: string | null;
    removedAt: Date | null;
    leftAt: Date | null;
  }): void {
    // Emit before eviction so the removed participant can receive the
    // membership-change notification, then revoke only this room subscription.
    this.publishToConversation('conversation.participant.removed', event.conversationId, {
      conversationId: event.conversationId,
      participantId: event.participantId,
      userId: event.userId,
      customerId: event.customerId,
      removedAt: event.removedAt,
      leftAt: event.leftAt,
    });

    this.evictParticipantFromConversation(event);
  }

  private evictParticipantFromConversation(event: {
    conversationId: string;
    userId: string | null;
    customerId: string | null;
  }): void {
    const room = `${CONVERSATION_ROOM_PREFIX}${event.conversationId}`;

    for (const socket of this.connectedSockets.values()) {
      try {
        const context = socket.data.businessContext;
        const matchesUser = event.userId !== null && context.userId === event.userId;
        const matchesCustomer =
          event.customerId !== null && context.customerId === event.customerId;

        // The authorized conversation room scopes eviction; other rooms remain joined.
        if ((!matchesUser && !matchesCustomer) || !socket.rooms.has(room)) {
          continue;
        }

        Promise.resolve(socket.leave(room)).catch((error: unknown) => {
          this.logger.warn(
            `failed to evict socket ${socket.id} from ${room}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
      } catch (error) {
        this.logger.warn(
          `failed to evict socket ${socket.id} from ${room}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
  private publishToConversation(
    eventName: string,
    conversationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any,
  ): void {
    try {
      if (!this.namespace) {
        this.logger.warn(`realtime event ${eventName} skipped: namespace is not initialized`);
        return;
      }
      const room = `${CONVERSATION_ROOM_PREFIX}${conversationId}`;
      const recipientSockets = this.namespace.adapter.rooms.get(room)?.size ?? 0;
      this.namespace.to(room).emit(eventName, payload);
      this.publishInboxChanged(conversationId);
      this.logger.log(
        JSON.stringify({
          event: 'messaging.realtime.emitted',
          eventName,
          conversationId,
          messageId: typeof payload.id === 'string' ? payload.id : undefined,
          recipientSockets,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `realtime event ${eventName} failed for conversation ${conversationId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * E1 — tells every screen that may read this conversation that it changed (new, edited,
   * deleted or read message, participant left). Ids only; best-effort like every event.
   */
  publishInboxChanged(conversationId: string): void {
    void this.inboxRooms(conversationId)
      .then((audience) => {
        if (!audience || !this.namespace) return;
        const rooms = [...audience.staff, ...audience.customers];
        if (rooms.length > 0) this.namespace.to(rooms).emit('inbox.changed', { conversationId });
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `inbox.changed failed for conversation ${conversationId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }

  /**
   * E1 — «escribiendo…»: to everyone who may read the conversation except the writer.
   * Staff learn who writes (the user or customer id, which their screen already knows by
   * name); customers only learn that the store is writing.
   */
  async publishTyping(
    conversationId: string,
    writer: { businessId: string; userId: string | null; customerId: string | null },
  ): Promise<void> {
    try {
      const audience = await this.inboxRooms(conversationId);
      if (!audience || !this.namespace || audience.businessId !== writer.businessId) return;
      const own = actorRoom(writer.businessId, writer);
      const exceptOwn = own ? [own] : [];
      if (audience.staff.length > 0) {
        this.namespace.to(audience.staff).except(exceptOwn).emit('conversation.typing', {
          conversationId,
          userId: writer.userId,
          customerId: writer.customerId,
        });
      }
      if (audience.customers.length > 0) {
        this.namespace
          .to(audience.customers)
          .except(exceptOwn)
          .emit('conversation.typing', { conversationId });
      }
    } catch (error) {
      this.logger.warn(
        `conversation.typing failed for conversation ${conversationId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async inboxRooms(
    conversationId: string,
  ): Promise<{ businessId: string; staff: string[]; customers: string[] } | null> {
    const audience = await this.messagingService.realtimeAudience(conversationId);
    if (!audience) return null;
    const { businessId } = audience;
    return {
      businessId,
      staff: [
        readersRoom(businessId),
        ...audience.userIds.map((userId) => `actor:${businessId}:user:${userId}`),
      ],
      customers: audience.customerIds.map(
        (customerId) => `actor:${businessId}:customer:${customerId}`,
      ),
    };
  }

  // M4-04 — Membership revocation enforcement (M4-D11). Runs on the
  // existing domain event, after the Membership transition is committed.
  // Only suspensions invalidate (`newStatus !== 'ACTIVE'` — reactivations
  // restore access and must not disconnect anyone). Matching uses the
  // canonical BusinessContext already attached at handshake: same
  // canonical userId AND same Business. Customer sockets carry
  // `userId: null` and therefore never match a User Membership event;
  // sockets from another Business never match either.
  // The try/catch is a deliberate error boundary: the event fires
  // synchronously after the post-commit emitter, so a failure here must
  // never propagate back into the Membership mutation path.
  private handleRevocationEvent(event: MembershipStatusChangedEvent): void {
    try {
      if (event.newStatus === 'ACTIVE') {
        return;
      }
      for (const socket of this.connectedSockets.values()) {
        // socket.data is always populated by the handshake middleware
        // before a socket can connect, so businessContext is present here.
        const context = socket.data.businessContext;
        if (context.userId === null) {
          continue;
        }
        if (context.userId !== event.userId || context.businessId !== event.businessId) {
          continue;
        }
        // Per-socket boundary: a broken socket must not shield the
        // remaining matches from invalidation.
        try {
          socket.disconnect(true);
        } catch (error) {
          this.logger.warn(
            `membership revocation handling failed for socket ${socket.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `membership revocation handling failed for Business ${event.businessId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private extractToken(socket: Socket): string | null {
    const token = socket.handshake.auth?.token;
    return typeof token === 'string' && token.trim().length > 0 ? token.trim() : null;
  }
}
