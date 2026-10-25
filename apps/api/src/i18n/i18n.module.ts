import {
  Module,
  Global,
  MiddlewareConsumer,
  NestModule,
  APP_FILTER,
} from '@nestjs/common';
import { I18nService } from './i18n.service';
import { I18nController } from './i18n.controller';
import { I18nMiddleware } from './i18n.middleware';
import { I18nExceptionFilter } from './i18n-exception.filter';

/**
 * Global I18n Module
 * Provides internationalization (i18n) support across the application
 *
 * Features:
 * - Multi-language support (Spanish, English, Portuguese)
 * - Automatic locale detection from Accept-Language header and ?lang query param
 * - Middleware to attach locale to request object
 * - Global exception filter for localized error messages
 * - REST API for translation queries
 *
 * Usage:
 * - Inject I18nService in controllers/services
 * - Use req.locale to access detected locale in controllers
 * - Error messages can reference translation keys (e.g., 'auth.unauthorized')
 */
@Global()
@Module({
  providers: [
    I18nService,
    {
      provide: APP_FILTER,
      useClass: I18nExceptionFilter,
    },
  ],
  controllers: [I18nController],
  exports: [I18nService],
})
export class I18nModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(I18nMiddleware).forRoutes('*');
  }
}
