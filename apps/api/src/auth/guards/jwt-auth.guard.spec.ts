import { jest } from '@jest/globals';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

// The guard is global (APP_GUARD), so Nest also runs it on Socket.IO message
// handlers. There is no HTTP request there: the gateway's namespace middleware
// is what authenticates the socket, and the guard must only trust that result.
describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let guard: JwtAuthGuard;

  const wsContext = (client: unknown): ExecutionContext =>
    ({
      getType: () => 'ws',
      getHandler: () => ({ name: 'handleJoinConversation' }),
      getClass: () => ({ name: 'MessagingGateway' }),
      switchToWs: () => ({ getClient: () => client, getData: () => ({}) }),
      // Like the real WS host: there is no HTTP request or response.
      switchToHttp: () => ({ getRequest: () => undefined, getResponse: () => undefined }),
    }) as unknown as ExecutionContext;

  const httpContext = (): ExecutionContext =>
    ({
      getType: () => 'http',
      getHandler: () => ({ name: 'list' }),
      getClass: () => ({ name: 'MessagingController' }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('WebSocket context', () => {
    it('allows a socket the namespace middleware authenticated', () => {
      const client = { data: { authenticatedUser: { id: 'user-1', type: 'usuario' } } };

      expect(guard.canActivate(wsContext(client))).toBe(true);
    });

    it('rejects a socket without an authenticated identity', () => {
      expect(guard.canActivate(wsContext({ data: {} }))).toBe(false);
    });

    it('rejects a socket that carries a token but was not authenticated by the middleware', () => {
      const client = { handshake: { auth: { token: 'unverified' } }, data: {} };

      expect(guard.canActivate(wsContext(client))).toBe(false);
    });

    it('rejects when the client has no data at all', () => {
      expect(guard.canActivate(wsContext(undefined))).toBe(false);
    });

    it('never delegates to passport, which would read missing HTTP headers', () => {
      const passport = jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate');

      guard.canActivate(wsContext({ data: {} }));

      expect(passport).not.toHaveBeenCalled();
    });
  });

  describe('HTTP context', () => {
    it('delegates to passport when the route is not public', () => {
      const passport = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      expect(guard.canActivate(httpContext())).toBe(true);
      expect(passport).toHaveBeenCalledTimes(1);
    });

    it('skips authentication for a @Public() route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const passport = jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate');

      expect(guard.canActivate(httpContext())).toBe(true);
      expect(passport).not.toHaveBeenCalled();
    });
  });
});
