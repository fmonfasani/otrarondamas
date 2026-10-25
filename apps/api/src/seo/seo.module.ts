/**
 * SEO Module
 * Provides SEO metadata, structured data, and sitemap services
 */

import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { SeoController } from './seo.controller';
import { MetaTagsService } from './services/meta-tags.service';
import { SitemapService } from './services/sitemap.service';
import { MetaTagsMiddleware } from './middleware/meta-tags.middleware';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SeoController],
  providers: [MetaTagsService, SitemapService],
  exports: [MetaTagsService, SitemapService],
})
export class SeoModule {
  configure(consumer: MiddlewareConsumer) {
    // Optionally apply middleware to specific routes
    consumer
      .apply(MetaTagsMiddleware)
      .forRoutes(
        // Apply to HTML rendering routes only
        { path: '*', method: RequestMethod.GET },
      );
  }
}
