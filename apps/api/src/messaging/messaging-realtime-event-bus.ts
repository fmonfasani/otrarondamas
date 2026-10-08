import { Injectable } from '@nestjs/common';

export type MessagingRealtimeEvent =
  | {
      type: 'conversation.message.created';
      businessId: string;
      conversationId: string;
      messageId: string;
      sequence: string;
    }
  | {
      type: 'conversation.message.updated';
      businessId: string;
      conversationId: string;
      messageId: string;
      editedAt: string;
    }
  | {
      type: 'conversation.message.deleted';
      businessId: string;
      conversationId: string;
      messageId: string;
      deletedAt: string;
    }
  | {
      type: 'conversation.message.read';
      businessId: string;
      conversationId: string;
      messageId: string;
      userId?: string;
      customerId?: string;
      readAt: string;
    };

@Injectable()
export class MessagingRealtimeEventBus {
  private readonly handlers = new Set<(event: MessagingRealtimeEvent) => void>();

  publish(event: MessagingRealtimeEvent): void {
    for (const handler of this.handlers) handler(event);
  }

  subscribe(handler: (event: MessagingRealtimeEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}
