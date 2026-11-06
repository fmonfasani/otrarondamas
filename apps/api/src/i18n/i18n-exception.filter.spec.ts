import { jest } from '@jest/globals';
import {
  ArgumentsHost,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { I18nService } from './i18n.service';
import { I18nExceptionFilter } from './i18n-exception.filter';

describe('I18nExceptionFilter', () => {
  let response: { status: jest.Mock; json: jest.Mock };
  let request: { url: string; locale: string };
  let host: ArgumentsHost;
  let i18nService: Pick<I18nService, 'getDefaultLocale' | 'translate'>;
  let filter: I18nExceptionFilter;

  beforeEach(() => {
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    request = { url: '/resource', locale: 'es' };
    host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
    i18nService = {
      getDefaultLocale: jest.fn().mockReturnValue('es'),
      translate: jest.fn((key: string) => key),
    };
    filter = new I18nExceptionFilter(i18nService as I18nService);
  });

  it('preserves the standard NestJS error label and adds request metadata', () => {
    filter.catch(new BadRequestException('Invalid input'), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Invalid input',
        error: 'Bad Request',
        path: '/resource',
        timestamp: expect.any(String),
      }),
    );
  });

  it('preserves validation message arrays without coercing them to strings', () => {
    const messages = ['name should not be empty', 'email must be an email'];
    filter.catch(new BadRequestException(messages), host);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: messages,
        error: 'Bad Request',
      }),
    );
  });

  it('translates dotted message keys without losing the HTTP error label', () => {
    (i18nService.translate as jest.Mock).mockReturnValue('No autorizado');
    filter.catch(new UnauthorizedException('auth.unauthorized'), host);

    expect(i18nService.translate).toHaveBeenCalledWith('auth.unauthorized', 'es');
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: 'No autorizado',
        error: 'Unauthorized',
      }),
    );
  });
});
