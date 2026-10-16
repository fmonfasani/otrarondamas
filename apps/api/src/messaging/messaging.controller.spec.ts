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

  // M4-05 — ordering is proven with a controlled persistence promise and a
  // shared call log: the publish call must follow the commit marker, not
  // merely occur once.
  describe('M4-05 — publication ordering and persistence failure', () => {
    type CreateBody = Parameters<MessagingController['createMessage']>[2];
    type EditBody = Parameters<MessagingController['editMessage']>[3];

    const deferred = <T>() => {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>((res) => {
        resolve = res;
      });
      return { promise, resolve };
    };

    const createDto: CreateBody = { clientMessageId: 'client-a', content: 'Hola' };
    const editDto: EditBody = { content: 'Editado' };

    it('publishes a created event only after the persistence promise resolves', async () => {
      const log: string[] = [];
      const persisted = deferred<typeof message>();
      (service.createTextMessage as jest.Mock).mockReturnValueOnce(persisted.promise);
      (gateway.publishMessageCreated as jest.Mock).mockImplementationOnce(() => {
        log.push('published');
      });

      const pending = controller.createMessage(user, 'conversation-a', createDto);
      expect(gateway.publishMessageCreated).not.toHaveBeenCalled();

      log.push('committed');
      persisted.resolve(message);
      await pending;

      expect(log).toEqual(['committed', 'published']);
    });

    it('does not publish a created event when persistence fails', async () => {
      (service.createTextMessage as jest.Mock).mockRejectedValueOnce(new Error('write failed'));

      const attempt = controller.createMessage(user, 'conversation-a', createDto);
      await expect(attempt).rejects.toThrow('write failed');
      expect(gateway.publishMessageCreated).not.toHaveBeenCalled();
    });

    it('publishes an update event only after the edit persistence resolves', async () => {
      const log: string[] = [];
      const updated = {
        ...message,
        content: 'Editado',
        editedAt: new Date('2026-10-09T12:01:00.000Z'),
      };
      const persisted = deferred<typeof updated>();
      (service.editMessage as jest.Mock).mockReturnValueOnce(persisted.promise);
      (gateway.publishMessageUpdated as jest.Mock).mockImplementationOnce(() => {
        log.push('published');
      });

      const pending = controller.editMessage(user, 'conversation-a', 'message-a', editDto);
      expect(gateway.publishMessageUpdated).not.toHaveBeenCalled();

      log.push('committed');
      persisted.resolve(updated);
      await expect(pending).resolves.toEqual(updated);

      expect(log).toEqual(['committed', 'published']);
    });

    it('publishes a deletion event only after the delete persistence resolves', async () => {
      const log: string[] = [];
      const deleted = {
        ...message,
        content: null,
        deletedAt: new Date('2026-10-09T12:02:00.000Z'),
      };
      const persisted = deferred<typeof deleted>();
      (service.deleteMessage as jest.Mock).mockReturnValueOnce(persisted.promise);
      (gateway.publishMessageDeleted as jest.Mock).mockImplementationOnce(() => {
        log.push('published');
      });

      const pending = controller.deleteMessage(user, 'conversation-a', 'message-a');
      expect(gateway.publishMessageDeleted).not.toHaveBeenCalled();

      log.push('committed');
      persisted.resolve(deleted);
      await expect(pending).resolves.toEqual(deleted);

      expect(log).toEqual(['committed', 'published']);
    });

    it('does not publish a deletion event when delete persistence fails', async () => {
      (service.deleteMessage as jest.Mock).mockRejectedValueOnce(new Error('write failed'));

      const attempt = controller.deleteMessage(user, 'conversation-a', 'message-a');
      await expect(attempt).rejects.toThrow('write failed');
      expect(gateway.publishMessageDeleted).not.toHaveBeenCalled();
    });
  });
});
