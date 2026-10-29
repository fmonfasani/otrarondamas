/**
 * Tenant Context Utilities
 * Extract and manage tenant (empresa) context from JWT and session
 */

import { jwtDecode } from 'jwt-decode';
import type { Session as RemixSession } from '@remix-run/node';
import { getSessionFromRequest } from '~/services/auth.server';

/**
 * JWT Payload Structure
 */
export interface JWTPayload {
  sub: string; // user ID
  email: string;
  empresaId: string;
  name?: string;
  iat: number;
  exp: number;
}

/**
 * Tenant Context - extracted from JWT and session
 */
export interface TenantContext {
  userId: string;
  email: string;
  empresaId: string;
  name?: string;
  isExpired?: boolean;
}

/**
 * Get tenant context from JWT token
 * @param token JWT token from session
 * @returns TenantContext or null if invalid/expired
 */
export function getTenantContextFromJWT(token: string): TenantContext | null {
  try {
    if (!token) return null;

    const decoded = jwtDecode<JWTPayload>(token);

    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return {
        userId: decoded.sub,
        email: decoded.email,
        empresaId: decoded.empresaId,
        name: decoded.name,
        isExpired: true,
      };
    }

    return {
      userId: decoded.sub,
      email: decoded.email,
      empresaId: decoded.empresaId,
      name: decoded.name,
      isExpired: false,
    };
  } catch (error) {
    console.error('[getTenantContextFromJWT] Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Get tenant context from request (session + JWT)
 * @param request HTTP request
 * @returns TenantContext or null if not authenticated
 */
export async function getTenantContext(
  request: Request
): Promise<TenantContext | null> {
  try {
    const session = await getSessionFromRequest(request);
    const token = session.get('jwt');
    const empresaId = session.get('empresaId');
    const userId = session.get('userId');

    if (!token || !userId) {
      return null;
    }

    // Try to extract from JWT first (more reliable)
    const jwtContext = getTenantContextFromJWT(token);

    if (jwtContext && !jwtContext.isExpired) {
      return jwtContext;
    }

    // Fallback to session data
    if (empresaId && userId) {
      return {
        userId,
        email: session.get('email') || '',
        empresaId,
        name: session.get('name'),
      };
    }

    return null;
  } catch (error) {
    console.error('[getTenantContext] Error extracting tenant context:', error);
    return null;
  }
}

/**
 * Validate tenant context (check if user has access to empresa)
 * @param tenantContext Tenant context to validate
 * @returns true if valid, false otherwise
 */
export function validateTenantContext(tenantContext: TenantContext | null): boolean {
  if (!tenantContext) return false;
  return !!(tenantContext.userId && tenantContext.empresaId);
}

/**
 * Get empresa ID from tenant context
 * Safe accessor that validates context first
 */
export function getEmpresaId(tenantContext: TenantContext | null): string | null {
  if (!tenantContext || tenantContext.isExpired) return null;
  return tenantContext.empresaId || null;
}

/**
 * Store tenant context in session
 */
export async function setTenantContextInSession(
  session: RemixSession,
  tenantContext: TenantContext
): Promise<RemixSession> {
  session.set('userId', tenantContext.userId);
  session.set('email', tenantContext.email);
  session.set('empresaId', tenantContext.empresaId);
  if (tenantContext.name) {
    session.set('name', tenantContext.name);
  }
  return session;
}
