import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Socket } from 'socket.io';

/**
 * M4-01 — Messaging realtime gateway foundation.
 *
 * This gateway establishes the Socket.IO transport boundary only. Authentication,
 * BusinessContext resolution, room authorization, revocation and domain event
 * publication are introduced by later M4 slices.
 */
@WebSocketGateway({
  namespace: '/messaging',
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  handleConnection(@ConnectedSocket() client: Socket): void {
    client.disconnect(true);
  }

  handleDisconnect(_client: Socket): void {
    // M4-01 intentionally has no disconnect side effects.
  }
}
