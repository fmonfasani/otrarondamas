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
  } as unknown as MessagingService;
  const gateway = {
    publishMessageCreated: jest.fn(),
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
