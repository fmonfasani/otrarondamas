import { redirect } from '@remix-run/node';
import { requireAuth, getAuthenticatedUser } from '~/services/auth.server';

/**
 * Guard: requires authentication and dashboard.view permission
 * Throws 401 if not authenticated, 403 if permission denied
 */
export async function requireDashboardAccess(request: Request): Promise<string> {
  const token = await requireAuth(request);

  // TODO: validate dashboard.view permission in token claims
  // For now, any authenticated user can access
  return token;
}

/**
 * Guard: requires authentication and dashboard.manage permission
 * Used for dashboard configuration/customization endpoints
 */
export async function requireDashboardManage(request: Request): Promise<string> {
  const token = await requireAuth(request);
  const user = await getAuthenticatedUser(request);

  if (!user) {
    throw redirect('/login');
  }

  // TODO: validate dashboard.manage permission in token claims
  // For now, any authenticated user can manage
  return token;
}

/**
 * Guard: requires both authentication and tenant context
 * Verifies user has access to the specified tenant
 */
export async function requireTenantContext(
  request: Request,
  expectedTenantId?: string
): Promise<{ token: string; tenantId: string }> {
  const token = await requireAuth(request);
  const user = await getAuthenticatedUser(request);

  if (!user || !user.empresaId) {
    throw redirect('/login');
  }

  if (expectedTenantId && user.empresaId !== expectedTenantId) {
    // User trying to access different tenant
    throw new Response('Forbidden: Unauthorized tenant access', { status: 403 });
  }

  return {
    token,
    tenantId: user.empresaId,
  };
}
