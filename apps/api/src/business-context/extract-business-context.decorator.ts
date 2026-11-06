import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { BusinessContext } from './business-context.types';

type RequestWithBusinessContext = {
  businessContext?: BusinessContext;
};

/**
 * Reads the business context previously resolved by BusinessContextGuard.
 *
 * Apply BusinessContextGuard to the controller/route before using this
 * decorator. The decorator deliberately does not attempt dependency
 * resolution: ExecutionContext's request.app is an Express application,
 * not Nest's dependency-injection container.
 */
export const ExtractBusinessContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<RequestWithBusinessContext>();

    if (!request.businessContext?.businessId) {
      throw new InternalServerErrorException(
        'BusinessContextGuard debe ejecutarse antes de @ExtractBusinessContext',
      );
    }

    return request.businessContext.businessId;
  },
);
