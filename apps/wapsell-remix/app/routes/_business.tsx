import { Outlet } from '@remix-run/react';
import { LoaderFunction, json } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';

/**
 * Business Operations Layout
 *
 * This layout boundaries the Business Operations experience area:
 * - Staff authentication and Business Context
 * - Dashboard, sales, orders, inventory, customers
 * - Cash operations, messaging, reports
 *
 * SECURITY:
 * - Requires valid staff JWT through requireAuth
 * - NestJS enforces ACTIVE Membership and Permission
 * - Client cannot select Business Context; server validates it
 * - This layout is NOT a security boundary; NestJS guards access
 */

export const loader: LoaderFunction = async ({ request }) => {
  // Require staff authentication
  const token = await requireAuth(request);

  // Validate that API URL is configured
  const apiUrl = process.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Response('Service configuration error', { status: 503 });
  }

  // Verify user is a staff member by checking /auth/me
  try {
    const userResponse = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!userResponse.ok) {
      throw new Response('Session invalid or expired', { status: 401 });
    }

    const user = await userResponse.json();

    // TODO: Verify user is staff (not customer-only identity)
    // This requires coordination with NestJS on staff identity marker
    // For now, any valid JWT is accepted; NestJS enforces permission

    return json({ user });
  } catch (error) {
    console.error('Error verifying staff session:', error);
    throw new Response('Could not verify your session', { status: 401 });
  }
};

export default function BusinessLayout() {
  return (
    <div data-area="business-operations">
      <Outlet />
    </div>
  );
}
