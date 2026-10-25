import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { I18nService } from './i18n.service';

/**
 * Middleware to detect and attach locale to request object
 * - Extracts locale from Accept-Language header
 * - Extracts locale from ?lang query parameter (takes priority)
 * - Defaults to 'es' if unsupported
 * - Attaches locale to req.locale for use in controllers/services
 */
@Injectable()
export class I18nMiddleware implements NestMiddleware {
  constructor(private readonly i18nService: I18nService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Detect locale using the service's getLocale method
    const locale = this.i18nService.getLocale(req);

    // Attach to request object for use in controllers/services
    (req as any).locale = locale;

    next();
  }
}
