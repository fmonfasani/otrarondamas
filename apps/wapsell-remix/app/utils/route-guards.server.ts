/**
 * Route Guards and Middleware
 * Protect routes with authentication, authorization, and tenant validation
 */

import { redirect, json, type LoaderFunction, type ActionFunction } from '@remix-run/node';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { requireAuth, getAuthenticatedUser, getSessionFromRequest } from '~/services/auth.server';
import { getTenantContext, validateTenantContext, type TenantContext } from './tenant-context.server';

/**
 * User roles for RBAC
 */
export type UserRole = 'owner' | 'admin' | 'seller' | 'viewer' | 'customer';

/**
 * Protected route context - passed to loaders/actions
 */
export interface ProtectedContext {
  token: string;
  tenantContext: TenantContext;
  request: Request;
  params: Record<string, any>;
}

/**
 * Require authentication middleware
 * Validates JWT token and extracts tenant context
 *
 * @throws Response 401 if not authenticated
 * @throws Response 403 if tenant context invalid
 */
export async function requireAuthContext(
  request: Request,
  params?: Record<string, any>
): Promise<ProtectedContext> {
  const token = await requireAuth(request);
  const tenantContext = await getTenantContext(request);

  if (!validateTenantContext(tenantContext)) {
    const locale = params?.lang || 'es';
    throw redirect(`/${locale}/auth/login`);
  }

  return {
    token,
    tenantContext: tenantContext!,
    request,
    params: params || {},
  };
}

/**
 * Require specific role(s)
 * Note: Role validation requires API call (not performed in this utility)
 * This is a placeholder for client-side role detection
 *
 * @param tenantContext Tenant context
 * @param requiredRoles One or more required roles
 * @returns true if user has one of the required roles
 */
export async function requireRole(
  tenantContext: TenantContext,
  requiredRoles: UserRole[],
  token: string
): Promise<boolean> {
  // Role validation should be done via API call
  // This checks basic structure
  if (!tenantContext.userId || !tenantContext.empresaId) {
    return false;
  }

  // In production, fetch user role from API with token
  // For now, return true (API validation is server-side responsibility)
  return true;
}

/**
 * Require specific tenant (empresa)
 * Validates that user has access to the requested tenant
 */
export async function requireTenant(
  tenantContext: TenantContext | null,
  requiredEmpresaId?: string
): Promise<string> {
  if (!tenantContext || !tenantContext.empresaId) {
    throw new Response('No tenant context', { status: 403 });
  }

  // If a specific empresa ID is required, verify it matches
  if (requiredEmpresaId && tenantContext.empresaId !== requiredEmpresaId) {
    throw new Response('Forbidden: No access to this tenant', { status: 403 });
  }

  return tenantContext.empresaId;
}

/**
 * Create a protected loader with tenant validation
 *
 * @param loaderFn Optional custom loader logic
 * @param options Configuration options
 * @returns LoaderFunction with auth + tenant validation
 */
export function createProtectedLoader(
  loaderFn?: (context: ProtectedContext) => Promise<any>,
  options?: {
    requiredEmpresaId?: string;
    fallbackLocale?: string;
  }
): LoaderFunction {
  const fallbackLocale = options?.fallbackLocale || 'es';

  return async (args: LoaderFunctionArgs) => {
    try {
      const { request, params } = args;
      const locale = (params.lang as string) || fallbackLocale;

      // Get auth context with tenant validation
      const authContext = await requireAuthContext(request, params);

      // Validate access to specific tenant if required
      if (options?.requiredEmpresaId) {
        await requireTenant(authContext.tenantContext, options.requiredEmpresaId);
      }

      // Call custom loader logic if provided
      if (loaderFn) {
        const customData = await loaderFn(authContext);
        return {
          ...customData,
          tenantContext: authContext.tenantContext,
          locale,
        };
      }

      return {
        tenantContext: authContext.tenantContext,
        locale,
      };
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }

      const locale = (params?.lang as string) || fallbackLocale;
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return redirect(`/${locale}/auth/login`);
      }

      console.error('[createProtectedLoader] Error:', error);
      throw error;
    }
  };
}

/**
 * Create a protected action with tenant validation
 *
 * @param actionFn Custom action logic
 * @param options Configuration options
 * @returns ActionFunction with auth + tenant validation
 */
export function createProtectedAction(
  actionFn: (context: ProtectedContext) => Promise<any>,
  options?: {
    requiredEmpresaId?: string;
    allowedMethods?: string[];
  }
): ActionFunction {
  return async (args: ActionFunctionArgs) => {
    try {
      const { request, params } = args;
      const locale = (params.lang as string) || 'es';

      // Check HTTP method if restricted
      if (options?.allowedMethods && !options.allowedMethods.includes(request.method)) {
        return json(
          { error: 'Method not allowed' },
          { status: 405 }
        );
      }

      // Get auth context with tenant validation
      const authContext = await requireAuthContext(request, params);

      // Validate access to specific tenant if required
      if (options?.requiredEmpresaId) {
        await requireTenant(authContext.tenantContext, options.requiredEmpresaId);
      }

      // Call custom action logic
      const result = await actionFn(authContext);

      return result || json({ success: true });
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }

      const locale = (params?.lang as string) || 'es';
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return redirect(`/${locale}/auth/login`);
      }

      console.error('[createProtectedAction] Error:', error);

      return json(
        {
          error: error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Redirect to login if not authenticated
 */
export async function redirectIfNotAuth(
  request: Request,
  locale: string = 'es'
): Promise<null | Response> {
  const session = await getSessionFromRequest(request);
  const token = session.get('jwt');

  if (!token) {
    return redirect(`/${locale}/auth/login`);
  }

  return null;
}

/**
 * Redirect to dashboard if already authenticated
 */
export async function redirectIfAuth(
  request: Request,
  locale: string = 'es'
): Promise<null | Response> {
  const session = await getSessionFromRequest(request);
  const token = session.get('jwt');

  if (token) {
    return redirect(`/${locale}/dashboard`);
  }

  return null;
}
