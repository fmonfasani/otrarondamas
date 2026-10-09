import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Namespace, Socket } from 'socket.io';
import type { JwtPayload, AuthenticatedUser } from '../auth/auth.types';
import { JwtStrategy } from '../auth/jwt.strategy';
import { BusinessContextService } from '../business-context/business-context.service';

interface MessagingSocketData {
  authenticatedUser: AuthenticatedUser;
  businessContext: Awaited<ReturnType<BusinessContextService['resolveForAuthenticatedUser']>>;
}

type MessagingSocket = Socket<any, any, any, MessagingSocketData>;

/**
 * M4-02 — Messaging realtime handshake authentication.
 *
 * Socket.IO is only the transport boundary. The existing JWT is verified,
 * the existing JwtStrategy normalizes the authenticated identity, and the
 * canonical BusinessContext resolves the tenant boundary. The legacy
 * empresaId JWT claim is never used as tenant authority.
 */
@WebSocketGateway({
  namespace: '/messaging',
})
export class MessagingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtStrategy: JwtStrategy,
    private readonly businessContextService: BusinessContextService,
  ) {}

  afterInit(namespace: Namespace): void {
    namespace.use(async (socket, next) => {
      try {
        const token = this.extractToken(socket);
        if (!token) {
          throw new Error('Missing realtime authentication token');
        }

        const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
        const authenticatedUser = await this.jwtStrategy.validate(payload);
        const businessContext =
          await this.businessContextService.resolveForAuthenticatedUser(authenticatedUser);

        socket.data.authenticatedUser = authenticatedUser;
        socket.data.businessContext = businessContext;
        next();
      } catch {
        next(new Error('Realtime authentication failed'));
      }
    });
  }

  handleConnection(@ConnectedSocket() _client: MessagingSocket): void {
    // M4-02 authentication is enforced by the Socket.IO namespace middleware.
    // Authorized connection state is already attached to socket.data.
  }

  handleDisconnect(_client: MessagingSocket): void {
    // M4-02 intentionally has no disconnect side effects.
  }

  private extractToken(socket: Socket): string | null {
    const token = socket.handshake.auth?.token;
    return typeof token === 'string' && token.trim().length > 0 ? token.trim() : null;
  }
}
