/**
 * Meta Tags Middleware
 * Injects meta tags into response headers for server-side rendering
 *
 * NOTE: Async middleware is not supported by NestJS. For now, this middleware
 * only adds Cache-Control headers. Full meta tag injection would require
 * integration at the controller level or via a response interceptor.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetaTagsService } from '../services/meta-tags.service';

@Injectable()
export class MetaTagsMiddleware implements NestMiddleware {
  constructor(private metaTagsService: MetaTagsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Store original res.set
    const originalSet = res.set.bind(res);

    // Override res.set to add cache headers
    res.set = function (field: any, val?: any) {
      // If setting Content-Type, also add cache headers for HTML
      if (typeof field === 'object') {
        const contentType = field['content-type'] || field['Content-Type'];
        if (contentType && contentType.includes('text/html')) {
          field['Cache-Control'] = 'public, max-age=3600';
        }
      } else if (
        (field === 'content-type' || field === 'Content-Type') &&
        typeof val === 'string' &&
        val.includes('text/html')
      ) {
        res.set('Cache-Control', 'public, max-age=3600');
      }

      return originalSet(field, val);
    };

    next();
  }
}
