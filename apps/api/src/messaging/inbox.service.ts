import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BusinessContextService } from '../business-context/business-context.service';
import type { BusinessContext } from '../business-context/business-context.types';
import { hasCanonicalPermission } from '../authorization/canonical-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { LABEL_COLORS, type LabelColor } from './labels';

/** E6a — like WhatsApp: at most 3 chats pinned on top. */
export const MAX_PINNED = 3;
/** «Silenciar siempre» is a date far away. */
const MUTED_FOREVER = new Date('2100-01-01T00:00:00Z');
const MAX_LABELS = 30;

export type LabelWire = { id: string; nombre: string; color: LabelColor };

/** What the inbox adds to each conversation for the person looking (E6a). */
export type InboxExtras = {
  fijado: boolean;
  archivado: boolean;
  silenciadoHasta: string | null;
  asignadoA: { userId: string; nombre: string } | null;
  etiquetas: LabelWire[];
};

/**
 * E6a (messaging like WhatsApp Business) — each team member's inbox (pin, archive, mute), the
 * team member in charge of a customer chat, and customer labels.
 *
 * Owner decisions (2026-11-26): Owner/Admin assign chats and make the labels; anyone on the
 * team puts labels on a customer; the customer never sees either.
 */
@Injectable()
export class MessagingInboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessContext: BusinessContextService,
  ) {}

  private async staffContext(
    auth: AuthenticatedUser,
  ): Promise<BusinessContext & { userId: string }> {
    if (auth.type === 'cliente') throw new ForbiddenException('Solo para el equipo');
    const context = await this.businessContext.resolveForAuthenticatedUser(auth);
    if (!context.userId) throw new ForbiddenException('Solo para el equipo');
    return context as BusinessContext & { userId: string };
  }

  /** Owner/Admin only (MESSAGING_MANAGE), checked here too whatever the route guard does. */
  private async managerContext(auth: AuthenticatedUser) {
    const context = await this.staffContext(auth);
    if (!hasCanonicalPermission(context.role, 'MESSAGING_MANAGE')) {
      throw new ForbiddenException('Solo el dueño o un administrador');
    }
    return context;
  }

  /** A conversation this person may see: a participant, or Owner/Admin (who see them all). */
  private async visibleConversation(
    context: BusinessContext & { userId: string },
    conversationId: string,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        businessId: context.businessId,
        deletedAt: null,
        ...(hasCanonicalPermission(context.role, 'MESSAGING_MANAGE')
          ? {}
          : {
              ConversationParticipant: {
                some: { userId: context.userId, leftAt: null, removedAt: null },
              },
            }),
      },
      select: { id: true, createdAt: true, assignedUserId: true },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');
    return conversation;
  }

  private async savePreference(
    context: BusinessContext & { userId: string },
    conversationId: string,
    data: Prisma.ConversationPreferenceUncheckedUpdateInput,
  ) {
    await this.prisma.conversationPreference.upsert({
      where: { conversationId_userId: { conversationId, userId: context.userId } },
      create: {
        businessId: context.businessId,
        conversationId,
        userId: context.userId,
        ...(data as Prisma.ConversationPreferenceUncheckedCreateInput),
      },
      update: data,
    });
  }

  /** Pins a chat on top of this person's inbox (at most 3), or unpins it. */
  async setPinned(auth: AuthenticatedUser, conversationId: string, pinned: boolean) {
    const context = await this.staffContext(auth);
    await this.visibleConversation(context, conversationId);
    if (pinned) {
      const others = await this.prisma.conversationPreference.count({
        where: {
          businessId: context.businessId,
          userId: context.userId,
          pinnedAt: { not: null },
          conversationId: { not: conversationId },
          Conversation: { deletedAt: null },
        },
      });
      if (others >= MAX_PINNED) {
        throw new ConflictException(`Podés fijar hasta ${MAX_PINNED} chats`);
      }
    }
    await this.savePreference(context, conversationId, { pinnedAt: pinned ? new Date() : null });
    return { fijado: pinned };
  }

  /**
   * Archives a chat out of this person's inbox; a new message brings it back (WhatsApp). An
   * archived chat is no longer pinned.
   */
  async setArchived(auth: AuthenticatedUser, conversationId: string, archived: boolean) {
    const context = await this.staffContext(auth);
    await this.visibleConversation(context, conversationId);
    await this.savePreference(
      context,
      conversationId,
      archived ? { archivedAt: new Date(), pinnedAt: null } : { archivedAt: null },
    );
    return { archivado: archived };
  }

  /** Mutes a chat for 8 hours, a week, or always (`hours` null); no sound, push or e-mail. */
  async setMuted(auth: AuthenticatedUser, conversationId: string, hours: number | null | false) {
    const context = await this.staffContext(auth);
    await this.visibleConversation(context, conversationId);
    let until: Date | null = null;
    if (hours === null) until = MUTED_FOREVER;
    else if (hours !== false) until = new Date(Date.now() + hours * 60 * 60 * 1000);
    await this.savePreference(context, conversationId, { mutedUntil: until });
    return { silenciadoHasta: until?.toISOString() ?? null };
  }

  /**
   * Gives a customer chat to a team member (Owner/Admin only, checked by the route). They join
   * it seeing the whole history; whoever had it before leaves it, unless they read every chat
   * anyway (Owner/Admin) or they run the conversation.
   */
  async assign(auth: AuthenticatedUser, conversationId: string, userId: string | null) {
    const context = await this.managerContext(auth);
    const conversation = await this.visibleConversation(context, conversationId);
    const withCustomer = await this.prisma.conversationParticipant.count({
      where: {
        conversationId,
        businessId: context.businessId,
        customerId: { not: null },
        leftAt: null,
        removedAt: null,
      },
    });
    if (withCustomer === 0) throw new BadRequestException('Solo se asignan los chats con clientes');
    let assignee: { userId: string; role: string } | null = null;
    if (userId) {
      assignee = await this.prisma.membership.findFirst({
        where: { businessId: context.businessId, userId, status: MembershipStatus.ACTIVE },
        select: { userId: true, role: true },
      });
      if (!assignee) throw new BadRequestException('Esa persona no es parte del equipo');
    }
    const previous = conversation.assignedUserId;
    await this.prisma.$transaction(async (tx) => {
      if (assignee) {
        const active = await tx.conversationParticipant.findFirst({
          where: {
            conversationId,
            businessId: context.businessId,
            userId: assignee.userId,
            leftAt: null,
            removedAt: null,
          },
          select: { id: true },
        });
        if (!active) {
          await tx.conversationParticipant.create({
            data: {
              conversationId,
              businessId: context.businessId,
              userId: assignee.userId,
              // The whole history, like the person who had the chat before.
              joinedAt: conversation.createdAt,
            },
          });
        }
      }
      if (previous && previous !== assignee?.userId) {
        const before = await tx.membership.findFirst({
          where: { businessId: context.businessId, userId: previous },
          select: { role: true },
        });
        if (!before || !hasCanonicalPermission(before.role, 'MESSAGING_MANAGE')) {
          await tx.conversationParticipant.updateMany({
            where: {
              conversationId,
              businessId: context.businessId,
              userId: previous,
              isAdmin: false,
              leftAt: null,
              removedAt: null,
            },
            data: { removedAt: new Date() },
          });
        }
      }
      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          assignedUserId: assignee?.userId ?? null,
          assignedAt: assignee ? new Date() : null,
        },
      });
    });
    return { asignadoA: assignee?.userId ?? null, anterior: previous };
  }

  /** The team members a chat can be given to (active memberships of this Business). */
  async assignableTeam(auth: AuthenticatedUser) {
    const context = await this.managerContext(auth);
    const members = await this.prisma.membership.findMany({
      where: { businessId: context.businessId, status: MembershipStatus.ACTIVE },
      select: { userId: true, role: true, User: { select: { nombre: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((m) => ({ userId: m.userId, nombre: m.User.nombre, rol: m.role }));
  }

  // ---------------------------------------------------------------- customer labels

  async listLabels(auth: AuthenticatedUser): Promise<LabelWire[]> {
    const context = await this.staffContext(auth);
    const labels = await this.prisma.customerLabel.findMany({
      where: { businessId: context.businessId },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, color: true },
    });
    return labels.map((l) => ({ ...l, color: l.color as LabelColor }));
  }

  private checkLabel(nombre: string, color: string) {
    const clean = nombre.replace(/\s+/g, ' ').trim();
    if (!clean || clean.length > 30)
      throw new BadRequestException('La etiqueta lleva un nombre de hasta 30 letras');
    if (!(LABEL_COLORS as readonly string[]).includes(color))
      throw new BadRequestException('Color inválido');
    return clean;
  }

  async createLabel(auth: AuthenticatedUser, nombre: string, color: string): Promise<LabelWire> {
    const context = await this.managerContext(auth);
    const clean = this.checkLabel(nombre, color);
    const count = await this.prisma.customerLabel.count({
      where: { businessId: context.businessId },
    });
    if (count >= MAX_LABELS)
      throw new ConflictException(`Puede haber hasta ${MAX_LABELS} etiquetas`);
    try {
      const label = await this.prisma.customerLabel.create({
        data: { businessId: context.businessId, nombre: clean, color },
        select: { id: true, nombre: true, color: true },
      });
      return { ...label, color: label.color as LabelColor };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya hay una etiqueta con ese nombre');
      }
      throw error;
    }
  }

  async updateLabel(auth: AuthenticatedUser, labelId: string, nombre: string, color: string) {
    const context = await this.managerContext(auth);
    const clean = this.checkLabel(nombre, color);
    const found = await this.prisma.customerLabel.findFirst({
      where: { id: labelId, businessId: context.businessId },
    });
    if (!found) throw new NotFoundException('Etiqueta no encontrada');
    try {
      const label = await this.prisma.customerLabel.update({
        where: { id: labelId },
        data: { nombre: clean, color },
        select: { id: true, nombre: true, color: true },
      });
      return { ...label, color: label.color as LabelColor };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya hay una etiqueta con ese nombre');
      }
      throw error;
    }
  }

  /** Deletes a label and takes it off every customer. */
  async deleteLabel(auth: AuthenticatedUser, labelId: string) {
    const context = await this.managerContext(auth);
    const found = await this.prisma.customerLabel.findFirst({
      where: { id: labelId, businessId: context.businessId },
    });
    if (!found) throw new NotFoundException('Etiqueta no encontrada');
    await this.prisma.$transaction([
      this.prisma.customerLabelAssignment.deleteMany({
        where: { labelId, businessId: context.businessId },
      }),
      this.prisma.customerLabel.delete({ where: { id: labelId } }),
    ]);
  }

  /** Puts a label on a customer of this Business, or takes it off. */
  async setCustomerLabel(
    auth: AuthenticatedUser,
    customerId: string,
    labelId: string,
    on: boolean,
  ) {
    const context = await this.staffContext(auth);
    const [label, customer] = await Promise.all([
      this.prisma.customerLabel.findFirst({
        where: { id: labelId, businessId: context.businessId },
        select: { id: true },
      }),
      this.prisma.cliente.findFirst({
        where: { id: customerId, empresaId: context.businessId },
        select: { id: true },
      }),
    ]);
    if (!label || !customer) throw new NotFoundException('Cliente o etiqueta no encontrados');
    if (on) {
      await this.prisma.customerLabelAssignment.upsert({
        where: { labelId_customerId: { labelId, customerId } },
        create: { businessId: context.businessId, labelId, customerId },
        update: {},
      });
    } else {
      await this.prisma.customerLabelAssignment.deleteMany({
        where: { labelId, customerId, businessId: context.businessId },
      });
    }
    return this.customerLabels(context.businessId, [customerId]).then(
      (m) => m.get(customerId) ?? [],
    );
  }

  private async customerLabels(businessId: string, customerIds: string[]) {
    const byCustomer = new Map<string, LabelWire[]>();
    if (customerIds.length === 0) return byCustomer;
    const rows = await this.prisma.customerLabelAssignment.findMany({
      where: { businessId, customerId: { in: customerIds } },
      select: {
        customerId: true,
        CustomerLabel: { select: { id: true, nombre: true, color: true } },
      },
      orderBy: { CustomerLabel: { nombre: 'asc' } },
    });
    for (const row of rows) {
      const list = byCustomer.get(row.customerId) ?? [];
      list.push({ ...row.CustomerLabel, color: row.CustomerLabel.color as LabelColor });
      byCustomer.set(row.customerId, list);
    }
    return byCustomer;
  }

  // ---------------------------------------------------------------- the inbox

  /**
   * Adds, for the person looking, whether each chat is pinned, archived (until a newer message
   * from someone else) or muted, who is in charge of it, and the customer's labels.
   */
  async decorate<
    T extends {
      id: string;
      assignedUserId?: string | null;
      participants: Array<{ userId: string | null; customerId: string | null; name: string }>;
      lastMessage?: { createdAt: Date | string; authorUserId: string | null } | null;
    },
  >(auth: AuthenticatedUser, rows: T[]): Promise<Array<T & InboxExtras>> {
    if (auth.type === 'cliente' || rows.length === 0) {
      return rows.map((row) => ({
        ...row,
        fijado: false,
        archivado: false,
        silenciadoHasta: null,
        asignadoA: null,
        etiquetas: [],
      }));
    }
    const context = await this.staffContext(auth);
    const ids = rows.map((r) => r.id);
    const customerIds = [
      ...new Set(
        rows.flatMap((r) => r.participants.flatMap((p) => (p.customerId ? [p.customerId] : []))),
      ),
    ];
    const assigneeIds = [
      ...new Set(rows.flatMap((r) => (r.assignedUserId ? [r.assignedUserId] : []))),
    ];
    const [preferences, labels, assignees] = await Promise.all([
      this.prisma.conversationPreference.findMany({
        where: {
          businessId: context.businessId,
          userId: context.userId,
          conversationId: { in: ids },
        },
      }),
      this.customerLabels(context.businessId, customerIds),
      assigneeIds.length
        ? this.prisma.membership.findMany({
            where: { businessId: context.businessId, userId: { in: assigneeIds } },
            select: { userId: true, User: { select: { nombre: true } } },
          })
        : Promise.resolve([]),
    ]);
    const prefs = new Map(preferences.map((p) => [p.conversationId, p]));
    const names = new Map(assignees.map((a) => [a.userId, a.User.nombre]));
    const now = Date.now();
    return rows.map((row) => {
      const pref = prefs.get(row.id);
      const last = row.lastMessage;
      // WhatsApp: a new message from someone else brings an archived chat back.
      const newer =
        last && pref?.archivedAt && last.authorUserId !== context.userId
          ? new Date(last.createdAt).getTime() > pref.archivedAt.getTime()
          : false;
      const customer = row.participants.find((p) => p.customerId)?.customerId;
      return {
        ...row,
        fijado: Boolean(pref?.pinnedAt),
        archivado: Boolean(pref?.archivedAt) && !newer,
        silenciadoHasta:
          pref?.mutedUntil && pref.mutedUntil.getTime() > now
            ? pref.mutedUntil.toISOString()
            : null,
        asignadoA: row.assignedUserId
          ? { userId: row.assignedUserId, nombre: names.get(row.assignedUserId) ?? 'Equipo' }
          : null,
        etiquetas: customer ? (labels.get(customer) ?? []) : [],
      };
    });
  }
}
