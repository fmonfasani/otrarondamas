import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  MembershipStatus,
  MessagingAssociationType,
  MessagingConversationType,
  Prisma,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BusinessContextService } from '../business-context/business-context.service';
import { PrismaService } from '../prisma/prisma.service';
import type { BusinessContext } from '../business-context/business-context.types';
import { StoreService } from '../store/store.service';
import { CartService } from '../cart/cart.service';
import { CreateConversationDto, ConversationTypeDto } from './dto/create-conversation.dto';
import { hasCanonicalPermission } from '../authorization/canonical-permissions';
import { PRODUCT_CARD_MIME, toMessageWire } from './message-serializer';

/**
 * Read-only access to every conversation of the Business without being a participant
 * (OWNER_READ_ONLY mode below): staff whose role holds MESSAGING_MANAGE in the approved
 * matrix — Owner and Admin (OR-B4-027) — and that have a canonical User.
 */
function canReadAllConversations(context: BusinessContext): boolean {
  return hasCanonicalPermission(context.role, 'MESSAGING_MANAGE') && context.userId !== null;
}

const MAX_GROUP_PARTICIPANTS = 50;

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
              membershipBusinessId: context.businessId,
            },
          });
        }

        for (const customerId of requestedCustomers) {
          await tx.conversationParticipant.create({
            data: {
              conversationId: conversation.id,
              businessId: context.businessId,
              customerId,
              customerBusinessId: context.businessId,
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
        await this.assertActiveParticipant(tx, conversationId, context);

        if (replyToMessageId) {
          const parent = await tx.message.findFirst({
            where: { id: replyToMessageId, conversationId, businessId: context.businessId },
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

  async getMessages(auth: AuthenticatedUser, conversationId: string) {
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

    return this.prisma.message.findMany({
      where: {
        conversationId,
        businessId: context.businessId,
        deletedAt: null,
        ...(joinedAt ? { createdAt: { gte: joinedAt } } : {}),
      },
      orderBy: { sequence: 'asc' },
      include: { Reaction: true, Attachment: true },
    });
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

    const isAuthor =
      (context.userId !== null && message.authorUserId === context.userId) ||
      (context.customerId !== null && message.authorCustomerId === context.customerId);
    if (!isAuthor) throw new ForbiddenException('Solo el autor puede editar el mensaje');

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
    });
  }

  async deleteMessage(auth: AuthenticatedUser, conversationId: string, messageId: string) {
    const context = await this.resolveContext(auth);
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId, businessId: context.businessId, deletedAt: null },
    });
    if (!message) throw new NotFoundException('Mensaje no encontrado');

    const isAuthor =
      (context.userId !== null && message.authorUserId === context.userId) ||
      (context.customerId !== null && message.authorCustomerId === context.customerId);
    if (!isAuthor) {
      await this.assertConversationAdmin(this.prisma, conversationId, context);
    } else {
      // Author must still be an active participant to edit/delete their own message
      await this.assertActiveParticipant(this.prisma, conversationId, context);
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedByUserId: context.userId ?? null, content: null },
    });
  }

  /**
   * Team members a staff actor can start a conversation with: ACTIVE Memberships of the
   * actor's own Business (same rule createConversation enforces). Ids are canonical User
   * ids, the ones `participantUserIds` expects. Customers are not listed here; they come
   * from /clientes under its own permission.
   */
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
  async getCustomerChat(auth: AuthenticatedUser) {
    const context = await this.resolveContext(auth);
    if (!context.customerId) throw new ForbiddenException('Solo para clientes');
    const conversationId = await this.findCustomerConversationId(this.prisma, context);
    if (!conversationId) return { conversationId: null, messages: [] };
    const messages = await this.getMessages(auth, conversationId);
    return {
      conversationId,
      messages: messages.map((m) => ({
        id: m.id,
        clientMessageId: m.clientMessageId,
        content: m.content,
        createdAt: m.createdAt,
        mine: m.authorCustomerId === context.customerId,
        // OR-B4-037: product cards (and later photos) the team shared.
        adjuntos: toMessageWire(m).adjuntos ?? [],
      })),
    };
  }

  /**
   * STORE-V1-04 — a message from the store customer. Without a conversation yet, one is
   * opened DIRECT with the Business Owner (Owner ruling OR-B4-031), who can add teammates;
   * it is associated to the Customer like a conversation started from Clientes.
   */
  async sendCustomerMessage(auth: AuthenticatedUser, clientMessageId: string, content: string) {
    const context = await this.resolveContext(auth);
    if (!context.customerId) throw new ForbiddenException('Solo para clientes');
    const customerId = context.customerId;
    const conversationId =
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
                membershipBusinessId: context.businessId,
                isAdmin: true,
              },
              {
                conversationId: conversation.id,
                businessId: context.businessId,
                customerId,
                customerBusinessId: context.businessId,
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
      ));
    return this.createTextMessage(auth, conversationId, clientMessageId, content);
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

    return this.withDirectory(
      conversations.map((conversation) => this.withViewerAccess(conversation, context)),
      context,
    );
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
            select: { userId: true, role: true, User: { select: { nombre: true } } },
          })
        : Promise.resolve([]),
      customerIds.length
        ? this.prisma.cliente.findMany({
            where: { empresaId: context.businessId, id: { in: customerIds } },
            select: { id: true, nombre: true },
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
      memberships.map((m) => [m.userId, { name: m.User.nombre, role: m.role }]),
    );
    const customerNames = new Map(customers.map((c) => [c.id, c.nombre]));
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
    const message = await this.createTextMessage(
      auth,
      conversationId,
      clientMessageId,
      `${product.nombre} · $ ${Number(precio).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    );
    const existing = await this.prisma.attachment.findFirst({
      where: { messageId: message.id, mimeType: PRODUCT_CARD_MIME },
    });
    if (!existing) {
      await this.prisma.attachment.create({
        data: {
          messageId: message.id,
          storageKey: `producto:${product.id}`,
          filename: product.nombre,
          mimeType: PRODUCT_CARD_MIME,
          sizeBytes: BigInt(0),
          metadata: { productoId: product.id, nombre: product.nombre, precio },
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
                  membershipBusinessId: context.businessId,
                }
              : {
                  customerId: participantCustomerId,
                  customerBusinessId: context.businessId,
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

      await this.assertActiveParticipant(tx, conversationId, context);

      const message = await tx.message.findFirst({
        where: {
          id: messageId,
          conversationId,
          businessId: context.businessId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!message) throw new NotFoundException('Mensaje no encontrado');

      const preference = await this.findReadReceiptPreference(tx, context);
      if (!preference.enabled) {
        return {
          messageId,
          read: false,
          receiptsEnabled: false,
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
        membershipBusinessId: context.businessId,
      };
    }

    if (context.customerId) {
      return {
        customerId: context.customerId,
        customerBusinessId: context.businessId,
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
        authorMembershipBusinessId: context.businessId,
      };
    }

    if (context.customerId) {
      return {
        authorCustomerId: context.customerId,
        authorCustomerBusinessId: context.businessId,
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
