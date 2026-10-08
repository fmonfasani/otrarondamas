import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MembershipStatus,
  MessagingConversationType,
  Prisma,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BusinessContextService } from '../business-context/business-context.service';
import { PrismaService } from '../prisma/prisma.service';
import type { BusinessContext } from '../business-context/business-context.types';
import { CreateConversationDto, ConversationTypeDto } from './dto/create-conversation.dto';

const MAX_GROUP_PARTICIPANTS = 50;

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessContext: BusinessContextService,
  ) {}

  async createConversation(
    auth: AuthenticatedUser,
    dto: CreateConversationDto,
  ) {
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
      throw new ConflictException(
        'Una conversación DIRECT requiere exactamente otro participante',
      );
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
        }

        return this.getConversationForActor(tx, conversation.id, context);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async createTextMessage(auth: AuthenticatedUser, conversationId: string, clientMessageId: string, content: string, replyToMessageId?: string) {
    const context = await this.resolveContext(auth);
    return this.prisma.$transaction(async (tx) => {
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
            ...this.actorFromContext(context),
            sequence,
            clientMessageId,
            type: 'TEXT',
            content,
            replyToMessageId,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('El clientMessageId ya fue utilizado en esta conversación por el actor');
        }
        throw error;
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async getMessages(auth: AuthenticatedUser, conversationId: string) {
    const context = await this.resolveContext(auth);
    const isOwner = context.role === 'OWNER' && context.userId !== null;
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, businessId: context.businessId, deletedAt: null },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');

    let joinedAt: Date | undefined;
    if (!isOwner) {
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
      include: { reactions: true },
    });
  }

  async editMessage(auth: AuthenticatedUser, conversationId: string, messageId: string, content: string) {
    const context = await this.resolveContext(auth);
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
    if (!isAuthor) await this.assertConversationAdmin(this.prisma, conversationId, context);

    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedByUserId: context.userId ?? null, content: null },
    });
  }

  async getConversation(auth: AuthenticatedUser, conversationId: string) {
    const context = await this.resolveContext(auth);
    return this.getConversationForActor(this.prisma, conversationId, context);
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
      throw new ConflictException(
        'Debe especificarse exactamente un User o un Customer',
      );
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

  async removeParticipant(
    auth: AuthenticatedUser,
    conversationId: string,
    participantId: string,
  ) {
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

  async transferAdmin(
    auth: AuthenticatedUser,
    conversationId: string,
    participantId: string,
  ) {
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
        },
        select: { id: true },
      });

      if (customers.length !== customerIds.length) {
        throw new ForbiddenException('Uno o más Customers no pertenecen al Business');
      }
    }
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
    if (context.role !== 'OWNER') {
      throw new ForbiddenException('Solo Owner puede administrar la conversación en esta fase');
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
        participants: {
          where: { leftAt: null, removedAt: null },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const isOwner = context.role === 'OWNER' && context.userId !== null;
    if (!isOwner) {
      await this.assertActiveParticipant(tx, conversationId, context);
    }

    return conversation;
  }
}
