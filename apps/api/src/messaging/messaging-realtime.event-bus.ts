import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export type MessagingRealtimeEvent =
  | {
      name: 'conversation.message.created';
      conversationId: string;
      businessId: string;
      payload: Record<string, unknown>;
    }
  | {
      name: 'conversation.message.updated';
      conversationId: string;
      businessId: string;
      payload: Record<string, unknown>;
    }
  | {
      name: 'conversation.message.deleted';
      conversationId: string;
      businessId: string;
      payload: Record<string, unknown>;
    }
  | {
      name: 'conversation.message.read';
      conversationId: string;
      businessId: string;
      payload: Record<string, unknown>;
    };

@Injectable()
export class MessagingRealtimeEventBus {
  private readonly events = new Subject<MessagingRealtimeEvent>();

  publish(event: MessagingRealtimeEvent) {
    this.events.next(event);
  }

  subscribe(handler: (event: MessagingRealtimeEvent) => void): () => void {
    const subscription = this.events.subscribe(handler);
    return () => subscription.unsubscribe();
  }
}
