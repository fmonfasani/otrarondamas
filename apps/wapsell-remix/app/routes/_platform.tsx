import { Outlet } from '@remix-run/react';
import { LoaderFunction, json } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';

/**
 * Platform Admin Layout
 *
 * This layout boundaries the Wapsell Platform Administration experience:
 * - Privileged Wapsell internal operators only
 * - Cross-Business data and audit operations
 * - Business lifecycle, platform metrics, subscriptions
 *
 * SECURITY:
 * - Requires valid staff JWT through requireAuth
 * - Backend enforces platform-level authorization (separate from Business permissions)
 * - Business Owner/Admin role does NOT grant platform access
 * - This layout is NOT a security boundary; NestJS guards access
 * - See PlatformAdminGuard and PLATFORM_ADMIN_EMAILS in NestJS
 */

export const loader: LoaderFunction = async ({ request }) => {
  // Require staff authentication
  const token = await requireAuth(request);

  // Validate that API URL is configured
  const apiUrl = process.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Response('Service configuration error', { status: 503 });
  }

  // Verify authorization with Platform Admin endpoint
  try {
    const response = await fetch(`${apiUrl}/platform-admin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401 || response.status === 403) {
      throw new Response(
        'Access restricted to Wapsell platform administrators.',
        { status: 403 }
      );
    }

    if (!response.ok) {
      throw new Response('Platform service unavailable', { status: response.status });
    }

    return json({ authorized: true });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('Error verifying platform admin access:', error);
    throw new Response('Could not verify platform access', { status: 503 });
  }
};

export default function PlatformAdminLayout() {
  return (
    <div data-area="platform-admin">
      <Outlet />
    </div>
  );
}
