import { Injectable, Logger } from '@nestjs/common';
import {
  MembershipStatus,
  MessagingAssociationType,
  MessagingConversationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * OR-B4-035 rule 12 — each step of a return posts a message in the customer's conversation
 * with the Business (the one the store chat shows). Without a conversation, one is opened
 * DIRECT with the Owner, as the store chat does (OR-B4-031). The message is authored by a
 * staff participant of the conversation (its admin, else the Owner).
 *
 * In V1 the messaging Business is the Empresa and the messaging Customer is the Cliente,
 * so both ids come straight from the return. The post is idempotent per return and step
 * (`clientMessageId`) and best effort: a failure is logged and never undoes the return.
 */
@Injectable()
export class ReturnNotifierService {
  private readonly logger = new Logger(ReturnNotifierService.name);

  constructor(private readonly prisma: PrismaService) {}

  async notify(
    companyId: string,
    customerId: string,
    returnId: string,
    step: string,
    text: string,
  ) {
    try {
      await this.post(companyId, customerId, `devolucion-${returnId}-${step}`, text);
    } catch (error) {
      this.logger.warn(
        `No se pudo avisar al cliente de la devolución ${returnId} (${step}): ${(error as Error).message}`,
      );
    }
  }

  private async post(
    businessId: string,
    customerId: string,
    clientMessageId: string,
    text: string,
  ) {
    await this.prisma.$transaction(
      async (tx) => {
        const conversationId =
          (await this.findConversation(tx, businessId, customerId)) ??
          (await this.openConversation(tx, businessId, customerId));
        if (!conversationId) return;

        const exists = await tx.message.findFirst({
          where: { conversationId, businessId, clientMessageId, authorCustomerId: null },
          select: { id: true },
        });
        if (exists) return;

        const author = await this.author(tx, businessId, conversationId);
        if (!author) return;
        const last = await tx.message.findFirst({
          where: { conversationId, businessId },
          orderBy: { sequence: 'desc' },
          select: { sequence: true },
        });
        await tx.message.create({
          data: {
            conversationId,
            businessId,
            authorUserId: author,
            authorMembershipBusinessId: businessId,
            sequence: (last?.sequence ?? BigInt(0)) + BigInt(1),
            clientMessageId,
            type: 'TEXT',
            content: text,
          },
        });
        await tx.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async findConversation(
    tx: Prisma.TransactionClient,
    businessId: string,
    customerId: string,
  ) {
    const conversation = await tx.conversation.findFirst({
      where: {
        businessId,
        deletedAt: null,
        ConversationParticipant: {
          some: { businessId, customerId, leftAt: null, removedAt: null },
        },
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    return conversation?.id ?? null;
  }

  private async owner(tx: Prisma.TransactionClient, businessId: string) {
    const owner = await tx.membership.findFirst({
      where: { businessId, role: 'OWNER', status: MembershipStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    });
    return owner?.userId ?? null;
  }

  private async openConversation(
    tx: Prisma.TransactionClient,
    businessId: string,
    customerId: string,
  ) {
    const ownerId = await this.owner(tx, businessId);
    if (!ownerId) return null;
    const conversation = await tx.conversation.create({
      data: { businessId, type: MessagingConversationType.DIRECT },
    });
    await tx.conversationParticipant.createMany({
      data: [
        {
          conversationId: conversation.id,
          businessId,
          userId: ownerId,
          membershipBusinessId: businessId,
          isAdmin: true,
        },
        { conversationId: conversation.id, businessId, customerId, customerBusinessId: businessId },
      ],
    });
    await tx.conversationAssociation.create({
      data: {
        conversationId: conversation.id,
        businessId,
        entityType: MessagingAssociationType.CUSTOMER,
        entityId: customerId,
        reason: 'Aviso de una devolución',
      },
    });
    return conversation.id;
  }

  /** A staff participant who can sign the notice: the conversation's admin, else the Owner. */
  private async author(tx: Prisma.TransactionClient, businessId: string, conversationId: string) {
    const staff = await tx.conversationParticipant.findFirst({
      where: {
        conversationId,
        businessId,
        userId: { not: null },
        leftAt: null,
        removedAt: null,
      },
      orderBy: [{ isAdmin: 'desc' }, { joinedAt: 'asc' }],
      select: { userId: true },
    });
    return staff?.userId ?? (await this.owner(tx, businessId));
  }
}
