import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { I18nService } from './i18n.service';

/**
 * Global exception filter that localizes error messages
 * Translates error messages based on request locale
 */
@Catch(HttpException)
export class I18nExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18nService: I18nService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<any>();

    const status = exception.getStatus();
    const locale = request.locale || this.i18nService.getDefaultLocale();
    const exceptionResponse = exception.getResponse();

    // If the exception response is an object with message and error keys,
    // attempt to translate the message key
    let message = '';
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const errorObj = exceptionResponse as any;
      message = errorObj.message || errorObj.error || 'Unknown error';
    } else {
      message = String(exceptionResponse);
    }

    // Try to translate the message if it looks like a translation key
    // (contains dots, e.g., 'auth.unauthorized')
    let translatedMessage = message;
    if (typeof message === 'string' && message.includes('.')) {
      translatedMessage = this.i18nService.translate(message, locale);
    }

    // Build localized response
    const localizedResponse = {
      statusCode: status,
      message: translatedMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(localizedResponse);
  }
}
