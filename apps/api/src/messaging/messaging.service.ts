import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  MembershipStatus,
  MessagingAssociationType,
  MessagingConversationType,
  Prisma,
} from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BusinessContextService } from '../business-context/business-context.service';
import { PrismaService } from '../prisma/prisma.service';
import type { BusinessContext } from '../business-context/business-context.types';
import { StoreService } from '../store/store.service';
import { CartService } from '../cart/cart.service';
import { CreateConversationDto, ConversationTypeDto } from './dto/create-conversation.dto';
import { hasCanonicalPermission } from '../authorization/canonical-permissions';
import {
  ORDER_CARD_MIME,
  PRODUCT_CARD_MIME,
  toMessageWire,
  type ReactionGroup,
  type ReplyPreview,
} from './message-serializer';
import { cleanFileName, isServableChatFile, sniffChatFile } from './chat-files';
import { LINK_PREVIEW_MIME, fetchLinkPreview, firstLink } from './link-preview';
import {
  autoRepliesDue,
  autoRepliesOf,
  autoRepliesProblem,
  isOpenAt,
  type AutoReplies,
} from './auto-replies';
import { contactOf } from '../negocio/negocio.service';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * Read-only access to every conversation of the Business without being a participant
 * (OWNER_READ_ONLY mode below): staff whose role holds MESSAGING_MANAGE in the approved
 * matrix — Owner and Admin (OR-B4-027) — and that have a canonical User.
 */
export function canReadAllConversations(context: BusinessContext): boolean {
  return hasCanonicalPermission(context.role, 'MESSAGING_MANAGE') && context.userId !== null;
}

const MAX_GROUP_PARTICIPANTS = 50;

/**
 * E2 — a Prisma filter for «rows of anyone but this actor». A plain `NOT: { userId: x }` also
 * drops the rows where userId is NULL (customers' rows, and vice versa), so the other kind of
 * actor would silently disappear.
 */
function notThisActor<U extends string, C extends string>(
  context: BusinessContext,
  userField: U,
  customerField: C,
): { OR: Array<Record<string, unknown>> } {
  return context.userId
    ? { OR: [{ [userField]: null }, { [userField]: { not: context.userId } }] }
    : { OR: [{ [customerField]: null }, { [customerField]: { not: context.customerId } }] };
}

/** E2 — ticks of one's own message: ✓ saved, ✓✓ reached the others, blue ✓✓ read. */
export type MessageTick = 'enviado' | 'entregado' | 'leido';

/** E2 — what a notification says about a message: a short preview, never a whole file. */
export function notificationPreview(message: {
  content: string | null;
  Attachment: Array<{ mimeType: string; filename: string }>;
}): string {
  const file = message.Attachment[0];
  const text = (message.content ?? '').trim();
  if (file?.mimeType === PRODUCT_CARD_MIME) return `🛍️ ${file.filename}`;
  if (file?.mimeType.startsWith('audio/')) return '🎤 Nota de voz';
  if (file?.mimeType.startsWith('video/')) {
    return text && text !== file.filename ? `🎥 ${text}` : '🎥 Video';
  }
  if (file?.mimeType.startsWith('image/')) {
    return text && text !== file.filename ? `📷 ${text}` : '📷 Foto';
  }
  if (file && file.mimeType !== LINK_PREVIEW_MIME) return `📄 ${file.filename}`;
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

/**
 * Retry key of an order made from a conversation: the conversation plus the exact cart
 * lines (ids and quantities). Same cart → same key → same order; any change → new order.
 */
function conversationOrderKey(
  conversationId: string,
  lines: Array<{ id: string; cantidad: unknown }>,
): string {
  const fingerprint = lines
    .map((line) => `${line.id}:${String(line.cantidad)}`)
    .sort((a, b) => a.localeCompare(b))
    .join('|');
  return `msg-${createHash('sha256').update(`${conversationId}|${fingerprint}`).digest('hex')}`;
}

/**
 * MESSAGING ACCESS POLICY — INVARIANTS FOR CONVERSATION CORE
 *
 * Wapsell Messaging implements a four-level access control model, defined and approved in
 * TO-BE (OR-B2 ruling 019–021, OR-B3-001/002/008) and verified in the integration test suite
 * (messaging-participation.integration-spec.ts).
 *
 * ## Access Modes (enforced at each operation level)
 *
 * ### Mode 1: PARTICIPANT (active, joined participant)
 * - **Who:** User or Customer with active ConversationParticipant record (leftAt=null, removedAt=null)
 * - **List conversations:** ✓ Can list; sees only their own
 * - **Read conversation:** ✓ Can read details and participants
 * - **Read messages:** ✓ Can read all messages
 * - **Write messages:** ✓ **REQUIRED** for sending (enforced by assertActiveParticipant)
 * - **Edit/delete own messages:** ✓ Can edit/delete (author check required)
 * - **Manage conversation:** ✗ Requires additional isAdmin flag
 * - **Technical note:** Participant list + leftAt/removedAt timestamps define lifecycle.
 *
 * ### Mode 2: OWNER_READ_ONLY (non-participant but Business Owner)
 * - **Who:** User whose role holds MESSAGING_MANAGE (Owner or Admin, OR-B4-027), NOT in the
 *   conversation's participants
 * - **List conversations:** ✓ Can list all conversations of the Business (no filter)
 * - **Read conversation:** ✓ Can read details and participants
 * - **Read messages:** ✓ Can read all messages from conversation start (no join timestamp limit)
 * - **Write messages:** ✗ **FORBIDDEN** — assertActiveParticipant throws 403
 * - **Technical note:** Implemented via `canReadAllConversations(context)` — staff holding
 *   MESSAGING_MANAGE in the matrix (Owner and Admin, OR-B4-027) with a canonical User —
 *   check in listConversations, getMessages, withViewerAccess. This allows administrative
 *   audit without granting implicit write permission.
 *
 * ### Mode 3: NON_AUTHORIZED (non-Owner, not a participant)
 * - **Who:** User or Customer of the Business, NOT OWNER, NOT participant
 * - **List conversations:** ✗ FORBIDDEN — sees empty list (no admin override)
 * - **Read conversation:** ✗ FORBIDDEN — 403 from assertActiveParticipant
 * - **Read messages:** ✗ FORBIDDEN — 403 from assertActiveParticipant
 * - **Write messages:** ✗ FORBIDDEN — 403 from assertActiveParticipant
 * - **Technical note:** Non-Owners must be participants to see anything; no special read mode.
 *
 * ### Mode 4: FOREIGN_BUSINESS (different Business)
 * - **Who:** User or Customer of a different Business entirely
 * - **List conversations:** ✓ Can list, but only sees their own Business's conversations (empty list)
 * - **Read conversation:** ✗ FORBIDDEN — 404 (businessId check fails in findFirst)
 * - **Read messages:** ✗ FORBIDDEN — 404 (businessId check in getMessages)
 * - **Write messages:** ✗ FORBIDDEN — 404 (businessId check in createTextMessage)
 * - **Technical note:** All queries filter by `businessId: context.businessId`; cross-tenant
 *   access returns 404, not 403, to avoid leaking Business existence.
 *
 * ## Operation-Level Enforcement
 *
 * - **list/get (read-only):** canReadAll (MESSAGING_MANAGE) → no assertActiveParticipant
 *   (OWNER_READ_ONLY allowed; other modes blocked by absent participant record)
 * - **send/edit/delete:** assertActiveParticipant → FORBIDDEN if not participant
 *   (OWNER_READ_ONLY and below all fail; PARTICIPANT required)
 * - **manage (admin ops):** assertConversationAdmin → isAdmin: true AND MESSAGING_MANAGE
 *   (strictest check; combined with participant + admin flag)
 *
 * ## Customer Identity
 *
 * Customers are not Wapsell Users; they are commercial entities (Cliente in legacy). They:
 * - Can participate in conversations via ConversationParticipant (customerId field)
 * - Access via Socket.IO and customer-specific endpoints only
 * - Are rejected on staff HTTP endpoints (SEC-01 in auth middleware)
 * - Follow the same 4-level access but never have OWNER role (Mode 2 doesn't apply)
 *
 * ## Tests
 *
 * All four modes are verified in apps/api/test/integration/messaging-participation.integration-spec.ts:
 * - Owner non-participant sees conversation but write fails (Mode 2)
 * - Non-Owner non-participant cannot see anything (Mode 3)
 * - Foreign Business sees nothing (Mode 4)
 * - Participant can read and write (Mode 1)
 *
 * DO NOT weaken these invariants without Owner approval (DEC-001 precedence; see TO-BE).
 */

/** Paquete 1 F2 — messages per page of a chat, and the most a caller may ask for. */
export const MESSAGES_PAGE = 50;
const MESSAGES_PAGE_MAX = 100;

/** E4 — like WhatsApp: a message can be edited for 15 minutes and deleted for everyone for 2 days. */
/** E5 — a voice note's length as the recorder measured it, kept within sane bounds. */
function voiceSeconds(value: number | undefined): number | null {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(Math.round(value), 3600);
}

/** E5 — what to say when a file is over the limit of its kind. */
function tooBigMessage(kind: { mimeType: string; type: string }) {
  if (kind.mimeType.startsWith('video/')) return 'El video puede pesar hasta 64 MB.';
  if (kind.type === 'VOICE') return 'La nota de voz es demasiado larga.';
  return 'El archivo puede pesar hasta 10 MB.';
}

export const EDIT_WINDOW_MS = 15 * 60 * 1000;
export const DELETE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
/** E4 — «Reenviar» reaches at most this many chats at once (WhatsApp: 5). */
export const FORWARD_MAX_CHATS = 5;
const SEARCH_MAX = 30;

/** E4 — a reaction is one emoji (with its skin tone or joined sequence), never text. */
const EMOJI =
  /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\u{FE0F}|\u{200D}|\p{Emoji_Modifier}|\p{Extended_Pictographic}|\p{Regional_Indicator})*$/u;
export function isReactionEmoji(value: string): boolean {
  return value.length <= 32 && EMOJI.test(value);
}

/** E4 — what a quoted message is, for the line above the reply. */
function quotedKind(message: { Attachment: Array<{ mimeType: string }> }): ReplyPreview['tipo'] {
  const mime = message.Attachment[0]?.mimeType;
  if (!mime) return 'texto';
  if (mime === ORDER_CARD_MIME) return 'pedido';
  if (mime === PRODUCT_CARD_MIME) return 'producto';
  if (mime === LINK_PREVIEW_MIME) return 'texto';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return mime.startsWith('image/') ? 'imagen' : 'archivo';
}

