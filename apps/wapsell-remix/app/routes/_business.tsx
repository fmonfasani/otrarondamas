import { Outlet } from '@remix-run/react';
import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';
import { getApiBaseUrl } from '~/services/api.server';

interface Membership {
  id: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED' | string;
  businessId: string;
  businessNombre: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const response = await fetch(`${getApiBaseUrl()}/auth/memberships`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Response('Staff identity is not authorized for business operations.', {
      status: response.status,
    });
  }
  if (!response.ok) {
    throw new Response('Business membership could not be verified.', { status: 503 });
  }

  const memberships = (await response.json()) as Membership[];
  const activeMemberships = memberships.filter((membership) => membership.status === 'ACTIVE');

  if (activeMemberships.length === 0) {
    throw new Response('No active business membership is associated with this account.', {
      status: 403,
    });
  }
  if (activeMemberships.length > 1) {
    throw new Response('Multiple active business memberships require an explicit business selector.', {
      status: 409,
    });
  }

  // This context is used only to establish the correct UX boundary.
  // NestJS remains authoritative and must independently resolve Membership
  // for every protected business operation.
  const [membership] = activeMemberships;
  return json({
    business: {
      id: membership.businessId,
      name: membership.businessNombre,
      role: membership.role,
      membershipId: membership.id,
    },
  });
}

export default function BusinessLayout() {
  return <div data-area="business-operations"><Outlet /></div>;
}
