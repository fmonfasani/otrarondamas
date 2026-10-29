import {
  Injectable,
  NestMiddleware,
  TooManyRequestsException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Rate Limiter Middleware
 * Enforces rate limiting per IP address
 * Default: 100 requests per minute
 */
@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimiterMiddleware.name);

  // Store: ip -> { count, resetAt }
  private requestMap: Map<
    string,
    { count: number; resetAt: number }
  > = new Map();

  private readonly MAX_REQUESTS = 100;
  private readonly WINDOW_MS = 60 * 1000; // 1 minute

  use(req: Request, res: Response, next: NextFunction) {
    const ip = this.getClientIp(req);
    const now = Date.now();

    let ipData = this.requestMap.get(ip);

    // Reset if window has passed
    if (!ipData || ipData.resetAt < now) {
      ipData = { count: 0, resetAt: now + this.WINDOW_MS };
      this.requestMap.set(ip, ipData);
    }

    ipData.count++;

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', this.MAX_REQUESTS);
    res.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, this.MAX_REQUESTS - ipData.count),
    );
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(ipData.resetAt).toISOString(),
    );

    // Check if limit exceeded
    if (ipData.count > this.MAX_REQUESTS) {
      this.logger.warn(
        `Rate limit exceeded for IP: ${ip}`,
        `Requests: ${ipData.count}, Limit: ${this.MAX_REQUESTS}`,
      );

      throw new TooManyRequestsException({
        statusCode: 429,
        message:
          'Too many requests, please try again later',
        retryAfter: Math.ceil(
          (ipData.resetAt - now) / 1000,
        ),
      });
    }

    next();
  }

  /**
   * Extract client IP from request
   * Handles X-Forwarded-For and other proxy headers
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return (
      (req.socket.remoteAddress ||
        req.connection.remoteAddress) ??
      '127.0.0.1'
    );
  }
}
