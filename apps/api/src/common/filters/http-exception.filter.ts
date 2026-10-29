import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Standard HTTP Exception Filter
 * Catches all HTTP exceptions and returns a standardized error response format
 *
 * Response format:
 * {
 *   statusCode: number,
 *   message: string,
 *   errors: Array<{field: string, message: string}> (optional),
 *   timestamp: ISO string,
 *   path: string,
 *   correlationId: string
 * }
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const correlationId =
      (request['correlationId'] as string) || uuidv4();

    const errorResponse = {
      statusCode: status,
      message: this.extractMessage(exceptionResponse, exception),
      errors: this.extractErrors(exceptionResponse),
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    };

    // Log the error
    this.logError(status, errorResponse, request);

    response.status(status).json(errorResponse);
  }

  /**
   * Extract the message from the exception response
   */
  private extractMessage(
    exceptionResponse: any,
    exception: HttpException,
  ): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      if ('message' in exceptionResponse) {
        // Handle array of validation errors or single message
        if (Array.isArray(exceptionResponse.message)) {
          return 'Validation failed';
        }
        return exceptionResponse.message;
      }

      if ('error' in exceptionResponse) {
        return exceptionResponse.error;
      }
    }

    return exception.message || 'Internal server error';
  }

  /**
   * Extract validation errors from the exception response
   */
  private extractErrors(exceptionResponse: any): Array<{
    field: string;
    message: string | string[];
  }> | undefined {
    if (
      !exceptionResponse ||
      typeof exceptionResponse !== 'object'
    ) {
      return undefined;
    }

    const errors: Array<{ field: string; message: string | string[] }> =
      [];

    if (Array.isArray(exceptionResponse.message)) {
      exceptionResponse.message.forEach((msg: any) => {
        if (msg && typeof msg === 'object' && 'property' in msg) {
          errors.push({
            field: msg.property,
            message: msg.constraints
              ? Object.values(msg.constraints)
              : msg.message || 'Validation error',
          });
        }
      });
    }

    return errors.length > 0 ? errors : undefined;
  }

  /**
   * Log error with appropriate level based on status code
   */
  private logError(
    status: number,
    errorResponse: any,
    request: Request,
  ): void {
    const logContext = {
      method: request.method,
      path: request.url,
      statusCode: status,
      correlationId: errorResponse.correlationId,
    };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        JSON.stringify(errorResponse),
        'HttpExceptionFilter',
      );
    } else if (status >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} - ${status}`,
        JSON.stringify(logContext),
      );
    }
  }
}
