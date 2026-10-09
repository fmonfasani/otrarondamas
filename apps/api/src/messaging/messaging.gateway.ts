import { ForbiddenException, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { DefaultEventsMap, Namespace, Socket } from 'socket.io';
import type { JwtPayload, AuthenticatedUser } from '../auth/auth.types';
import { JwtStrategy } from '../auth/jwt.strategy';
import type { BusinessContext } from '../business-context/business-context.types';
import { BusinessContextService } from '../business-context/business-context.service';
import type { MembershipStatusChangedEvent } from '../membership/membership-revocation.service';
import { MembershipRevocationService } from '../membership/membership-revocation.service';
import { MessagingService } from './messaging.service';

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
export type JoinConversationResult =
  | { ok: true; room: string }
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

  private readonly connectedSockets = new Map<string, MessagingSocket>();

  private unsubscribeRevocation?: () => void;

  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtStrategy: JwtStrategy,
    private readonly businessContextService: BusinessContextService,
    private readonly messagingService: MessagingService,
    private readonly membershipRevocation: MembershipRevocationService,
  ) {}

  afterInit(namespace: Namespace): void {
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
  }

  handleDisconnect(@ConnectedSocket() client: MessagingSocket): void {
    // M4-02 intentionally has no disconnect side effects.
    this.connectedSockets.delete(client.id);
  }

  onModuleDestroy(): void {
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

    try {
      await this.messagingService.getConversation(client.data.authenticatedUser, conversationId);
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
    return { ok: true, room };
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
