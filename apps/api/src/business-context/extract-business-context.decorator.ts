import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { BusinessContextService } from './business-context.service';

/**
 * P8-2: @ExtractBusinessContext decorator
 *
 * Extracts the empresaId from the authenticated user's BusinessContext.
 * Fails closed if no valid context (calls BusinessContextService.resolveForAuthenticatedUser).
 *
 * Usage:
 *   @Get('templates')
 *   async listTemplates(@ExtractBusinessContext() empresaId: string) { ... }
 */
export const ExtractBusinessContext = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new Error('No user in request context');
    }

    // Extract empresaId from JWT payload (already available in authenticated user)
    // Fallback to BusinessContextService if needed
    if (user.empresaId) {
      return user.empresaId;
    }

    // Legacy: Use the request scope to get BusinessContextService
    const businessContextService = ctx.switchToHttp().getRequest().app.get(BusinessContextService);

    if (!businessContextService) {
      throw new Error('BusinessContextService not available');
    }

    const context = await businessContextService.resolveForAuthenticatedUser(user);
    return context.businessId;
  },
);
