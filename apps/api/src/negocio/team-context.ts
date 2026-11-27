import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { BusinessContextService } from '../business-context/business-context.service';
import { hasCanonicalPermission } from '../authorization/canonical-permissions';

/** Someone of the Business's team: their role and the Business they act in. */
export async function teamContext(
  businessContext: BusinessContextService,
  user: AuthenticatedUser,
) {
  const context = await businessContext.resolveForAuthenticatedUser(user);
  if (!context.role) throw new ForbiddenException('Solo el equipo del negocio');
  return {
    role: context.role,
    companyId: await businessContext.resolveCompanyId(context.businessId),
  };
}

/**
 * Only whoever changes the Business data (BRAND_MANAGE: the Owner), checked here in every
 * authorization mode, not only by the guard.
 */
export async function ownerContext(
  businessContext: BusinessContextService,
  user: AuthenticatedUser,
  refusal: string,
) {
  const context = await teamContext(businessContext, user);
  if (!hasCanonicalPermission(context.role, 'BRAND_MANAGE')) throw new ForbiddenException(refusal);
  return context;
}
