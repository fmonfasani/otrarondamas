import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Correlation ID Middleware
 * Adds a unique correlation ID to each request for tracking
 * The ID is either from the X-Correlation-ID header or generated
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CorrelationIdMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Check for existing correlation ID in header
    const correlationId =
      (req.headers['x-correlation-id'] as string) || uuidv4();

    // Attach to request for use in guards, services, filters
    req['correlationId'] = correlationId;

    // Add to response headers
    res.setHeader('X-Correlation-ID', correlationId);

    // Add to response locals for templates (if used)
    res.locals.correlationId = correlationId;

    next();
  }
}
