import { Outlet } from '@remix-run/react';
import { type LoaderFunction, json } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';
import { getApiBaseUrl } from '~/services/api.server';

export const loader: LoaderFunction = async ({ request }) => {
  const token = await requireAuth(request);
  const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Response('Session invalid or expired', { status: response.status === 403 ? 403 : 401 });
  return json({ user: await response.json() });
};

export default function BusinessLayout() {
  return <div data-area="business-operations"><Outlet /></div>;
}
