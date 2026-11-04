import { requireAuth } from './auth.server';
import { getApiBaseUrl } from './api.server';

/**
 * Authenticated server-to-server API adapter.
 *
 * Tenant scope is intentionally NOT read from Remix cookies or forwarded
 * as X-Empresa-Id/X-User-Id. NestJS derives BusinessContext from the
 * authenticated identity and its current ACTIVE Membership.
 */
export async function fetchAuthenticatedData(
  endpoint: string,
  request: Request,
  options: RequestInit = {},
): Promise<Response> {
  const token = await requireAuth(request);
  const headers = new Headers(options.headers);
  // Never propagate legacy/client-controlled tenant identifiers.
  headers.delete('X-Empresa-Id');
  headers.delete('X-User-Id');
  headers.set('Authorization', `Bearer ${token}`);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return fetch(`${getApiBaseUrl()}${normalizedEndpoint}`, {
    ...options,
    headers,
  });
}
