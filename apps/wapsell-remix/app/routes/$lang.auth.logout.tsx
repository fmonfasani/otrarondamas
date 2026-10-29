import { redirect, type ActionFunction, type LoaderFunction } from '@remix-run/node';
import { logout } from '~/services/auth.server';

/**
 * Localized logout route
 * Clears session and redirects to localized landing page
 *
 * Usage:
 * POST /{lang}/auth/logout
 * GET /{lang}/auth/logout (also accepted)
 */

export const action: ActionFunction = async ({ request, params }) => {
  const locale = params.lang || 'es';

  if (request.method === 'POST' || request.method === 'GET') {
    try {
      const response = await logout(request);

      return redirect(`/${locale}`, {
        headers: response.headers,
      });
    } catch (error) {
      console.error('[logout] Error:', error);

      // Even if logout fails, redirect to home
      return redirect(`/${locale}`);
    }
  }

  return new Response('Method not allowed', { status: 405 });
};

/**
 * If someone accesses GET /{lang}/auth/logout, process as logout
 */
export const loader: LoaderFunction = async ({ request, params }) => {
  const locale = params.lang || 'es';

  if (request.method === 'GET') {
    try {
      const response = await logout(request);

      return redirect(`/${locale}`, {
        headers: response.headers,
      });
    } catch (error) {
      console.error('[logout] Loader error:', error);
      return redirect(`/${locale}`);
    }
  }

  return new Response('Method not allowed', { status: 405 });
};
