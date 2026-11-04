import { Outlet, useLoaderData } from '@remix-run/react';
import { LoaderFunction, json } from '@remix-run/node';
import { Header } from '~/components/Header';
import { requireAuth, getCurrentUser } from '~/services/auth.server';

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
  const token = await requireAuth(request);

  const apiUrl = process.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Response('Service configuration error', { status: 503 });
  }

  try {
    const user = await getCurrentUser(token);
    if (!user) {
      throw new Response('Session invalid or expired', { status: 401 });
    }

    return json({ user });
  } catch (error) {
    console.error('Error verifying staff session:', error);
    throw new Response('Could not verify your session', { status: 401 });
  }
};

export default function BusinessLayout() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div data-area="business-operations">
      <Header area="business" userName={user?.name || user?.email} />
      <Outlet />
    </div>
  );
}