/** E4 — the reactions of a message grouped by emoji, most used first. */
export function groupReactions(
  reactions: Array<{ emoji: string; userId: string | null; customerId: string | null }>,
  viewer: { userId: string | null; customerId: string | null },
): ReactionGroup[] {
  const groups = new Map<string, ReactionGroup>();
  for (const r of reactions) {
    const group = groups.get(r.emoji) ?? { emoji: r.emoji, cantidad: 0, mia: false, autores: [] };
    group.cantidad += 1;
    group.autores.push({ userId: r.userId, customerId: r.customerId });
    if (
      (viewer.userId !== null && r.userId === viewer.userId) ||
      (viewer.customerId !== null && r.customerId === viewer.customerId)
    ) {
      group.mia = true;
    }
    groups.set(r.emoji, group);
  }
  return [...groups.values()].sort((a, b) => b.cantidad - a.cantidad);
}

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessContext: BusinessContextService,
    @Optional() private readonly storeService?: StoreService,
    private readonly cartService?: CartService,
  ) {}

  async createConversation(auth: AuthenticatedUser, dto: CreateConversationDto) {
    const context = await this.resolveContext(auth);
    const actor = this.actorFromContext(context);

    const requestedUsers = dto.participantUserIds ?? [];
    const requestedCustomers = dto.participantCustomerIds ?? [];

    if (requestedUsers.length + requestedCustomers.length === 0) {
      throw new ConflictException('La conversación requiere participantes');
    }

    if (
      dto.type === ConversationTypeDto.DIRECT &&
      requestedUsers.length + requestedCustomers.length !== 1
    ) {
      throw new ConflictException('Una conversación DIRECT requiere exactamente otro participante');
    }

    if (
      dto.type === ConversationTypeDto.GROUP &&
      requestedUsers.length + requestedCustomers.length + 1 > MAX_GROUP_PARTICIPANTS
    ) {
      throw new ConflictException('Una conversación GROUP no puede superar 50 participantes');
    }

    return this.prisma.$transaction(
      async (tx) => {
        await this.assertParticipantsBelongToBusiness(
          tx,
          context.businessId,
          requestedUsers,
          requestedCustomers,
        );

        const conversation = await tx.conversation.create({
          data: {
            businessId: context.businessId,
            type: dto.type as MessagingConversationType,
          },
        });

        await tx.conversationParticipant.create({
          data: {
            conversationId: conversation.id,
            businessId: context.businessId,
            ...actor,
            isAdmin: true,
          },
        });

        for (const userId of requestedUsers) {
          await tx.conversationParticipant.create({
            data: {
              conversationId: conversation.id,
              businessId: context.businessId,
              userId,
            },
          });
        }

        for (const customerId of requestedCustomers) {
          await tx.conversationParticipant.create({
            data: {
              conversationId: conversation.id,
              businessId: context.businessId,
              customerId,
            },
          });

          // P2: starting a conversation from a Customer establishes its commercial context.
          await tx.conversationAssociation.create({
            data: {
              conversationId: conversation.id,
              businessId: context.businessId,
              entityType: MessagingAssociationType.CUSTOMER,
              entityId: customerId,
              changedBy: context.userId,
              reason: 'Asociación automática al crear la conversación',
            },
          });
        }

        return this.getConversationForActor(tx, conversation.id, context);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async createTextMessage(
    auth: AuthenticatedUser,
    conversationId: string,
    clientMessageId: string,
    content: string,
    replyToMessageId?: string,
  ) {
    const context = await this.resolveContext(auth);
    return this.prisma.$transaction(
      async (tx) => {
        const conversation = await tx.conversation.findFirst({
          where: { id: conversationId, businessId: context.businessId, deletedAt: null },
        });
        if (!conversation) throw new NotFoundException('Conversación no encontrada');
        const participant = await this.assertActiveParticipant(tx, conversationId, context);

        if (replyToMessageId) {
          // E4: only a message the writer can see (not deleted, not from before they joined).
          const parent = await tx.message.findFirst({
            where: {
              id: replyToMessageId,
              conversationId,
              businessId: context.businessId,
              deletedAt: null,
              ...(canReadAllConversations(context)
                ? {}
                : { createdAt: { gte: participant.joinedAt } }),
            },
          });
          if (!parent) throw new NotFoundException('Mensaje de respuesta no encontrado');
        }

        // Idempotency (contract C-MSG-002 "no duplicados"): `clientMessageId` is
        // the client's retry key. A retry of the SAME send must resolve to the
        // same message, not to an error -- a 409 leaves the client unable to
        // tell "my message was lost" from "my message is already there", which
        // is exactly the ambiguous state the retry key exists to prevent.
        //
        // Checked BEFORE allocating a sequence: a retry must not consume one,
        // and the two lookups stay independent of each other.
        //
        // The uniqueness is per (conversation, clientMessageId, author), so a
        // pre-check cannot be trusted on its own: two concurrent retries can
        // both miss it. The authority is the DB constraint, and the P2002 below
        // resolves the race by returning the already-persisted row. Same-key-
        // different-content is NOT a retry but a client bug, and fails loudly.
        const existing = await this.findMessageByClientKey(
          tx,
          conversationId,
          context,
          clientMessageId,
        );
        if (existing) {
          return this.assertSameContentOrConflict(existing, content, replyToMessageId);
        }

        const last = await tx.message.findFirst({
          where: { conversationId, businessId: context.businessId },
          orderBy: { sequence: 'desc' },
          select: { sequence: true },
        });
        const sequence = (last?.sequence ?? BigInt(0)) + BigInt(1);

        try {
          return await tx.message.create({
            data: {
              conversationId,
              businessId: context.businessId,
              ...this.messageAuthorFromContext(context),
              sequence,
              clientMessageId,
              type: 'TEXT',
              content,
              replyToMessageId,
            },
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const target = (error.meta as { target?: string[] } | undefined)?.target ?? [];
            // `(conversationId, sequence)` losing a race is a concurrency
            // collision, not a duplicate send: the caller may retry and will get
            // the next sequence. Surfacing it as "duplicate clientMessageId"
            // would be a false diagnosis.
            if (target.includes('sequence')) {
              throw new ConflictException(
                'Otro mensaje tomó esa posición en la conversación; reintentá el envío',
              );
            }

            const concurrent = await this.findMessageByClientKey(
              tx,
              conversationId,
              context,
              clientMessageId,
            );
            if (concurrent) {
              return this.assertSameContentOrConflict(concurrent, content, replyToMessageId);
            }
            throw new ConflictException(
              'El clientMessageId ya fue utilizado en esta conversación por el actor',
            );
          }
          throw error;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * Paquete 1 F2 — the newest PAGE_SIZE messages (oldest first), or those before `before` (a
   * sequence) when the screen asks for older ones: a months-long chat never loads whole. A
   * full page means there may be more above.
   */
  async getMessages(
    auth: AuthenticatedUser,
    conversationId: string,
    { before, limit = MESSAGES_PAGE }: { before?: string; limit?: number } = {},
  ) {
    const context = await this.resolveContext(auth);
    const canReadAll = canReadAllConversations(context);
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, businessId: context.businessId, deletedAt: null },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');

    let joinedAt: Date | undefined;
    if (!canReadAll) {
      const participant = await this.assertActiveParticipant(this.prisma, conversationId, context);
      joinedAt = participant.joinedAt;
    }

    const take = Math.min(Math.max(Math.trunc(limit) || MESSAGES_PAGE, 1), MESSAGES_PAGE_MAX);
    let beforeSequence: bigint | undefined;
    if (before !== undefined && before !== '') {
      if (!/^\d{1,19}$/.test(before)) throw new BadRequestException('Página inválida');
      beforeSequence = BigInt(before);
    }
    const messages = (
      await this.prisma.message.findMany({
        // E4: deleted messages stay in place («Se eliminó este mensaje»), without what they said.
        where: {
          conversationId,
          businessId: context.businessId,
          ...(joinedAt ? { createdAt: { gte: joinedAt } } : {}),
          ...(beforeSequence !== undefined ? { sequence: { lt: beforeSequence } } : {}),
        },
        orderBy: { sequence: 'desc' },
        take,
        include: {
          Reaction: true,
          Attachment: true,
          MessageStar: { where: { userId: context.userId ?? '-' }, select: { id: true } },
        },
      })
    ).reverse();
    await this.withOrderCards(messages, context.businessId);
    return this.withTicks(
      await this.withQuotesAndReactions(messages, context, joinedAt),
      conversationId,
      context,
    );
  }

  /**
   * E4 — what a bubble needs besides itself: the quoted message as a short preview (only when
   * the viewer may see it), its reactions grouped by emoji, whether the viewer starred it, and
   * nothing of what a deleted message said or showed.
   */
  private async withQuotesAndReactions<
    T extends {
      deletedAt: Date | null;
      replyToMessageId: string | null;
      content: string | null;
      Attachment: unknown[];
      Reaction: Array<{ emoji: string; userId: string | null; customerId: string | null }>;
      MessageStar?: unknown[];
    },
  >(messages: T[], context: BusinessContext, joinedAt?: Date) {
    const quotedIds = [
      ...new Set(messages.map((m) => m.replyToMessageId).filter((id): id is string => !!id)),
    ];
    const quoted = quotedIds.length
      ? await this.prisma.message.findMany({
          where: {
            id: { in: quotedIds },
            businessId: context.businessId,
            ...(joinedAt ? { createdAt: { gte: joinedAt } } : {}),
          },
          select: {
            id: true,
            content: true,
            deletedAt: true,
            authorUserId: true,
            authorCustomerId: true,
            Attachment: { where: { deletedAt: null }, select: { mimeType: true } },
          },
        })
      : [];
    const byId = new Map(quoted.map((q) => [q.id, q]));
    return messages.map((m) => {
      const q = m.replyToMessageId ? byId.get(m.replyToMessageId) : undefined;
      const respuesta: ReplyPreview | undefined = q && {
        id: q.id,
        autorUserId: q.authorUserId,
        autorCustomerId: q.authorCustomerId,
        mia:
          (context.userId !== null && q.authorUserId === context.userId) ||
          (context.customerId !== null && q.authorCustomerId === context.customerId),
        tipo: q.deletedAt ? 'texto' : quotedKind(q),
        texto: q.deletedAt ? null : (q.content ?? '').slice(0, 160),
        ...(q.deletedAt ? { eliminado: true as const } : {}),
      };
      return {
        ...m,
        ...(m.deletedAt ? { content: null, Attachment: [] as T['Attachment'] } : {}),
        reacciones: m.deletedAt ? [] : groupReactions(m.Reaction, context),
        destacado: !m.deletedAt && (m.MessageStar?.length ?? 0) > 0,
        ...(respuesta ? { respuesta } : {}),
      };
    });
  }

  /**
   * OR-B4-053 — an order card shows the order as it is now (number, state, total, products),
   * not as it was when the card was posted: its attachment is filled from the order on read.
   */
  private async withOrderCards(
    messages: Array<{ Attachment: Array<{ mimeType: string; metadata: Prisma.JsonValue }> }>,
    businessId: string,
  ) {
    const cards = messages
      .flatMap((m) => m.Attachment)
      .filter((a) => a.mimeType === ORDER_CARD_MIME);
    if (cards.length === 0) return;
    const ids = cards.map((a) => String((a.metadata as { pedidoId?: string })?.pedidoId ?? ''));
    const orders = await this.prisma.pedido.findMany({
      where: { id: { in: ids }, empresaId: businessId },
      select: {
        id: true,
        numero: true,
        estado: true,
        total: true,
        PedidoItem: {
          select: { cantidad: true, Producto: { select: { nombre: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    const byId = new Map(orders.map((o) => [o.id, o]));
    for (const card of cards) {
      const meta = (card.metadata ?? {}) as Record<string, unknown>;
      const order = byId.get(String(meta.pedidoId ?? ''));
      if (!order) continue;
      card.metadata = {
        ...meta,
        numero: order.numero,
        estado: order.estado,
        total: order.total.toFixed(2),
        items: order.PedidoItem.map((i) => ({
          producto: i.Producto.nombre,
          cantidad: Number(i.cantidad),
        })),
      };
    }
  }

  /**
   * E2 — the ticks of the viewer's own messages, like WhatsApp: ✓ saved (`enviado`), ✓✓ it
   * reached the screen of every other participant (`entregado`), blue ✓✓ every other
   * participant read it (`leido`). Blue needs read receipts on for both sides (mutual, like
   * WhatsApp): whoever turned them off neither shows nor sees reads. Others' messages carry no
   * state.
   */
  private async withTicks<
    T extends { authorUserId: string | null; authorCustomerId: string | null; createdAt: Date },
  >(
    messages: T[],
    conversationId: string,
    context: BusinessContext,
  ): Promise<Array<T & { estado?: MessageTick }>> {
    const own = (m: T) =>
      (context.userId !== null && m.authorUserId === context.userId) ||
      (context.customerId !== null && m.authorCustomerId === context.customerId);
    if (!messages.some(own)) return messages;

    const others = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        businessId: context.businessId,
        leftAt: null,
        removedAt: null,
        ...notThisActor(context, 'userId', 'customerId'),
      },
      select: { userId: true, customerId: true, ConversationReadState: true },
    });
    const actors = [context, ...others];
    const turnedOff = await this.prisma.messagingReadPreference.findMany({
      where: {
        businessId: context.businessId,
        enabled: false,
        OR: actors.map((a) => (a.userId ? { userId: a.userId } : { customerId: a.customerId })),
      },
      select: { userId: true, customerId: true },
    });
    const off = (actor: { userId: string | null; customerId: string | null }) =>
      turnedOff.some(
        (p) =>
          (actor.userId !== null && p.userId === actor.userId) ||
          (actor.customerId !== null && p.customerId === actor.customerId),
      );
    const readsShown = actors.every((actor) => !off(actor));

    return messages.map((message) => {
      if (!own(message)) return message;
      if (others.length === 0) return { ...message, estado: 'enviado' as const };
      const reached = (at: Date | null | undefined) => Boolean(at && at >= message.createdAt);
      const read = others.every((o) => reached(o.ConversationReadState?.lastReadAt));
      const delivered =
        read || others.every((o) => reached(o.ConversationReadState?.lastDeliveredAt));
      let estado: MessageTick = 'enviado';
      if (read && readsShown) estado = 'leido';
      else if (delivered) estado = 'entregado';
      return { ...message, estado };
    });
  }

  // Note for the raw SQL below: «is the author this participant?» uses IS NOT DISTINCT FROM,
  // because a plain `=` against the other kind of author (a customer's message has no
  // authorUserId) gives NULL, and NOT NULL would silently drop the message.
  /**
   * E2 — the actor's screen loaded its conversations (or one of them): every message from
   * others reached it (✓✓). Moves only forward. Returns the conversations whose position
   * moved, to tell their senders.
   */
  async markDelivered(auth: AuthenticatedUser, conversationId?: string): Promise<string[]> {
    const context = await this.resolveContext(auth);
    const only = conversationId ?? null;
    const rows = await this.prisma.$queryRaw<Array<{ conversationId: string }>>`
      WITH latest AS (
        SELECT p.id AS "participantId", p."conversationId", max(m."createdAt") AS at
        FROM "ConversationParticipant" p
        JOIN "Message" m ON m."conversationId" = p."conversationId" AND m."businessId" = p."businessId"
        WHERE p."businessId" = ${context.businessId}
          AND p."leftAt" IS NULL AND p."removedAt" IS NULL
          AND (p."userId" = ${context.userId} OR p."customerId" = ${context.customerId})
          AND (${only}::text IS NULL OR p."conversationId" = ${only})
          AND m."deletedAt" IS NULL AND m."createdAt" >= p."joinedAt"
          AND NOT ((p."userId" IS NOT NULL AND m."authorUserId" IS NOT DISTINCT FROM p."userId")
                OR (p."customerId" IS NOT NULL AND m."authorCustomerId" IS NOT DISTINCT FROM p."customerId"))
        GROUP BY p.id, p."conversationId"
      ), moved AS (
        INSERT INTO "ConversationReadState" (id, "participantId", "businessId", "lastDeliveredAt", "updatedAt")
        SELECT gen_random_uuid()::text, l."participantId", ${context.businessId}, l.at, now() FROM latest l
        ON CONFLICT ("participantId", "businessId") DO UPDATE
          SET "lastDeliveredAt" = EXCLUDED."lastDeliveredAt", "updatedAt" = now()
          WHERE "ConversationReadState"."lastDeliveredAt" IS NULL
             OR "ConversationReadState"."lastDeliveredAt" < EXCLUDED."lastDeliveredAt"
        RETURNING "participantId"
      )
      SELECT l."conversationId" FROM latest l JOIN moved ON moved."participantId" = l."participantId"`;
    return rows.map((row) => row.conversationId);
  }

  /**
   * E2 — the participant read up to `upTo` (a message's creation time): moves their read
   * position, and the delivered one with it. Independent of read receipts. True when it moved.
   */
  private async advanceReadPosition(
    tx: Prisma.TransactionClient | PrismaService,
    participant: { id: string; businessId: string },
    upTo: Date,
  ): Promise<boolean> {
    const moved = await tx.$executeRaw`
      INSERT INTO "ConversationReadState" (id, "participantId", "businessId", "lastDeliveredAt", "lastReadAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${participant.id}, ${participant.businessId}, ${upTo}, ${upTo}, now())
      ON CONFLICT ("participantId", "businessId") DO UPDATE
        SET "lastReadAt" = EXCLUDED."lastReadAt",
            "lastDeliveredAt" = GREATEST("ConversationReadState"."lastDeliveredAt", EXCLUDED."lastDeliveredAt"),
            "updatedAt" = now()
        WHERE "ConversationReadState"."lastReadAt" IS NULL
           OR "ConversationReadState"."lastReadAt" < EXCLUDED."lastReadAt"`;
    return moved > 0;
  }

  /**
   * E2 — messages from others the actor has not read, per conversation they take part in
   * (an Owner reading without participating has nothing unread there, like WhatsApp).
   */
  private async unreadByConversation(context: BusinessContext): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRaw<Array<{ conversationId: string; unread: number }>>`
      SELECT p."conversationId", count(m.id)::int AS unread
      FROM "ConversationParticipant" p
      JOIN "Conversation" c ON c.id = p."conversationId" AND c."businessId" = p."businessId" AND c."deletedAt" IS NULL
      LEFT JOIN "ConversationReadState" s ON s."participantId" = p.id
      JOIN "Message" m ON m."conversationId" = p."conversationId" AND m."businessId" = p."businessId"
      WHERE p."businessId" = ${context.businessId}
        AND p."leftAt" IS NULL AND p."removedAt" IS NULL
        AND (p."userId" = ${context.userId} OR p."customerId" = ${context.customerId})
        AND m."deletedAt" IS NULL AND m."createdAt" >= p."joinedAt"
        AND m."createdAt" > COALESCE(s."lastReadAt", '-infinity'::timestamp)
        AND NOT ((p."userId" IS NOT NULL AND m."authorUserId" IS NOT DISTINCT FROM p."userId")
              OR (p."customerId" IS NOT NULL AND m."authorCustomerId" IS NOT DISTINCT FROM p."customerId"))
        -- E6b: what the store sent by itself is news for the customer, not for the team.
        AND NOT (p."userId" IS NOT NULL AND m."automatic")
      GROUP BY p."conversationId"`;
    return new Map(rows.map((row) => [row.conversationId, Number(row.unread)]));
  }

  /**
   * E2 — for the panel menu, the tab title and the notification: how many unread messages
   * the actor has, and the newest one (who and a preview). Content only of conversations
   * the actor takes part in.
   */
  async unreadSummary(auth: AuthenticatedUser) {
    const context = await this.resolveContext(auth);
    const unread = await this.unreadByConversation(context);
    // E6a: a muted chat does not ring nor count in the menu (it keeps its count in the inbox).
    if (context.userId && unread.size > 0) {
      const muted = await this.prisma.conversationPreference.findMany({
        where: {
          businessId: context.businessId,
          userId: context.userId,
          conversationId: { in: [...unread.keys()] },
          mutedUntil: { gt: new Date() },
        },
        select: { conversationId: true },
      });
      for (const row of muted) unread.delete(row.conversationId);
    }
    const total = [...unread.values()].reduce((sum, n) => sum + n, 0);
    if (total === 0) return { total, conversations: 0, latest: null };

    const newest = await this.prisma.message.findFirst({
      where: {
        businessId: context.businessId,
        conversationId: { in: [...unread.keys()] },
        deletedAt: null,
        ...notThisActor(context, 'authorUserId', 'authorCustomerId'),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        conversationId: true,
        content: true,
        createdAt: true,
        authorUserId: true,
        authorCustomerId: true,
        Attachment: { where: { deletedAt: null }, select: { mimeType: true, filename: true } },
      },
    });
    let authorName = 'Alguien del equipo';
    if (newest?.authorCustomerId) {
      const customer = await this.prisma.cliente.findFirst({
        where: { id: newest.authorCustomerId, empresaId: context.businessId },
        select: { nombre: true },
      });
      authorName = customer?.nombre ?? 'Un cliente';
    } else if (newest?.authorUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: newest.authorUserId },
        select: { nombre: true },
      });
      authorName = user?.nombre ?? authorName;
    }
    return {
      total,
      conversations: unread.size,
      latest: newest
        ? {
            id: newest.id,
            conversationId: newest.conversationId,
            authorName,
            preview: notificationPreview(newest),
            createdAt: newest.createdAt,
          }
        : null,
    };
  }

  async editMessage(
    auth: AuthenticatedUser,
    conversationId: string,
    messageId: string,
    content: string,
  ) {
    const context = await this.resolveContext(auth);
    await this.assertActiveParticipant(this.prisma, conversationId, context);

    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId, businessId: context.businessId, deletedAt: null },
    });
    if (!message) throw new NotFoundException('Mensaje no encontrado');
    // Paquete 1 S3: what the system posted (an order or return notice) is nobody's to change.
    if (message.type === 'SYSTEM') {
      throw new ForbiddenException('Los avisos automáticos no se editan');
    }

    const isAuthor =
      (context.userId !== null && message.authorUserId === context.userId) ||
      (context.customerId !== null && message.authorCustomerId === context.customerId);
    if (!isAuthor) throw new ForbiddenException('Solo el autor puede editar el mensaje');
    // E4: like WhatsApp — only typed text, not a forwarded one, and for 15 minutes.
    if (message.type !== 'TEXT' || message.forwarded) {
      throw new ForbiddenException('Solo se pueden editar los mensajes de texto que escribiste');
    }
    if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW_MS) {
      throw new ForbiddenException('Pasaron más de 15 minutos: el mensaje ya no se puede editar');
    }

    // E5: the old link's preview goes; the controller asks for the new one.
    const [updated] = await this.prisma.$transaction([
      this.prisma.message.update({
        where: { id: messageId },
        data: { content, editedAt: new Date() },
      }),
      this.prisma.attachment.updateMany({
        where: {
          messageId,
          businessId: context.businessId,
          mimeType: LINK_PREVIEW_MIME,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      }),
    ]);
    return updated;
  }

  async deleteMessage(auth: AuthenticatedUser, conversationId: string, messageId: string) {
    const context = await this.resolveContext(auth);
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId, businessId: context.businessId, deletedAt: null },
    });
    if (!message) throw new NotFoundException('Mensaje no encontrado');
    if (message.type === 'SYSTEM') {
      throw new ForbiddenException('Los avisos automáticos no se borran');
    }

    const isAuthor =
      (context.userId !== null && message.authorUserId === context.userId) ||
      (context.customerId !== null && message.authorCustomerId === context.customerId);
    if (!isAuthor) {
      await this.assertConversationAdmin(this.prisma, conversationId, context);
    } else {
      // Author must still be an active participant to edit/delete their own message
      await this.assertActiveParticipant(this.prisma, conversationId, context);
      // E4: like WhatsApp, «Eliminar para todos» lasts 2 days (a conversation admin moderates
      // without a limit).
      if (Date.now() - message.createdAt.getTime() > DELETE_WINDOW_MS) {
        throw new ForbiddenException(
          'Pasaron más de 2 días: el mensaje ya no se puede eliminar para todos',
        );
      }
    }

    // E4: what it said or showed goes for good; the bubble stays as «Se eliminó este mensaje».
    const deletedAt = new Date();
    const [deleted] = await this.prisma.$transaction([
      this.prisma.message.update({
        where: { id: messageId },
        data: { deletedAt, deletedByUserId: context.userId ?? null, content: null },
      }),
      this.prisma.attachment.updateMany({
        where: { messageId, businessId: context.businessId, deletedAt: null },
        data: { deletedAt, metadata: Prisma.DbNull },
      }),
      this.prisma.reaction.deleteMany({ where: { messageId, businessId: context.businessId } }),
    ]);
    return deleted;
  }

  /**
   * Team members a staff actor can start a conversation with: ACTIVE Memberships of the
   * actor's own Business (same rule createConversation enforces). Ids are canonical User
   * ids, the ones `participantUserIds` expects. Customers are not listed here; they come
   * from /clientes under its own permission.
   */
  /**
   * OR-B4-037 — the Business's quick replies (Empresa.configuracion.respuestasRapidas): one
   * list for the whole team; Owner and Admin (MESSAGING_MANAGE) replace it.
   */
  async getQuickReplies(auth: AuthenticatedUser) {
    const context = await this.resolveContext(auth);
    if (!context.userId) throw new ForbiddenException('Solo el equipo del negocio');
    const business = await this.prisma.empresa.findUnique({
      where: { id: context.businessId },
      select: { configuracion: true },
    });
    const raw = ((business?.configuracion ?? {}) as { respuestasRapidas?: unknown })
      .respuestasRapidas;
    const items = Array.isArray(raw)
      ? raw
          .filter(
            (r): r is { titulo: string; texto: string } =>
              typeof r === 'object' &&
              r !== null &&
              typeof (r as { titulo?: unknown }).titulo === 'string' &&
              typeof (r as { texto?: unknown }).texto === 'string',
          )
          .map((r) => ({ titulo: r.titulo, texto: r.texto }))
      : [];
    return { items, puedeEditar: hasCanonicalPermission(context.role, 'MESSAGING_MANAGE') };
  }

  async setQuickReplies(auth: AuthenticatedUser, items: Array<{ titulo: string; texto: string }>) {
    const context = await this.resolveContext(auth);
    if (!context.userId || !hasCanonicalPermission(context.role, 'MESSAGING_MANAGE')) {
      throw new ForbiddenException('Requiere el permiso MESSAGING_MANAGE');
    }
    const clean = items
      .map((r) => ({ titulo: r.titulo.trim(), texto: r.texto.trim() }))
      .filter((r) => r.titulo && r.texto);
    await this.prisma.$transaction(async (tx) => {
      const business = await tx.empresa.findUniqueOrThrow({
        where: { id: context.businessId },
        select: { configuracion: true },
      });
      const config = {
        ...((business.configuracion ?? {}) as Record<string, unknown>),
        respuestasRapidas: clean,
      };
      await tx.empresa.update({
        where: { id: context.businessId },
        data: { configuracion: config as Prisma.InputJsonValue },
      });
    });
    return this.getQuickReplies(auth);
  }

  /** E6b — the greeting, the away message and the opening hours (the team reads them). */
  async getAutoReplies(auth: AuthenticatedUser) {
    const context = await this.resolveContext(auth);
    if (!context.userId) throw new ForbiddenException('Solo el equipo del negocio');
    const business = await this.prisma.empresa.findUnique({
      where: { id: context.businessId },
      select: { configuracion: true },
    });
    return {
      ...autoRepliesOf(business?.configuracion ?? null),
      puedeEditar: hasCanonicalPermission(context.role, 'MESSAGING_MANAGE'),
    };
  }

  /** E6b — Owner/Admin save the automatic messages (checked here whatever the route guard). */
  async setAutoReplies(auth: AuthenticatedUser, value: AutoReplies) {
    const context = await this.resolveContext(auth);
    if (!context.userId || !hasCanonicalPermission(context.role, 'MESSAGING_MANAGE')) {
      throw new ForbiddenException('Solo el dueño o un administrador');
    }
    const clean: AutoReplies = {
      bienvenida: { activo: value.bienvenida.activo, texto: value.bienvenida.texto.trim() },
      ausencia: { activo: value.ausencia.activo, texto: value.ausencia.texto.trim() },
      horario: autoRepliesOf({ mensajesAutomaticos: { horario: value.horario } }).horario,
    };
    const problem = autoRepliesProblem(clean);
    if (problem) throw new BadRequestException(problem);
    await this.prisma.$transaction(async (tx) => {
      const business = await tx.empresa.findUniqueOrThrow({
        where: { id: context.businessId },
        select: { configuracion: true },
      });
      const config = {
        ...((business.configuracion ?? {}) as Record<string, unknown>),
        mensajesAutomaticos: clean,
      };
      await tx.empresa.update({
        where: { id: context.businessId },
        data: { configuracion: config as Prisma.InputJsonValue },
      });
    });
    return this.getAutoReplies(auth);
  }

  /**
   * E6b — after a customer's message: the greeting and/or the away message when they are due
   * (auto-replies.ts). Returns what was posted, for the open screens. Never throws: a failure
   * must not turn the customer's sent message into an error.
   */
  async autoRepliesAfter(
    auth: AuthenticatedUser,
    message: { id: string; conversationId: string; createdAt: Date },
  ) {
    try {
      const context = await this.resolveContext(auth);
      if (!context.customerId) return [];
      const business = await this.prisma.empresa.findUnique({
        where: { id: context.businessId },
        select: { configuracion: true },
      });
      const settings = autoRepliesOf(business?.configuracion ?? null);
      if (!settings.bienvenida.activo && !settings.ausencia.activo) return [];
      const [previous, lastAway] = await Promise.all([
        this.prisma.message.findFirst({
          where: {
            conversationId: message.conversationId,
            businessId: context.businessId,
            authorCustomerId: context.customerId,
            createdAt: { lt: message.createdAt },
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
        this.prisma.message.findFirst({
          where: {
            conversationId: message.conversationId,
            businessId: context.businessId,
            automatic: true,
            clientMessageId: { startsWith: 'auto:ausencia:' },
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);
      const due = autoRepliesDue(settings, {
        now: new Date(),
        previousCustomerMessageAt: previous?.createdAt ?? null,
        lastAwayAt: lastAway?.createdAt ?? null,
      });
      const posted = [];
      for (const kind of due) {
        const text = kind === 'bienvenida' ? settings.bienvenida.texto : settings.ausencia.texto;
        const sent = await this.postAutomatic(
          context.businessId,
          message.conversationId,
          `auto:${kind}:${message.id}`,
          text,
        );
        if (sent) posted.push(sent);
      }
      return posted;
    } catch {
      return [];
    }
  }

  /** E6b — one automatic message from the store, written as the chat's owner. Idempotent by key. */
  private async postAutomatic(
    businessId: string,
    conversationId: string,
    key: string,
    text: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const exists = await tx.message.findFirst({
          where: { conversationId, businessId, clientMessageId: key, automatic: true },
          select: { id: true },
        });
        if (exists) return null;
        const owner =
          (await tx.conversationParticipant.findFirst({
            where: {
              conversationId,
              businessId,
              userId: { not: null },
              isAdmin: true,
              leftAt: null,
              removedAt: null,
            },
            orderBy: { joinedAt: 'asc' },
            select: { userId: true },
          })) ??
          (await tx.conversationParticipant.findFirst({
            where: {
              conversationId,
              businessId,
              userId: { not: null },
              leftAt: null,
              removedAt: null,
            },
            orderBy: { joinedAt: 'asc' },
            select: { userId: true },
          }));
        if (!owner?.userId) return null;
        const last = await tx.message.findFirst({
          where: { conversationId, businessId },
          orderBy: { sequence: 'desc' },
          select: { sequence: true },
        });
        const created = await tx.message.create({
          data: {
            conversationId,
            businessId,
            authorUserId: owner.userId,
            sequence: (last?.sequence ?? BigInt(0)) + BigInt(1),
            clientMessageId: key,
            type: 'TEXT',
            content: text,
            automatic: true,
          },
          include: { Attachment: true },
        });
        await tx.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * E6b — what the customer sees of the store in its chat: its description, hours, address and
   * phone (Ajustes), and whether it is open now (null when it has no hours loaded).
   */
  async storeProfile(auth: AuthenticatedUser) {
    const context = await this.resolveContext(auth);
    const business = await this.prisma.empresa.findUnique({
      where: { id: context.businessId },
      select: { configuracion: true },
    });
    const contact = contactOf(business?.configuracion ?? null);
    const { horario } = autoRepliesOf(business?.configuracion ?? null);
    return { ...contact, abiertoAhora: isOpenAt(horario, new Date()) };
  }

  /**
   * E6b «+ Productos» — the store customer sends a product of the store (published and
   * active) to ask about it; the card shows the price they pay.
   */
  async sendCustomerProductCard(
    auth: AuthenticatedUser,
    clientMessageId: string,
    productoId: string,
  ) {
    const context = await this.resolveContext(auth);
    if (!context.customerId) throw new ForbiddenException('Solo para clientes');
    const product = await this.prisma.producto.findFirst({
      where: { id: productoId, empresaId: context.businessId, activo: true, publicado: true },
      select: { id: true, nombre: true, precioMinorista: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const precio = String(product.precioMinorista);
    const precioFinal =
      (await this.storeService
        ?.customerUnitPrice(context.businessId, product.id, context.customerId)
        .catch(() => null)) ?? precio;
    const conversationId = await this.ensureCustomerConversation(context);
    const message = await this.createTextMessage(
      auth,
      conversationId,
      clientMessageId,
      `${product.nombre} · $ ${Number(precioFinal).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    );
    const existing = await this.prisma.attachment.findFirst({
      where: { messageId: message.id, mimeType: PRODUCT_CARD_MIME },
    });
    if (!existing) {
      await this.prisma.attachment.create({
        data: {
          businessId: context.businessId,
          messageId: message.id,
          storageKey: `producto:${product.id}`,
          filename: product.nombre,
          mimeType: PRODUCT_CARD_MIME,
          sizeBytes: BigInt(0),
          metadata: { productoId: product.id, nombre: product.nombre, precio, precioFinal },
        },
      });
    }
    return this.prisma.message.findUniqueOrThrow({
      where: { id: message.id },
      include: { Attachment: true },
    });
  }

  async listContacts(auth: AuthenticatedUser) {
    const context = await this.resolveContext(auth);
    if (!context.userId)
      throw new ForbiddenException('Solo el equipo del negocio puede ver contactos');
    const memberships = await this.prisma.membership.findMany({
      where: { businessId: context.businessId, status: MembershipStatus.ACTIVE },
      select: { userId: true, role: true, User: { select: { nombre: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      userId: m.userId,
      name: m.User.nombre,
      role: m.role,
      isViewer: m.userId === context.userId,
    }));
  }

  /**
   * STORE-V1-04 — the store customer's chat with the Business: their most recently active
   * conversation (one the team opened with them, or one they started). Only messages from
   * when they joined, reduced to what a customer may see: no staff ids, no internal fields.
   */
  async getCustomerChat(auth: AuthenticatedUser, before?: string) {
    const context = await this.resolveContext(auth);
    if (!context.customerId) throw new ForbiddenException('Solo para clientes');
    const conversationId = await this.findCustomerConversationId(this.prisma, context);
    if (!conversationId) return { conversationId: null, messages: [] };
    // Paquete 1 F2: the customer pages by the id of the oldest message they have (a customer
    // never sees sequences).
    let beforeSequence: string | undefined;
    if (before) {
      const oldest = await this.prisma.message.findFirst({
        where: { id: before, conversationId, businessId: context.businessId },
        select: { sequence: true },
      });
      if (!oldest) throw new BadRequestException('Página inválida');
      beforeSequence = oldest.sequence.toString();
    }
    const messages = await this.getMessages(auth, conversationId, { before: beforeSequence });
    return {
      conversationId,
      // Paquete 1 F2: a full page — there may be older messages to load.
      hayMas: messages.length === MESSAGES_PAGE,
      messages: messages.map((m) => ({
        id: m.id,
        clientMessageId: m.clientMessageId,
        content: m.content,
        createdAt: m.createdAt,
        mine: m.authorCustomerId === context.customerId,
        // E2: ticks of the customer's own messages.
        ...(m.estado ? { estado: m.estado } : {}),
        // OR-B4-037: product cards (and later photos) the team shared.
        adjuntos: toMessageWire(m).adjuntos ?? [],
        // OR-B4-053: an order or return update the system posted (a short centred line).
        ...(toMessageWire(m).aviso ? { aviso: true } : {}),
        // E4: deleted, edited, the quoted message and the reactions — never a staff id.
        ...(m.deletedAt ? { eliminado: true } : {}),
        ...(m.editedAt && !m.deletedAt ? { editado: true } : {}),
        // Only typed text of their own can be edited (for 15 minutes; the screen checks the time).
        ...(m.authorCustomerId === context.customerId && m.type === 'TEXT' && !m.forwarded
          ? { editable: true }
          : {}),
        ...(m.forwarded ? { reenviado: true } : {}),
        // E6b: the greeting or the away message the store sends by itself.
        ...(m.automatic ? { automatico: true } : {}),
        ...(m.respuesta
          ? {
              respuesta: {
                id: m.respuesta.id,
                mia: m.respuesta.mia,
                tipo: m.respuesta.tipo,
                texto: m.respuesta.texto,
                ...(m.respuesta.eliminado ? { eliminado: true } : {}),
              },
            }
          : {}),
        reacciones: m.reacciones.map(({ emoji, cantidad, mia }) => ({ emoji, cantidad, mia })),
      })),
    };
  }

  /**
   * E2 — the store customer opened their chat: they read up to the store's newest message.
   * Null when there is nothing from the store yet.
   */
  async markCustomerChatRead(auth: AuthenticatedUser) {
    const context = await this.resolveContext(auth);
    if (!context.customerId) throw new ForbiddenException('Solo para clientes');
    const conversationId = await this.findCustomerConversationId(this.prisma, context);
    if (!conversationId) return null;
    const newest = await this.prisma.message.findFirst({
      where: {
        conversationId,
        businessId: context.businessId,
        deletedAt: null,
        ...notThisActor(context, 'authorUserId', 'authorCustomerId'),
      },
      orderBy: { sequence: 'desc' },
      select: { id: true },
    });
    if (!newest) return null;
    const result = await this.markMessageRead(auth, conversationId, newest.id);
    return { conversationId, messageId: newest.id, ...result };
  }

  /**
   * STORE-V1-04 — a message from the store customer. Without a conversation yet, one is
   * opened DIRECT with the Business Owner (Owner ruling OR-B4-031), who can add teammates;
   * it is associated to the Customer like a conversation started from Clientes.
   */
  async sendCustomerMessage(
    auth: AuthenticatedUser,
    clientMessageId: string,
    content: string,
    replyToMessageId?: string,
  ) {
    const context = await this.resolveContext(auth);
    if (!context.customerId) throw new ForbiddenException('Solo para clientes');
    const conversationId = await this.ensureCustomerConversation(context);
    return this.createTextMessage(auth, conversationId, clientMessageId, content, replyToMessageId);
  }

  /** E4 — the store customer's conversation, for editing, deleting or reacting in it. */
  async customerConversationId(auth: AuthenticatedUser): Promise<string> {
    const context = await this.resolveContext(auth);
    if (!context.customerId) throw new ForbiddenException('Solo para clientes');
    const conversationId = await this.findCustomerConversationId(this.prisma, context);
    if (!conversationId) throw new NotFoundException('Mensaje no encontrado');
    return conversationId;
  }

  /**
   * E4 — a message the actor may see right now: in a conversation they read (every one for
   * MESSAGING_MANAGE, otherwise theirs from when they joined), not deleted.
   */
  private async visibleMessage(
    context: BusinessContext,
    conversationId: string,
    messageId: string,
    { mustParticipate = false }: { mustParticipate?: boolean } = {},
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, businessId: context.businessId, deletedAt: null },
      select: { id: true },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');
    let joinedAt: Date | undefined;
    if (mustParticipate || !canReadAllConversations(context)) {
      const participant = await this.assertActiveParticipant(this.prisma, conversationId, context);
      if (!canReadAllConversations(context)) joinedAt = participant.joinedAt;
    }
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId,
        businessId: context.businessId,
        deletedAt: null,
        ...(joinedAt ? { createdAt: { gte: joinedAt } } : {}),
      },
      include: { Attachment: { where: { deletedAt: null } } },
    });
    if (!message) throw new NotFoundException('Mensaje no encontrado');
    return message;
  }

  /**
   * E4 — reacts to a message (or takes the reaction back with null): one per person and message,
   * choosing another emoji replaces it. Team members and the customer alike, while they take
   * part in the conversation; never on a system notice.
   */
  async reactToMessage(
    auth: AuthenticatedUser,
    conversationId: string,
    messageId: string,
    emoji: string | null,
  ) {
    const context = await this.resolveContext(auth);
    const message = await this.visibleMessage(context, conversationId, messageId, {
      mustParticipate: true,
    });
    if (message.type === 'SYSTEM') {
      throw new ForbiddenException('Los avisos automáticos no llevan reacciones');
    }
    const owner = context.userId
      ? { userId: context.userId }
      : { customerId: context.customerId as string };
    if (emoji === null) {
      await this.prisma.reaction.deleteMany({
        where: { messageId, businessId: context.businessId, ...owner },
      });
    } else {
      if (!isReactionEmoji(emoji)) throw new BadRequestException('Elegí un emoji');
      await this.prisma.reaction.upsert({
        where: context.userId
          ? { messageId_userId: { messageId, userId: context.userId } }
          : { messageId_customerId: { messageId, customerId: context.customerId as string } },
        create: { messageId, businessId: context.businessId, emoji, ...owner },
        update: { emoji, createdAt: new Date() },
      });
    }
    return { id: messageId, conversationId };
  }

  /** E4 — ⭐ a message (or un-star it). Personal: only the team member sees their stars. */
  async setStar(auth: AuthenticatedUser, conversationId: string, messageId: string, on: boolean) {
    const context = await this.resolveContext(auth);
    if (!context.userId) throw new ForbiddenException('Solo el equipo destaca mensajes');
    const userId = context.userId;
    if (!on) {
      await this.prisma.messageStar.deleteMany({
        where: { messageId, userId, businessId: context.businessId },
      });
      return { destacado: false };
    }
    await this.visibleMessage(context, conversationId, messageId);
    await this.prisma.messageStar.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId, businessId: context.businessId },
      update: {},
    });
    return { destacado: true };
  }

  /**
   * E4 — the team member's starred messages, newest star first, from the conversations they
   * still read (a star in a chat they left, or a deleted message, does not show).
   */
  async listStarred(auth: AuthenticatedUser) {
    const context = await this.resolveContext(auth);
    if (!context.userId) throw new ForbiddenException('Solo el equipo destaca mensajes');
    const canReadAll = canReadAllConversations(context);
    const stars = await this.prisma.messageStar.findMany({
      where: {
        businessId: context.businessId,
        userId: context.userId,
        Message: { deletedAt: null, Conversation: { deletedAt: null } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { Message: { include: { Attachment: { where: { deletedAt: null } } } } },
    });
    const joined = canReadAll ? null : await this.joinedAtByConversation(context);
    return stars
      .filter((star) => {
        if (!joined) return true;
        const at = joined.get(star.Message.conversationId);
        return at !== undefined && star.Message.createdAt >= at;
      })
      .map((star) => ({ ...toMessageWire(star.Message), destacadoEl: star.createdAt }));
  }

  /** When the actor joined each conversation they still take part in. */
  private async joinedAtByConversation(context: BusinessContext): Promise<Map<string, Date>> {
    const rows = await this.prisma.conversationParticipant.findMany({
      where: {
        businessId: context.businessId,
        leftAt: null,
        removedAt: null,
        ...(context.userId
          ? { userId: context.userId }
          : { customerId: context.customerId as string }),
      },
      select: { conversationId: true, joinedAt: true },
    });
    return new Map(rows.map((r) => [r.conversationId, r.joinedAt]));
  }

  /**
   * E4 — searches the text of the messages the team member can read, newest first. A few
   * letters at least; deleted messages and system notices are never found.
   */
  async searchMessages(auth: AuthenticatedUser, query: string) {
    const context = await this.resolveContext(auth);
    if (!context.userId) throw new ForbiddenException('Solo para el equipo');
    const term = query.trim();
    if (term.length < 2) return [];
    const joined = canReadAllConversations(context)
      ? null
      : await this.joinedAtByConversation(context);
    if (joined && joined.size === 0) return [];
    const found = await this.prisma.message.findMany({
      where: {
        businessId: context.businessId,
        deletedAt: null,
        type: { in: ['TEXT', 'IMAGE', 'FILE'] },
        content: { contains: term.slice(0, 100), mode: 'insensitive' },
        Conversation: { deletedAt: null },
        ...(joined ? { conversationId: { in: [...joined.keys()] } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: SEARCH_MAX * 2,
      select: {
        id: true,
        conversationId: true,
        content: true,
        createdAt: true,
        authorUserId: true,
        authorCustomerId: true,
      },
    });
    return found
      .filter((m) => !joined || m.createdAt >= (joined.get(m.conversationId) as Date))
      .slice(0, SEARCH_MAX);
  }

  /**
   * E4 — «Reenviar»: a copy of the message in up to five other chats of the Business the team
   * member takes part in, marked «Reenviado». Text, photos and PDFs; never a system notice or a
   * product or order card (those belong to their customer: share the product again instead).
   * Idempotent by clientMessageId per chat.
   */
  async forwardMessage(
    auth: AuthenticatedUser,
    conversationId: string,
    messageId: string,
    clientMessageId: string,
    targets: string[],
  ) {
    const context = await this.resolveContext(auth);
    if (!context.userId) throw new ForbiddenException('Solo el equipo reenvía mensajes');
    const chats = [...new Set(targets)];
    if (chats.length === 0) throw new BadRequestException('Elegí a qué chat reenviarlo');
    if (chats.length > FORWARD_MAX_CHATS) {
      throw new BadRequestException(`Podés reenviar a ${FORWARD_MAX_CHATS} chats a la vez`);
    }
    const source = await this.visibleMessage(context, conversationId, messageId);
    const cards = source.Attachment.some(
      (a) => a.mimeType === PRODUCT_CARD_MIME || a.mimeType === ORDER_CARD_MIME,
    );
    if (source.type === 'SYSTEM' || source.type === 'VOICE' || cards) {
      throw new ForbiddenException('Este mensaje no se puede reenviar');
    }
    const sent = [];
    for (const target of chats) {
      const message = await this.createTextMessage(
        auth,
        target,
        `${clientMessageId}:${target}`,
        source.content ?? source.Attachment[0]?.filename ?? '',
      );
      if (!message.forwarded) {
        await this.prisma.$transaction([
          this.prisma.message.update({
            where: { id: message.id },
            data: { forwarded: true, type: source.type },
          }),
          ...source.Attachment.map((a) =>
            this.prisma.attachment.create({
              data: {
                businessId: context.businessId,
                messageId: message.id,
                storageKey: a.storageKey,
                filename: a.filename,
                mimeType: a.mimeType,
                sizeBytes: a.sizeBytes,
                durationSec: a.durationSec,
                metadata: a.metadata ?? Prisma.DbNull,
              },
            }),
          ),
        ]);
      }
      sent.push(
        await this.prisma.message.findUniqueOrThrow({
          where: { id: message.id },
          include: { Attachment: true },
        }),
      );
    }
    return sent;
  }

  /** The store customer's conversation; without one, it is opened DIRECT with the Owner. */
  private async ensureCustomerConversation(context: BusinessContext): Promise<string> {
    const customerId = context.customerId as string;
    return (
      (await this.findCustomerConversationId(this.prisma, context)) ??
      (await this.prisma.$transaction(
        async (tx) => {
          const existing = await this.findCustomerConversationId(tx, context);
          if (existing) return existing;
          const owner = await tx.membership.findFirst({
            where: {
              businessId: context.businessId,
              role: 'OWNER',
              status: MembershipStatus.ACTIVE,
            },
            orderBy: { createdAt: 'asc' },
            select: { userId: true },
          });
          if (!owner) {
            throw new ConflictException('El comercio todavía no puede recibir mensajes');
          }
          const conversation = await tx.conversation.create({
            data: { businessId: context.businessId, type: MessagingConversationType.DIRECT },
          });
          await tx.conversationParticipant.createMany({
            data: [
              {
                conversationId: conversation.id,
                businessId: context.businessId,
                userId: owner.userId,
                isAdmin: true,
              },
              {
                conversationId: conversation.id,
                businessId: context.businessId,
                customerId,
              },
            ],
          });
          await tx.conversationAssociation.create({
            data: {
              conversationId: conversation.id,
              businessId: context.businessId,
              entityType: MessagingAssociationType.CUSTOMER,
              entityId: customerId,
              reason: 'El cliente escribió desde la tienda',
            },
          });
          return conversation.id;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ))
    );
  }

  /** Where chat files live (a server volume, OR-B4-037); without it uploads are off. */
  private chatStorageDir() {
    const dir = process.env.MESSAGING_STORAGE_DIR;
    if (!dir)
      throw new ServiceUnavailableException(
        'Los archivos en el chat todavía no están habilitados.',
      );
    return dir;
  }

  /**
   * OR-B4-037 — a photo (JPG, PNG, WebP) or a PDF in the conversation, up to 10 MB, from the
   * team or from the store customer (who gets their conversation opened if needed). E5 adds
   * voice notes (from the microphone, `voice`) and videos up to 64 MB. The file is checked by
   * its content, stored outside any web root, and served only through the API to whoever may
   * read the conversation. Idempotent by clientMessageId.
   */
  async sendAttachment(
    auth: AuthenticatedUser,
    conversationId: string | null,
    clientMessageId: string,
    file: { buffer: Buffer; originalname: string; size: number } | undefined,
    caption?: string,
    options: { voice?: boolean; durationSec?: number } = {},
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Elegí un archivo.');
    const kind = sniffChatFile(file.buffer, { voice: options.voice });
    if (!kind) {
      throw new BadRequestException(
        options.voice
          ? 'No pudimos leer la nota de voz. Probá grabarla de nuevo.'
          : 'Solo se pueden mandar fotos (JPG, PNG, WebP), PDF o videos (MP4, MOV, WebM).',
      );
    }
    if (file.size > kind.maxBytes) throw new BadRequestException(tooBigMessage(kind));
    const dir = this.chatStorageDir();
    const context = await this.resolveContext(auth);
    const target =
      conversationId ??
      (context.customerId ? await this.ensureCustomerConversation(context) : null);
    if (!target) throw new BadRequestException('Falta la conversación');
    const filename =
      kind.type === 'VOICE'
        ? `nota-de-voz.${kind.ext}`
        : cleanFileName(file.originalname || 'archivo', kind.ext);
    const message = await this.createTextMessage(
      auth,
      target,
      clientMessageId,
      caption?.trim() || filename,
    );
    const existing = await this.prisma.attachment.findFirst({ where: { messageId: message.id } });
    if (!existing) {
      const storageKey = `${context.businessId}/${randomUUID()}.${kind.ext}`;
      await fs.mkdir(path.join(dir, context.businessId), { recursive: true });
      await fs.writeFile(path.join(dir, storageKey), file.buffer);
      await this.prisma.$transaction([
        this.prisma.message.update({ where: { id: message.id }, data: { type: kind.type } }),
        this.prisma.attachment.create({
          data: {
            businessId: context.businessId,
            messageId: message.id,
            storageKey,
            filename,
            mimeType: kind.mimeType,
            sizeBytes: BigInt(file.size),
            ...(kind.type === 'VOICE' ? { durationSec: voiceSeconds(options.durationSec) } : {}),
          },
        }),
      ]);
    }
    return this.prisma.message.findUniqueOrThrow({
      where: { id: message.id },
      include: { Attachment: true },
    });
  }

  /** The file behind an attachment, for whoever may read its conversation. */
  async getAttachmentFile(auth: AuthenticatedUser, attachmentId: string) {
    const context = await this.resolveContext(auth);
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        deletedAt: null,
        Message: { businessId: context.businessId, deletedAt: null },
      },
      include: { Message: { select: { conversationId: true, createdAt: true } } },
    });
    // Cards are data, not files; a link's preview hands back only its checked photo (E5).
    const linkPhoto =
      attachment?.mimeType === LINK_PREVIEW_MIME
        ? ((attachment.metadata ?? {}) as { imagenMime?: string }).imagenMime
        : undefined;
    const servable = linkPhoto
      ? linkPhoto.startsWith('image/')
      : !!attachment && isServableChatFile(attachment.mimeType);
    if (!attachment || !servable) {
      throw new NotFoundException('Archivo no encontrado');
    }
    const conversationId = attachment.Message.conversationId;
    if (context.customerId) {
      const participant = await this.prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          businessId: context.businessId,
          customerId: context.customerId,
          leftAt: null,
          removedAt: null,
        },
      });
      if (!participant) throw new NotFoundException('Archivo no encontrado');
    } else if (!canReadAllConversations(context)) {
      const participant = await this.assertActiveParticipant(this.prisma, conversationId, context);
      if (attachment.Message.createdAt < participant.joinedAt)
        throw new NotFoundException('Archivo no encontrado');
    }
    return {
      // Absolute: res.sendFile refuses relative paths (a relative MESSAGING_STORAGE_DIR is fine).
      path: path.resolve(this.chatStorageDir(), attachment.storageKey),
      filename: linkPhoto ? 'vista-previa' : attachment.filename,
      mimeType: linkPhoto ?? attachment.mimeType,
    };
  }

  /**
   * E5 — the preview of the first link of a text message (title, description, photo), fetched
   * by the protected visitor of link-preview.ts after the message is sent. Returns the message
   * when a preview was added, so the caller tells the open screens; null otherwise. Never
   * throws: a page that cannot be read just leaves the plain link. A link already previewed in
   * this Business in the last day is reused (no second visit).
   */
  async addLinkPreview(auth: AuthenticatedUser, messageId: string) {
    if (process.env.LINK_PREVIEWS === 'off') return null;
    try {
      const context = await this.resolveContext(auth);
      const message = await this.prisma.message.findFirst({
        where: { id: messageId, businessId: context.businessId, deletedAt: null, type: 'TEXT' },
        include: { Attachment: { where: { deletedAt: null } } },
      });
      const link = firstLink(message?.content);
      if (!message || !link || message.Attachment.length > 0) return null;
      const data =
        (await this.knownLinkPreview(context, message.id, link)) ??
        (await this.freshLinkPreview(context, message.id, link));
      if (!data) return null;
      // The message may have been edited or deleted while the page was being read.
      const still = await this.prisma.message.findFirst({
        where: { id: message.id, deletedAt: null, content: message.content },
        select: { id: true },
      });
      if (!still) return null;
      await this.prisma.attachment.create({ data });
      return message;
    } catch {
      return null;
    }
  }

  /** A preview of the same link made in this Business in the last day, reused as it is. */
  private async knownLinkPreview(
    context: BusinessContext,
    messageId: string,
    link: string,
  ): Promise<Prisma.AttachmentUncheckedCreateInput | null> {
    const known = await this.prisma.attachment.findFirst({
      where: {
        businessId: context.businessId,
        mimeType: LINK_PREVIEW_MIME,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        metadata: { path: ['url'], equals: link },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!known) return null;
    return {
      businessId: context.businessId,
      messageId,
      storageKey: known.storageKey,
      filename: known.filename,
      mimeType: LINK_PREVIEW_MIME,
      sizeBytes: known.sizeBytes,
      metadata: known.metadata ?? Prisma.DbNull,
    };
  }

  /** Visits the page (link-preview.ts) and keeps its photo with the chat files. */
  private async freshLinkPreview(
    context: BusinessContext,
    messageId: string,
    link: string,
  ): Promise<Prisma.AttachmentUncheckedCreateInput | null> {
    const preview = await fetchLinkPreview(link, (bytes) => sniffChatFile(bytes)?.type === 'IMAGE');
    if (!preview) return null;
    const photo = preview.imagen ? sniffChatFile(preview.imagen.buffer) : null;
    let storageKey = `enlace:${createHash('sha256').update(preview.url).digest('hex').slice(0, 32)}`;
    let stored: { mimeType: string; bytes: number } | null = null;
    if (preview.imagen && photo && process.env.MESSAGING_STORAGE_DIR) {
      storageKey = `${context.businessId}/${randomUUID()}.${photo.ext}`;
      const dir = this.chatStorageDir();
      await fs.mkdir(path.join(dir, context.businessId), { recursive: true });
      await fs.writeFile(path.join(dir, storageKey), preview.imagen.buffer);
      stored = { mimeType: photo.mimeType, bytes: preview.imagen.buffer.length };
    }
    return {
      businessId: context.businessId,
      messageId,
      storageKey,
      filename: preview.titulo.slice(0, 200),
      mimeType: LINK_PREVIEW_MIME,
      sizeBytes: BigInt(stored?.bytes ?? 0),
      metadata: {
        url: link,
        titulo: preview.titulo,
        descripcion: preview.descripcion,
        sitio: preview.sitio,
        ...(stored ? { imagenMime: stored.mimeType } : {}),
      },
    };
  }

  private async findCustomerConversationId(
    tx: Prisma.TransactionClient | PrismaService,
    context: BusinessContext,
  ): Promise<string | null> {
    const conversation = await tx.conversation.findFirst({
      where: {
        businessId: context.businessId,
        deletedAt: null,
        ConversationParticipant: {
          some: {
            businessId: context.businessId,
            customerId: context.customerId,
            leftAt: null,
            removedAt: null,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    return conversation?.id ?? null;
  }

  async listConversations(auth: AuthenticatedUser) {
    const context = await this.resolveContext(auth);
    const canReadAll = canReadAllConversations(context);

    const conversations = await this.prisma.conversation.findMany({
      where: {
        businessId: context.businessId,
        deletedAt: null,
        ...(!canReadAll
          ? {
              ConversationParticipant: {
                some: {
                  businessId: context.businessId,
                  leftAt: null,
                  removedAt: null,
                  ...(context.userId
                    ? { userId: context.userId }
                    : { customerId: context.customerId! }),
                },
              },
            }
          : {}),
      },
      include: {
        ConversationParticipant: {
          where: { leftAt: null, removedAt: null },
          orderBy: { joinedAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const [rows, unread] = await Promise.all([
      this.withDirectory(
        conversations.map((conversation) => this.withViewerAccess(conversation, context)),
        context,
      ),
      this.unreadByConversation(context),
    ]);
    // E2: the inbox shows how many messages each conversation has unread.
    return rows.map((row) => ({ ...row, unreadCount: unread.get(row.id) ?? 0 }));
  }

  async getConversation(auth: AuthenticatedUser, conversationId: string) {
    const context = await this.resolveContext(auth);
    const conversation = await this.getConversationForActor(this.prisma, conversationId, context);
    const [withDirectory] = await this.withDirectory(
      [this.withViewerAccess(conversation, context)],
      context,
    );
    return withDirectory;
  }

  /**
   * Realtime (E1): who hears about a change in this conversation — its active participants.
   * Readers of every conversation (MESSAGING_MANAGE) are reached through their own room, so
   * they are not listed here. Internal: never exposed through HTTP. Null when the
   * conversation is gone.
   */
  async realtimeAudience(
    conversationId: string,
  ): Promise<{ businessId: string; userIds: string[]; customerIds: string[] } | null> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, deletedAt: null },
      select: {
        businessId: true,
        ConversationParticipant: {
          where: { leftAt: null, removedAt: null },
          select: { userId: true, customerId: true },
        },
      },
    });
    if (!conversation) return null;
    const participants = conversation.ConversationParticipant;
    return {
      businessId: conversation.businessId,
      userIds: participants.flatMap((p) => (p.userId ? [p.userId] : [])),
      customerIds: participants.flatMap((p) => (p.customerId ? [p.customerId] : [])),
    };
  }

  /**
   * E2b — who hears that this actor came online or left: everyone sharing an active
   * conversation with them (readers of every conversation are reached through their room).
   */
  async presenceAudience(
    context: BusinessContext,
  ): Promise<{ userIds: string[]; customerIds: string[] }> {
    const actor = context.userId
      ? { userId: context.userId }
      : { customerId: context.customerId as string };
    const rows = await this.prisma.conversationParticipant.findMany({
      where: {
        businessId: context.businessId,
        leftAt: null,
        removedAt: null,
        Conversation: {
          deletedAt: null,
          ConversationParticipant: { some: { leftAt: null, removedAt: null, ...actor } },
        },
      },
      select: { userId: true, customerId: true },
    });
    const userIds = new Set<string>();
    const customerIds = new Set<string>();
    for (const row of rows) {
      if (row.userId && row.userId !== context.userId) userIds.add(row.userId);
      if (row.customerId && row.customerId !== context.customerId) customerIds.add(row.customerId);
    }
    return { userIds: [...userIds], customerIds: [...customerIds] };
  }

  /**
   * E2b — the actor left (every screen closed): remember when, for «últ. vez». Raw SQL so the
   * row's updatedAt does not move: leaving is not an edit of the membership or the customer.
   */
  async recordLastSeen(context: BusinessContext, at: Date): Promise<void> {
    if (context.userId) {
      await this.prisma.$executeRaw`
        UPDATE "Membership" SET "lastSeenAt" = ${at}
        WHERE "userId" = ${context.userId} AND "businessId" = ${context.businessId}`;
    } else if (context.customerId) {
      await this.prisma.$executeRaw`
        UPDATE "Cliente" SET "lastSeenAt" = ${at}
        WHERE id = ${context.customerId} AND "empresaId" = ${context.businessId}`;
    }
  }

  /**
   * Realtime (E1) — «escribiendo…». Only someone who may write in the conversation may say
   * they are writing: an Owner reading without participating may not. Returns the actor.
   */
  async typingActor(auth: AuthenticatedUser, conversationId: string): Promise<BusinessContext> {
    const context = await this.resolveContext(auth);
    const conversation = await this.getConversationForActor(this.prisma, conversationId, context);
    if (!this.withViewerAccess(conversation, context).viewerAccess.canSend) {
      throw new ForbiddenException('El actor no participa en la conversación');
    }
    return context;
  }

  /** Realtime (E1) — the store customer is writing: their conversation, if they have one. */
  async customerTypingActor(
    auth: AuthenticatedUser,
  ): Promise<{ context: BusinessContext; conversationId: string } | null> {
    const context = await this.resolveContext(auth);
    if (!context.customerId) throw new ForbiddenException('Solo para clientes');
    const conversationId = await this.findCustomerConversationId(this.prisma, context);
    return conversationId ? { context, conversationId } : null;
  }

  /**
   * Adds what an inbox needs to show a conversation, without changing the existing shape:
   * `participants` (display name, STAFF/CUSTOMER, Membership role, admin flag) and
   * `lastMessage` (preview). Names come from the conversation's own Business: staff via
   * Membership → User, customers via Cliente scoped by empresaId. A participant who is not
   * allowed to read the whole history (no MESSAGING_MANAGE) only gets a preview of a
   * message sent after they joined, same rule as getMessages.
   */
  private async withDirectory<
    T extends {
      id: string;
      ConversationParticipant: Array<{
        id: string;
        userId: string | null;
        customerId: string | null;
        isAdmin: boolean;
        joinedAt: Date;
      }>;
    },
  >(conversations: T[], context: BusinessContext) {
    const userIds = [
      ...new Set(conversations.flatMap((c) => c.ConversationParticipant.map((p) => p.userId))),
    ].filter((id): id is string => Boolean(id));
    const customerIds = [
      ...new Set(conversations.flatMap((c) => c.ConversationParticipant.map((p) => p.customerId))),
    ].filter((id): id is string => Boolean(id));

    const [memberships, customers, lastMessages] = await Promise.all([
      userIds.length
        ? this.prisma.membership.findMany({
            where: { businessId: context.businessId, userId: { in: userIds } },
            select: {
              userId: true,
              role: true,
              lastSeenAt: true,
              User: { select: { nombre: true } },
            },
          })
        : Promise.resolve([]),
      customerIds.length
        ? this.prisma.cliente.findMany({
            where: { empresaId: context.businessId, id: { in: customerIds } },
            select: { id: true, nombre: true, lastSeenAt: true },
          })
        : Promise.resolve([]),
      Promise.all(
        conversations.map((conversation) =>
          this.prisma.message.findFirst({
            where: { conversationId: conversation.id, deletedAt: null },
            orderBy: { sequence: 'desc' },
            select: {
              id: true,
              type: true,
              content: true,
              createdAt: true,
              authorUserId: true,
              authorCustomerId: true,
            },
          }),
        ),
      ),
    ]);
    const staff = new Map(
      memberships.map((m) => [
        m.userId,
        { name: m.User.nombre, role: m.role, lastSeenAt: m.lastSeenAt },
      ]),
    );
    const customerNames = new Map(customers.map((c) => [c.id, c.nombre]));
    const customerSeen = new Map(customers.map((c) => [c.id, c.lastSeenAt]));
    const canReadAll = canReadAllConversations(context);

    return conversations.map((conversation, index) => {
      const viewer = conversation.ConversationParticipant.find((p) =>
        context.userId ? p.userId === context.userId : p.customerId === context.customerId,
      );
      const last = lastMessages[index];
      const visible = last && (canReadAll || (viewer && last.createdAt >= viewer.joinedAt));
      return {
        ...conversation,
        participants: conversation.ConversationParticipant.map((p) => ({
          id: p.id,
          userId: p.userId,
          customerId: p.customerId,
          kind: p.customerId ? ('CUSTOMER' as const) : ('STAFF' as const),
          name: p.customerId
            ? (customerNames.get(p.customerId) ?? 'Cliente')
            : (staff.get(p.userId ?? '')?.name ?? 'Equipo'),
          role: p.userId ? (staff.get(p.userId)?.role ?? null) : null,
          isAdmin: p.isAdmin,
          isViewer: p === viewer,
          // E2b: «últ. vez» (staff screens only: customers never read this directory).
          lastSeenAt: p.customerId
            ? (customerSeen.get(p.customerId) ?? null)
            : (staff.get(p.userId ?? '')?.lastSeenAt ?? null),
        })),
        lastMessage: visible ? last : null,
      };
    });
  }

  async listConversationAssociations(auth: AuthenticatedUser, conversationId: string) {
    const context = await this.resolveContext(auth);
    // The conversation is always resolved inside the authenticated Business.
    await this.getConversationForActor(this.prisma, conversationId, context);
    const associations = await this.prisma.conversationAssociation.findMany({
      where: {
        conversationId,
        businessId: context.businessId,
        active: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      associations.map(async (association) => ({
        ...association,
        label: await this.getAssociationLabel(
          this.prisma,
          context.businessId,
          association.entityType,
          association.entityId,
        ),
      })),
    );
  }

  async listConversationAssociationHistory(auth: AuthenticatedUser, conversationId: string) {
    const context = await this.resolveContext(auth);
    await this.getConversationForActor(this.prisma, conversationId, context);
    await this.assertConversationAdmin(this.prisma, conversationId, context);

    const associations = await this.prisma.conversationAssociation.findMany({
      where: { conversationId, businessId: context.businessId },
      orderBy: { updatedAt: 'desc' },
    });
    return Promise.all(
      associations.map(async (association) => ({
        ...association,
        label: await this.getAssociationLabel(
          this.prisma,
          context.businessId,
          association.entityType,
          association.entityId,
        ),
      })),
    );
  }

  async createConversationAssociation(
    auth: AuthenticatedUser,
    conversationId: string,
    entityType: MessagingAssociationType,
    entityId: string,
    reason?: string,
  ) {
    const context = await this.resolveContext(auth);
    // Association changes are limited to conversation admins. The precise
    // permission catalog remains open in the functional spec; no new RBAC is invented here.
    await this.assertConversationAdmin(this.prisma, conversationId, context);
    await this.assertAssociationEntityBelongsToBusiness(
      this.prisma,
      context.businessId,
      entityType,
      entityId,
    );

    const existing = await this.prisma.conversationAssociation.findFirst({
      where: {
        conversationId,
        businessId: context.businessId,
        entityType,
        entityId,
        active: true,
      },
    });
    if (existing) throw new ConflictException('La entidad ya está asociada a esta conversación');

    return this.prisma.conversationAssociation.create({
      data: {
        conversationId,
        businessId: context.businessId,
        entityType,
        entityId,
        changedBy: context.userId,
        reason: reason ?? 'Asociación manual',
      },
    });
  }

  /**
   * What "Crear pedido" would order: the cart of the conversation's associated Customer,
   * at current catalog prices. Readable by whoever can read the conversation.
   */
  /**
   * OR-B4-037 — share a product of the catalogue in the conversation: a message with the
   * product's name and price plus a product-card attachment the customer can add to the cart.
   * Staff only; idempotent by clientMessageId like any message.
   */
  async sendProductCard(
    auth: AuthenticatedUser,
    conversationId: string,
    clientMessageId: string,
    productoId: string,
  ) {
    const context = await this.resolveContext(auth);
    if (!context.userId) throw new ForbiddenException('Solo el equipo comparte productos');
    const product = await this.prisma.producto.findFirst({
      where: { id: productoId, empresaId: context.businessId, activo: true },
      select: { id: true, nombre: true, precioMinorista: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const precio = String(product.precioMinorista);
    // OR-B4-053: the card shows what the conversation's customer pays today (discounts,
    // offers, loyalty), so it never says $1.600 for something the order charges $1.280.
    const precioFinal =
      (await this.storeService
        ?.customerUnitPrice(
          context.businessId,
          product.id,
          await this.conversationCustomer(context, conversationId),
        )
        .catch(() => null)) ?? precio;
    const message = await this.createTextMessage(
      auth,
      conversationId,
      clientMessageId,
      `${product.nombre} · $ ${Number(precioFinal).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    );
    const existing = await this.prisma.attachment.findFirst({
      where: { messageId: message.id, mimeType: PRODUCT_CARD_MIME },
    });
    if (!existing) {
      await this.prisma.attachment.create({
        data: {
          businessId: context.businessId,
          messageId: message.id,
          storageKey: `producto:${product.id}`,
          filename: product.nombre,
          mimeType: PRODUCT_CARD_MIME,
          sizeBytes: BigInt(0),
          metadata: { productoId: product.id, nombre: product.nombre, precio, precioFinal },
        },
      });
    }
    return this.prisma.message.findUniqueOrThrow({
      where: { id: message.id },
      include: { Attachment: true },
    });
  }

  /** The Customer a conversation is about (its single active CUSTOMER association). */
  private async conversationCustomer(context: BusinessContext, conversationId: string) {
    const associations = await this.prisma.conversationAssociation.findMany({
      where: {
        conversationId,
        businessId: context.businessId,
        entityType: MessagingAssociationType.CUSTOMER,
        active: true,
      },
      select: { entityId: true },
    });
    return associations.length === 1 ? associations[0].entityId : null;
  }

  /**
   * OR-B4-037 — the team loads products into the customer's cart from the conversation
   * (Owner, Admin, Vendedor: SALES_CREATE). `cantidad` 0 takes the product out. The customer
   * then confirms from the store, or the team uses «Crear pedido».
   */
  async setCustomerCartItem(
    auth: AuthenticatedUser,
    conversationId: string,
    productoId: string,
    cantidad: number,
  ) {
    const context = await this.resolveContext(auth);
    if (!context.userId || !hasCanonicalPermission(context.role, 'SALES_CREATE')) {
      throw new ForbiddenException('Requiere el permiso SALES_CREATE');
    }
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, businessId: context.businessId, deletedAt: null },
      select: { id: true },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');
    await this.assertActiveParticipant(this.prisma, conversationId, context);
    const customerId = await this.conversationCustomer(context, conversationId);
    if (!customerId || !this.cartService) {
      throw new ConflictException('Esta conversación no es con un cliente');
    }
    const cart = await this.cartService.getOrCreateCart(customerId, context.businessId);
    const line = cart.CartItem.find((item) => item.productoId === productoId);
    if (cantidad <= 0) {
      if (line) await this.cartService.removeItem(cart.id, line.id, context.businessId);
    } else if (line) {
      await this.cartService.updateItemQuantity(cart.id, line.id, cantidad, context.businessId);
    } else {
      await this.cartService.addItem(cart.id, productoId, cantidad, context.businessId);
    }
    return this.getConversationCart(auth, conversationId);
  }

  async getConversationCart(auth: AuthenticatedUser, conversationId: string) {
    const context = await this.resolveContext(auth);
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, businessId: context.businessId, deletedAt: null },
      select: { id: true },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');
    if (!canReadAllConversations(context)) {
      await this.assertActiveParticipant(this.prisma, conversationId, context);
    }
    const associations = await this.prisma.conversationAssociation.findMany({
      where: {
        conversationId,
        businessId: context.businessId,
        entityType: MessagingAssociationType.CUSTOMER,
        active: true,
      },
      select: { entityId: true },
    });
    if (associations.length !== 1 || !this.cartService) {
      return { customerId: null, items: [], total: '0' };
    }
    const customerId = associations[0].entityId;
    const cart = await this.cartService.getCartForCustomer(customerId, context.businessId);
    const items = (cart?.CartItem ?? []).map((item) => ({
      productoId: item.productoId,
      nombre: item.Producto.nombre,
      cantidad: Number(item.cantidad),
      precio: String(item.Producto.precioMinorista),
    }));
    const total = items.reduce((sum, item) => sum + Number(item.precio) * item.cantidad, 0);
    return { customerId, items, total: total.toFixed(2) };
  }

  async createOrderFromConversation(auth: AuthenticatedUser, conversationId: string) {
    // C3 — Cart→Order integration. The persistent cart (via CartService) is the
    // authoritative source of items. Prices are revalidated at confirmation.
    const context = await this.resolveContext(auth);
    await this.assertConversationAdmin(this.prisma, conversationId, context);

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, businessId: context.businessId, deletedAt: null },
      select: { id: true },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');

    const customerAssociations = await this.prisma.conversationAssociation.findMany({
      where: {
        conversationId,
        businessId: context.businessId,
        entityType: MessagingAssociationType.CUSTOMER,
        active: true,
      },
      select: { entityId: true },
    });
    if (customerAssociations.length !== 1) {
      throw new ConflictException(
        'Para crear un pedido, la conversación debe tener exactamente un Customer asociado',
      );
    }

    const customerId = customerAssociations[0].entityId;
    const customer = await this.prisma.cliente.findFirst({
      where: {
        id: customerId,
        empresaId: context.businessId,
        activo: true,
      },
      select: { id: true, nombre: true, email: true, telefono: true },
    });
    if (!customer) throw new NotFoundException('Customer asociado no disponible en este Business');
    if (!customer.email) {
      throw new BadRequestException(
        'El Customer necesita email para crear el pedido con el motor Commerce actual',
      );
    }
    if (!this.storeService || !this.cartService) {
      throw new BadRequestException('El motor de Carrito o Commerce no está disponible');
    }

    // C3: Fetch the persistent cart for this customer.
    // CartService returns null if no cart exists; empty cart is an error.
    const cart = await this.cartService.getCartForCustomer(customerId, context.businessId);
    if (!cart || !cart.CartItem || cart.CartItem.length === 0) {
      throw new ConflictException('El cliente no tiene un carrito con ítems para crear un pedido');
    }

    // C3: Extract items from the persistent cart. Prices are read from cart
    // snapshot (current `Producto.precioMinorista`); revalidation is storeService's responsibility.
    const items = cart.CartItem.map((item) => ({
      productoId: item.productoId,
      cantidad: Number(item.cantidad), // CartItem.cantidad is Decimal; convert to number
    }));

    // Reuse the existing Commerce engine for server-side pricing, loyalty and
    // PedidoItem persistence. A Messaging-created order remains RECIBIDO:
    // stock/ERP confirmation stays in the existing authorized Orders workflow.
    // Idempotency per cart, not per conversation: a retry of the same cart returns the
    // same order, while a later cart in the same conversation is a new order. (Keying on
    // the conversation alone made every later order return the first one and still empty
    // the customer's new cart.)
    const order = await this.storeService.createOrder(
      {
        nombre: customer.nombre,
        email: customer.email,
        telefono: customer.telefono ?? undefined,
        items,
      },
      context.businessId,
      'messaging',
      conversationOrderKey(conversationId, cart.CartItem),
      // OR-B4-046 rule 2: the store sells the Catálogo, the chat sells every active product. The
      // Business could load an unpublished product into the cart; the order must take it too.
      { catalogOnly: false },
    );

    // C3: Create the association linking this conversation to the created order
    // (once: a retry that returns the same order must not add it again).
    const linked = await this.prisma.conversationAssociation.findFirst({
      where: {
        conversationId,
        businessId: context.businessId,
        entityType: MessagingAssociationType.ORDER,
        entityId: order.id,
      },
      select: { id: true },
    });
    if (!linked) {
      await this.prisma.conversationAssociation.create({
        data: {
          conversationId,
          businessId: context.businessId,
          entityType: MessagingAssociationType.ORDER,
          entityId: order.id,
          changedBy: context.userId,
          reason: 'Pedido creado desde el contexto comercial de Messaging',
        },
      });
    }

    // C3: Remove only the items that were confirmed in this order from the cart.
    // This prevents loss of items added concurrently after the snapshot was taken.
    // If an error occurs before this point, the cart is fully preserved (client can retry).
    // If removal fails, it's logged but does not fail the order (order is already committed).
    try {
      const itemIdsToRemove = cart.CartItem.map((item) => item.id);
      for (const itemId of itemIdsToRemove) {
        await this.cartService.removeItem(cart.id, itemId, context.businessId);
      }
    } catch (error) {
      // Log but don't throw: item removal is best-effort; order is committed.
      // Worst case: customer sees items in their cart after ordering. The items
      // won't be ordered again if the customer retries (idempotencyKey prevents it).
      console.error(
        `Failed to remove cart items after order ${order.id}:`,
        error instanceof Error ? error.message : String(error),
      );
    }

    return order;
  }

  async deactivateConversationAssociation(
    auth: AuthenticatedUser,
    conversationId: string,
    associationId: string,
    reason?: string,
  ) {
    const context = await this.resolveContext(auth);
    await this.assertConversationAdmin(this.prisma, conversationId, context);

    const association = await this.prisma.conversationAssociation.findFirst({
      where: {
        id: associationId,
        conversationId,
        businessId: context.businessId,
        active: true,
      },
    });
    if (!association) throw new NotFoundException('Asociación activa no encontrada');

    // Soft deactivation preserves the association record for historical/audit views.
    return this.prisma.conversationAssociation.update({
      where: { id: association.id },
      data: {
        active: false,
        changedBy: context.userId,
        reason: reason ?? 'Asociación desactivada desde Messaging',
      },
    });
  }

  private async assertAssociationEntityBelongsToBusiness(
    db: Prisma.TransactionClient | PrismaService,
    businessId: string,
    entityType: MessagingAssociationType,
    entityId: string,
  ) {
    let exists = false;
    switch (entityType) {
      case MessagingAssociationType.CUSTOMER:
        exists = !!(await db.cliente.findFirst({
          where: { id: entityId, empresaId: businessId },
          select: { id: true },
        }));
        break;
      case MessagingAssociationType.ORDER:
        exists = !!(await db.pedido.findFirst({
          where: { id: entityId, empresaId: businessId },
          select: { id: true },
        }));
        break;
      case MessagingAssociationType.SALE:
        exists = !!(await db.venta.findFirst({
          where: { id: entityId, empresaId: businessId },
          select: { id: true },
        }));
        break;
      case MessagingAssociationType.PRODUCT:
        exists = !!(await db.producto.findFirst({
          where: { id: entityId, empresaId: businessId },
          select: { id: true },
        }));
        break;
      case MessagingAssociationType.PURCHASE:
        exists = !!(await db.compra.findFirst({
          where: { id: entityId, empresaId: businessId },
          select: { id: true },
        }));
        break;
    }
    if (!exists) {
      throw new NotFoundException('La entidad comercial no existe dentro de este Business');
    }
  }

  private async getAssociationLabel(
    db: Prisma.TransactionClient | PrismaService,
    businessId: string,
    entityType: MessagingAssociationType,
    entityId: string,
  ): Promise<string> {
    switch (entityType) {
      case MessagingAssociationType.CUSTOMER: {
        const row = await db.cliente.findFirst({
          where: { id: entityId, empresaId: businessId },
          select: { nombre: true },
        });
        return row?.nombre ?? 'Cliente no disponible';
      }
      case MessagingAssociationType.ORDER: {
        const row = await db.pedido.findFirst({
          where: { id: entityId, empresaId: businessId },
          select: { estado: true },
        });
        return row ? `Pedido · ${row.estado}` : 'Pedido no disponible';
      }
      case MessagingAssociationType.SALE: {
        const row = await db.venta.findFirst({
          where: { id: entityId, empresaId: businessId },
          select: { numero: true, estado: true },
        });
        return row ? `Venta ${row.numero} · ${row.estado}` : 'Venta no disponible';
      }
      case MessagingAssociationType.PRODUCT: {
        const row = await db.producto.findFirst({
          where: { id: entityId, empresaId: businessId },
          select: { nombre: true, codigoInterno: true },
        });
        return row ? row.nombre : 'Producto no disponible';
      }
      case MessagingAssociationType.PURCHASE: {
        const row = await db.compra.findFirst({
          where: { id: entityId, empresaId: businessId },
          select: { estado: true },
        });
        return row ? `Compra · ${row.estado}` : 'Compra no disponible';
      }
    }
    return 'Entidad comercial no disponible';
  }

  async deleteConversation(auth: AuthenticatedUser, conversationId: string) {
    const context = await this.resolveContext(auth);
    await this.assertConversationAdmin(this.prisma, conversationId, context);

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        businessId: context.businessId,
        deletedAt: null,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { deletedAt: new Date() },
    });
  }

  async addParticipant(
    auth: AuthenticatedUser,
    conversationId: string,
    participantUserId?: string,
    participantCustomerId?: string,
  ) {
    const context = await this.resolveContext(auth);

    if (!!participantUserId === !!participantCustomerId) {
      throw new ConflictException('Debe especificarse exactamente un User o un Customer');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const conversation = await tx.conversation.findFirst({
          where: {
            id: conversationId,
            businessId: context.businessId,
            deletedAt: null,
          },
        });

        if (!conversation) {
          throw new NotFoundException('Conversación no encontrada');
        }

        await this.assertActiveParticipant(tx, conversationId, context);

        const activeCount = await tx.conversationParticipant.count({
          where: {
            conversationId,
            businessId: context.businessId,
            leftAt: null,
            removedAt: null,
          },
        });

        const maxParticipants =
          conversation.type === MessagingConversationType.DIRECT ? 2 : MAX_GROUP_PARTICIPANTS;

        if (activeCount >= maxParticipants) {
          throw new ConflictException(
            conversation.type === MessagingConversationType.DIRECT
              ? 'Una conversación DIRECT no puede superar 2 participantes'
              : 'Una conversación GROUP no puede superar 50 participantes',
          );
        }

        if (participantUserId) {
          await this.assertParticipantsBelongToBusiness(
            tx,
            context.businessId,
            [participantUserId],
            [],
          );
        } else {
          await this.assertParticipantsBelongToBusiness(
            tx,
            context.businessId,
            [],
            [participantCustomerId!],
          );
        }

        const existing = await tx.conversationParticipant.findFirst({
          where: {
            conversationId,
            businessId: context.businessId,
            ...(participantUserId
              ? { userId: participantUserId }
              : { customerId: participantCustomerId }),
            leftAt: null,
            removedAt: null,
          },
        });

        if (existing) {
          throw new ConflictException('El participante ya pertenece a la conversación');
        }

        return tx.conversationParticipant.create({
          data: {
            conversationId,
            businessId: context.businessId,
            ...(participantUserId
              ? {
                  userId: participantUserId,
                }
              : {
                  customerId: participantCustomerId,
                }),
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async removeParticipant(auth: AuthenticatedUser, conversationId: string, participantId: string) {
    const context = await this.resolveContext(auth);

    return this.prisma.$transaction(
      async (tx) => {
        const conversation = await tx.conversation.findFirst({
          where: {
            id: conversationId,
            businessId: context.businessId,
            deletedAt: null,
          },
        });

        if (!conversation) {
          throw new NotFoundException('Conversación no encontrada');
        }

        const target = await tx.conversationParticipant.findFirst({
          where: {
            id: participantId,
            conversationId,
            businessId: context.businessId,
            leftAt: null,
            removedAt: null,
          },
        });

        if (!target) {
          throw new NotFoundException('Participante activo no encontrado');
        }

        const isSelf =
          (context.userId !== null && target.userId === context.userId) ||
          (context.customerId !== null && target.customerId === context.customerId);

        if (!isSelf) {
          await this.assertConversationAdmin(tx, conversationId, context);
        }

        const now = new Date();
        const updated = await tx.conversationParticipant.update({
          where: { id: target.id },
          data: isSelf ? { leftAt: now, isAdmin: false } : { removedAt: now, isAdmin: false },
        });

        if (target.isAdmin) {
          const successor = await tx.conversationParticipant.findFirst({
            where: {
              conversationId,
              businessId: context.businessId,
              id: { not: target.id },
              leftAt: null,
              removedAt: null,
            },
            orderBy: { joinedAt: 'asc' },
          });

          if (successor) {
            await tx.conversationParticipant.update({
              where: { id: successor.id },
              data: { isAdmin: true },
            });
          }
        }

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async transferAdmin(auth: AuthenticatedUser, conversationId: string, participantId: string) {
    const context = await this.resolveContext(auth);

    return this.prisma.$transaction(
      async (tx) => {
        await this.assertConversationAdmin(tx, conversationId, context);

        const target = await tx.conversationParticipant.findFirst({
          where: {
            id: participantId,
            conversationId,
            businessId: context.businessId,
            leftAt: null,
            removedAt: null,
          },
        });

        if (!target) {
          throw new NotFoundException('Participante activo no encontrado');
        }

        await tx.conversationParticipant.updateMany({
          where: {
            conversationId,
            businessId: context.businessId,
            leftAt: null,
            removedAt: null,
            isAdmin: true,
          },
          data: { isAdmin: false },
        });

        return tx.conversationParticipant.update({
          where: { id: target.id },
          data: { isAdmin: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async markMessageRead(auth: AuthenticatedUser, conversationId: string, messageId: string) {
    const context = await this.resolveContext(auth);

    return this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findFirst({
        where: {
          id: conversationId,
          businessId: context.businessId,
          deletedAt: null,
        },
      });
      if (!conversation) throw new NotFoundException('Conversación no encontrada');

      const participant = await this.assertActiveParticipant(tx, conversationId, context);

      const message = await tx.message.findFirst({
        where: {
          id: messageId,
          conversationId,
          businessId: context.businessId,
          deletedAt: null,
        },
        select: { id: true, createdAt: true },
      });
      if (!message) throw new NotFoundException('Mensaje no encontrado');

      // E2: the unread count clears even with read receipts turned off (like WhatsApp).
      const positionMoved = await this.advanceReadPosition(tx, participant, message.createdAt);

      const preference = await this.findReadReceiptPreference(tx, context);
      if (!preference.enabled) {
        return {
          messageId,
          read: false,
          receiptsEnabled: false,
          positionMoved,
        };
      }

      const actor = this.actorFromContext(context);
      const existing = await tx.messageReadReceipt.findFirst({
        where: {
          messageId,
          businessId: context.businessId,
          ...(context.userId ? { userId: context.userId } : { customerId: context.customerId! }),
        },
      });

      const receipt = existing
        ? existing
        : await tx.messageReadReceipt.create({
            data: {
              messageId,
              businessId: context.businessId,
              ...actor,
            },
          });

      return {
        messageId,
        read: true,
        receiptsEnabled: true,
        readAt: receipt.readAt,
        // E1: true only when this call created the receipt. Reading again is a no-op and
        // must not be announced, or each screen reload would wake every other screen.
        firstRead: !existing,
        positionMoved,
      };
    });
  }

  async getMessageReadReceipts(auth: AuthenticatedUser, conversationId: string, messageId: string) {
    const context = await this.resolveContext(auth);
    const canReadAll = canReadAllConversations(context);

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        businessId: context.businessId,
        deletedAt: null,
      },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');

    if (!canReadAll) {
      await this.assertActiveParticipant(this.prisma, conversationId, context);
    }

    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId,
        businessId: context.businessId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!message) throw new NotFoundException('Mensaje no encontrado');

    const receipts = await this.prisma.messageReadReceipt.findMany({
      where: {
        messageId,
        businessId: context.businessId,
      },
      orderBy: { readAt: 'asc' },
    });

    if (!receipts.length) return [];

    const userIds = receipts.flatMap((receipt) => (receipt.userId ? [receipt.userId] : []));
    const customerIds = receipts.flatMap((receipt) =>
      receipt.customerId ? [receipt.customerId] : [],
    );

    const [userPreferences, customerPreferences] = await Promise.all([
      userIds.length
        ? this.prisma.messagingReadPreference.findMany({
            where: {
              businessId: context.businessId,
              userId: { in: userIds },
            },
            select: { userId: true, enabled: true },
          })
        : [],
      customerIds.length
        ? this.prisma.messagingReadPreference.findMany({
            where: {
              businessId: context.businessId,
              customerId: { in: customerIds },
            },
            select: { customerId: true, enabled: true },
          })
        : [],
    ]);

    const disabledUsers = new Set(
      userPreferences
        .filter((preference) => !preference.enabled)
        .map((preference) => preference.userId),
    );
    const disabledCustomers = new Set(
      customerPreferences
        .filter((preference) => !preference.enabled)
        .map((preference) => preference.customerId),
    );

    return receipts.filter((receipt) => {
      if (receipt.userId) return !disabledUsers.has(receipt.userId);
      if (receipt.customerId) return !disabledCustomers.has(receipt.customerId);
      return false;
    });
  }

  async getReadReceiptPreference(auth: AuthenticatedUser) {
    const context = await this.resolveContext(auth);
    return this.findReadReceiptPreference(this.prisma, context);
  }

  async setReadReceiptPreference(auth: AuthenticatedUser, enabled: boolean) {
    const context = await this.resolveContext(auth);

    return this.prisma.$transaction(async (tx) => {
      const actor = this.actorFromContext(context);
      const existing = await this.findReadReceiptPreference(tx, context);

      if (existing.id) {
        return tx.messagingReadPreference.update({
          where: { id: existing.id },
          data: { enabled },
        });
      }

      return tx.messagingReadPreference.create({
        data: {
          businessId: context.businessId,
          ...actor,
          enabled,
        },
      });
    });
  }

  private async findReadReceiptPreference(
    tx: Prisma.TransactionClient | PrismaService,
    context: BusinessContext,
  ) {
    const preference = await tx.messagingReadPreference.findFirst({
      where: {
        businessId: context.businessId,
        ...(context.userId ? { userId: context.userId } : { customerId: context.customerId! }),
      },
    });

    return preference ?? { id: null, enabled: true };
  }

  private async resolveContext(auth: AuthenticatedUser): Promise<BusinessContext> {
    return auth.type === 'cliente'
      ? this.businessContext.resolveForCustomer(auth)
      : this.businessContext.resolveForAuthenticatedUser(auth);
  }

  private actorFromContext(context: BusinessContext) {
    if (context.userId) {
      return {
        userId: context.userId,
      };
    }

    if (context.customerId) {
      return {
        customerId: context.customerId,
      };
    }

    throw new ForbiddenException('Actor Messaging inválido');
  }

  // Message has a distinct Prisma relation contract from ConversationParticipant.
  // Keep author identity and its composite Business relation fields explicit.
  /**
   * Looks up a message by the client's retry key, scoped to the SAME author.
   * The author scope matters: `clientMessageId` is only unique per author
   * (see the two `@@unique` constraints on Message), so resolving without it
   * could return another participant's message and leak content across actors.
   */
  private async findMessageByClientKey(
    tx: Prisma.TransactionClient | PrismaService,
    conversationId: string,
    context: BusinessContext,
    clientMessageId: string,
  ) {
    // Built from the context directly (not from `messageAuthorFromContext`,
    // whose return is a union of the two author shapes) so both columns are
    // always constrained: matching on only one would let a Customer's retry
    // resolve to a User's message with the same key.
    return tx.message.findFirst({
      where: {
        conversationId,
        businessId: context.businessId,
        clientMessageId,
        authorUserId: context.userId ?? null,
        authorCustomerId: context.customerId ?? null,
      },
    });
  }

  /**
   * A retry is only idempotent when it carries the same payload. Reusing a
   * `clientMessageId` for DIFFERENT content is a client defect, and silently
   * returning the old message would hide it -- the second message would be
   * lost without anyone noticing. That case keeps failing explicitly.
   */
  private assertSameContentOrConflict<
    T extends { content: string | null; replyToMessageId: string | null },
  >(existing: T, content: string, replyToMessageId: string | undefined): T {
    const sameContent = existing.content === content;
    const sameReply = (existing.replyToMessageId ?? undefined) === replyToMessageId;
    if (!sameContent || !sameReply) {
      throw new ConflictException(
        'El clientMessageId ya fue utilizado en esta conversación con otro contenido',
      );
    }
    return existing;
  }

  private messageAuthorFromContext(context: BusinessContext) {
    if (context.userId) {
      return {
        authorUserId: context.userId,
      };
    }

    if (context.customerId) {
      return {
        authorCustomerId: context.customerId,
      };
    }

    throw new ForbiddenException('Actor Messaging inválido');
  }

  private async assertParticipantsBelongToBusiness(
    tx: Prisma.TransactionClient,
    businessId: string,
    userIds: string[],
    customerIds: string[],
  ) {
    if (userIds.length) {
      const memberships = await tx.membership.findMany({
        where: {
          businessId,
          userId: { in: userIds },
          status: MembershipStatus.ACTIVE,
        },
        select: { userId: true },
      });

      if (memberships.length !== userIds.length) {
        throw new ForbiddenException('Uno o más Users no pertenecen al Business');
      }
    }

    if (customerIds.length) {
      const customers = await tx.cliente.findMany({
        where: {
          empresaId: businessId,
          id: { in: customerIds },
          activo: true,
        },
        select: { id: true },
      });

      if (customers.length !== customerIds.length) {
        throw new ForbiddenException('Uno o más Customers no pertenecen al Business');
      }
    }
  }

  // Tells the client what the authenticated actor may do in a conversation it
  // can see. An Owner can read every conversation of the Business (M4-D03) but
  // writing, like for any other actor, requires active participation. Exposing
  // this lets the UI avoid offering a send that the API will reject, without
  // widening any permission: it only reports the existing rule.
  private withViewerAccess<
    T extends {
      ConversationParticipant: Array<{ userId: string | null; customerId: string | null }>;
    },
  >(
    conversation: T,
    context: BusinessContext,
  ): T & { viewerAccess: { canSend: boolean; mode: 'PARTICIPANT' | 'OWNER_READ_ONLY' } } {
    const isParticipant = conversation.ConversationParticipant.some((participant) =>
      context.userId
        ? participant.userId === context.userId
        : participant.customerId === context.customerId,
    );
    return {
      ...conversation,
      viewerAccess: isParticipant
        ? { canSend: true, mode: 'PARTICIPANT' }
        : { canSend: false, mode: 'OWNER_READ_ONLY' },
    };
  }

  private async assertActiveParticipant(
    tx: Prisma.TransactionClient,
    conversationId: string,
    context: BusinessContext,
  ) {
    const participant = await tx.conversationParticipant.findFirst({
      where: {
        conversationId,
        businessId: context.businessId,
        leftAt: null,
        removedAt: null,
        ...(context.userId ? { userId: context.userId } : { customerId: context.customerId! }),
      },
    });

    if (!participant) {
      throw new ForbiddenException('El actor no participa en la conversación');
    }

    return participant;
  }

  private async assertConversationAdmin(
    tx: Prisma.TransactionClient | PrismaService,
    conversationId: string,
    context: BusinessContext,
  ) {
    // OR-B4-027: MESSAGING_MANAGE (Owner and Admin), plus the conversation admin flag below.
    if (!hasCanonicalPermission(context.role, 'MESSAGING_MANAGE')) {
      throw new ForbiddenException(
        'Requiere el permiso MESSAGING_MANAGE para administrar la conversación',
      );
    }

    const participant = await tx.conversationParticipant.findFirst({
      where: {
        conversationId,
        businessId: context.businessId,
        leftAt: null,
        removedAt: null,
        isAdmin: true,
        ...(context.userId ? { userId: context.userId } : { customerId: context.customerId! }),
      },
    });

    if (!participant) {
      throw new ForbiddenException('El actor no es administrador de la conversación');
    }

    return participant;
  }

  private async getConversationForActor(
    tx: Prisma.TransactionClient | PrismaService,
    conversationId: string,
    context: BusinessContext,
  ) {
    const conversation = await tx.conversation.findFirst({
      where: {
        id: conversationId,
        businessId: context.businessId,
        deletedAt: null,
      },
      include: {
        ConversationParticipant: {
          where: { leftAt: null, removedAt: null },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const canReadAll = canReadAllConversations(context);
    if (!canReadAll) {
      await this.assertActiveParticipant(tx, conversationId, context);
    }

    const isActiveParticipant = conversation.ConversationParticipant.some(
      (p) =>
        (context.userId && p.userId === context.userId) ||
        (context.customerId && p.customerId === context.customerId),
    );

    const viewerAccess = {
      canSend: isActiveParticipant,
      mode: isActiveParticipant ? 'PARTICIPANT' : 'OWNER_READ_ONLY',
    };

    return Object.assign(conversation, { viewerAccess });
  }
}
