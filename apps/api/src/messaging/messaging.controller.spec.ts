jest.mock('./messaging.gateway', () => ({
  MessagingGateway: class MessagingGatewayMock {},
}));

import { MessagingController } from './messaging.controller';
import type { MessagingService } from './messaging.service';
import type { MessagingGateway } from './messaging.gateway';

describe('MessagingController — HTTP JSON contract', () => {
  const user = { id: 'user-a' } as any;
  const message = {
    id: 'message-a',
    conversationId: 'conversation-a',
    clientMessageId: 'client-a',
    content: 'Hola',
    sequence: BigInt(7),
    createdAt: new Date('2026-10-09T12:00:00.000Z'),
    authorUserId: 'user-a',
    authorCustomerId: null,
  };

  const service = {
    createTextMessage: jest.fn(),
    getMessages: jest.fn(),
    editMessage: jest.fn(),
    deleteMessage: jest.fn(),
    markMessageRead: jest.fn(),
    removeParticipant: jest.fn(),
  } as unknown as MessagingService;
  const gateway = {
    publishMessageCreated: jest.fn(),
    publishMessageUpdated: jest.fn(),
    publishMessageDeleted: jest.fn(),
    publishMessageRead: jest.fn(),
    publishParticipantRemoved: jest.fn(),
  } as unknown as MessagingGateway;

  let controller: MessagingController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new MessagingController(service, gateway);
  });

  it('returns a JSON-safe sequence after a persisted message is created', async () => {
    (service.createTextMessage as jest.Mock).mockResolvedValue(message);

    const result = await controller.createMessage(user, 'conversation-a', {
      clientMessageId: 'client-a',
      content: 'Hola',
    } as any);

    expect(gateway.publishMessageCreated).toHaveBeenCalledWith(
      expect.objectContaining({ sequence: BigInt(7), conversationId: 'conversation-a' }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'message-a',
        sequence: '7',
        content: 'Hola',
      }),
    );
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('publishes a canonical update event after an edit succeeds', async () => {
    const updated = {
      ...message,
      content: 'Editado',
      editedAt: new Date('2026-10-09T12:01:00.000Z'),
    };
    (service.editMessage as jest.Mock).mockResolvedValue(updated);

    const result = await controller.editMessage(user, 'conversation-a', 'message-a', {
      content: 'Editado',
    } as any);

    // The committed edit is answered with the canonical wire shape: BigInt
    // sequence as a string and Dates as ISO strings, so the body is JSON-safe
    // and identical to what Socket.IO emits.
    expect(result).toEqual(
      expect.objectContaining({
        id: 'message-a',
        sequence: '7',
        content: 'Editado',
        editedAt: '2026-10-09T12:01:00.000Z',
        createdAt: updated.createdAt.toISOString(),
      }),
    );
    expect(() => JSON.stringify(result)).not.toThrow();

    expect(gateway.publishMessageUpdated).toHaveBeenCalledWith({
      id: 'message-a',
      conversationId: 'conversation-a',
      content: 'Editado',
      editedAt: updated.editedAt,
    });
  });

  it('publishes deletion metadata without message content', async () => {
    const deleted = { ...message, content: null, deletedAt: new Date('2026-10-09T12:02:00.000Z') };
    (service.deleteMessage as jest.Mock).mockResolvedValue(deleted);

    const result = await controller.deleteMessage(user, 'conversation-a', 'message-a');
    expect(result).toEqual(
      expect.objectContaining({
        id: 'message-a',
        sequence: '7',
        content: null,
        deletedAt: '2026-10-09T12:02:00.000Z',
      }),
    );
    // Tenancy columns never reach the wire: the serializer is an allowlist,
    // not a spread of the Prisma row.
    expect(result).not.toHaveProperty('businessId');
    expect(result).not.toHaveProperty('deletedByUserId');
    expect(() => JSON.stringify(result)).not.toThrow();

    expect(gateway.publishMessageDeleted).toHaveBeenCalledWith({
      id: 'message-a',
      conversationId: 'conversation-a',
      deletedAt: deleted.deletedAt,
    });
    expect(gateway.publishMessageDeleted.mock.calls[0][0]).not.toHaveProperty('content');
  });

  it('publishes a read event only when the receipt is enabled and persisted', async () => {
    (service.markMessageRead as jest.Mock).mockResolvedValue({
      messageId: 'message-a',
      read: true,
      receiptsEnabled: true,
      readAt: new Date('2026-10-09T12:03:00.000Z'),
    });

    await controller.markMessageRead(user, 'conversation-a', 'message-a');

    expect(gateway.publishMessageRead).toHaveBeenCalledWith({
      messageId: 'message-a',
      conversationId: 'conversation-a',
      readAt: new Date('2026-10-09T12:03:00.000Z'),
    });

    jest.clearAllMocks();
    (service.markMessageRead as jest.Mock).mockResolvedValue({
      messageId: 'message-a',
      read: false,
      receiptsEnabled: false,
    });
    await controller.markMessageRead(user, 'conversation-a', 'message-a');
    expect(gateway.publishMessageRead).not.toHaveBeenCalled();
  });

  it('does not turn a committed mutation into an HTTP error when realtime publishing throws', async () => {
    const boom = () => {
      throw new Error('socket transport down');
    };
    (gateway.publishMessageCreated as jest.Mock).mockImplementation(boom);
    (gateway.publishMessageUpdated as jest.Mock).mockImplementation(boom);
    (gateway.publishMessageDeleted as jest.Mock).mockImplementation(boom);
    (gateway.publishMessageRead as jest.Mock).mockImplementation(boom);
    (service.createTextMessage as jest.Mock).mockResolvedValue(message);
    (service.editMessage as jest.Mock).mockResolvedValue({ ...message, editedAt: new Date() });
    (service.deleteMessage as jest.Mock).mockResolvedValue({
      ...message,
      content: null,
      deletedAt: new Date(),
    });
    (service.markMessageRead as jest.Mock).mockResolvedValue({
      messageId: 'message-a',
      read: true,
      readAt: new Date(),
    });

    const created = await controller.createMessage(user, 'conversation-a', {
      clientMessageId: 'client-a',
      content: 'Hola',
    } as any);
    const edited = await controller.editMessage(user, 'conversation-a', 'message-a', {
      content: 'Editado',
    } as any);
    const deleted = await controller.deleteMessage(user, 'conversation-a', 'message-a');
    const read = await controller.markMessageRead(user, 'conversation-a', 'message-a');

    expect(created).toEqual(expect.objectContaining({ id: 'message-a', sequence: '7' }));
    expect(edited).toEqual(expect.objectContaining({ id: 'message-a' }));
    expect(deleted).toEqual(expect.objectContaining({ id: 'message-a' }));
    expect(read).toEqual(expect.objectContaining({ read: true }));
    expect(gateway.publishMessageCreated).toHaveBeenCalledTimes(1);
  });

  it('still reports a real persistence failure on send and publishes nothing', async () => {
    (service.createTextMessage as jest.Mock).mockRejectedValue(new Error('database unavailable'));

    await expect(
      controller.createMessage(user, 'conversation-a', {
        clientMessageId: 'client-a',
        content: 'Hola',
      } as any),
    ).rejects.toThrow('database unavailable');
    expect(gateway.publishMessageCreated).not.toHaveBeenCalled();
  });

  it('does not publish an event when the HTTP mutation fails', async () => {
    (service.editMessage as jest.Mock).mockRejectedValue(new Error('write failed'));

    await expect(
      controller.editMessage(user, 'conversation-a', 'message-a', {
        content: 'Editado',
      } as any),
    ).rejects.toThrow('write failed');
    expect(gateway.publishMessageUpdated).not.toHaveBeenCalled();
  });

  it('returns a JSON-safe sequence for every message in the HTTP history', async () => {
    (service.getMessages as jest.Mock).mockResolvedValue([
      message,
      { ...message, id: 'message-b', sequence: BigInt(8) },
    ]);

    const result = await controller.getMessages(user, 'conversation-a');

    expect(result.map((row) => row.sequence)).toEqual(['7', '8']);
    expect(() => JSON.stringify(result)).not.toThrow();
    expect(service.getMessages).toHaveBeenCalledWith(user, 'conversation-a');
  });

  describe('Participant removal (M4-04 — membership revocation enforcement)', () => {
    const participant = {
      id: 'participant-a',
      conversationId: 'conversation-a',
      userId: 'user-b',
      customerId: null,
      joinedAt: new Date('2026-10-01T10:00:00.000Z'),
      leftAt: new Date('2026-10-18T12:00:00.000Z'),
      removedAt: null,
      isAdmin: false,
      businessId: 'business-a',
    };

    it('publishes a participant.removed event after removal succeeds', async () => {
      const removed = { ...participant, removedAt: new Date('2026-10-18T12:01:00.000Z') };
      (service.removeParticipant as jest.Mock).mockResolvedValue(removed);

      const result = await controller.removeParticipant(user, 'conversation-a', 'participant-a');

      expect(result).toEqual(removed);
      expect(gateway.publishParticipantRemoved).toHaveBeenCalledWith({
        conversationId: 'conversation-a',
        participantId: 'participant-a',
        userId: 'user-b',
        customerId: null,
        removedAt: removed.removedAt,
        leftAt: removed.leftAt,
      });
    });

    it('does not turn a committed removal into an HTTP error when realtime publishing throws', async () => {
      const removed = { ...participant, removedAt: new Date('2026-10-18T12:01:00.000Z') };
      (service.removeParticipant as jest.Mock).mockResolvedValue(removed);
      (gateway.publishParticipantRemoved as jest.Mock).mockImplementation(() => {
        throw new Error('socket transport down');
      });

      const result = await controller.removeParticipant(user, 'conversation-a', 'participant-a');

      expect(result).toEqual(removed);
    });
  });
});
