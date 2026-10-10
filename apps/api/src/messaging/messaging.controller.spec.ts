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
  } as unknown as MessagingService;
  const gateway = {
    publishMessageCreated: jest.fn(),
    publishMessageUpdated: jest.fn(),
    publishMessageDeleted: jest.fn(),
    publishMessageRead: jest.fn(),
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
    expect(result).toEqual(expect.objectContaining({
      id: 'message-a',
      sequence: '7',
      content: 'Hola',
    }));
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('publishes a canonical update event after an edit succeeds', async () => {
    const updated = { ...message, content: 'Editado', editedAt: new Date('2026-10-09T12:01:00.000Z') };
    (service.editMessage as jest.Mock).mockResolvedValue(updated);

    await expect(controller.editMessage(user, 'conversation-a', 'message-a', {
      content: 'Editado',
    } as any)).resolves.toEqual(updated);

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

    await expect(controller.deleteMessage(user, 'conversation-a', 'message-a')).resolves.toEqual(deleted);

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

  it('does not publish an event when the HTTP mutation fails', async () => {
    (service.editMessage as jest.Mock).mockRejectedValue(new Error('write failed'));

    await expect(controller.editMessage(user, 'conversation-a', 'message-a', {
      content: 'Editado',
    } as any)).rejects.toThrow('write failed');
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
});
