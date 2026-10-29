import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Request Logger Middleware
 * Logs all incoming requests with method, path, response status, and duration
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, path, ip } = req;

    // Capture the original response.json method
    const originalJson = res.json;
    let statusCode = res.statusCode;

    // Override res.json to capture the status code
    res.json = function (body: any) {
      statusCode = res.statusCode;
      return originalJson.call(this, body);
    };

    // Listen for the response finish event
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const correlationId = req['correlationId'] || 'N/A';

      const logMessage = {
        method,
        path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip,
        correlationId,
      };

      // Log based on status code
      if (res.statusCode >= 500) {
        this.logger.error(
          `${method} ${path} - ${res.statusCode}`,
          JSON.stringify(logMessage),
        );
      } else if (res.statusCode >= 400) {
        this.logger.warn(
          `${method} ${path} - ${res.statusCode}`,
          JSON.stringify(logMessage),
        );
      } else if (res.statusCode >= 300) {
        this.logger.log(
          `${method} ${path} - ${res.statusCode} (${duration}ms)`,
        );
      } else {
        this.logger.debug(
          `${method} ${path} - ${res.statusCode} (${duration}ms)`,
        );
      }
    });

    next();
  }
}
