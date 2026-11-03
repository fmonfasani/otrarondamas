import { Outlet } from '@remix-run/react';
import { type LoaderFunction, json } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';
import { getApiBaseUrl } from '~/services/api.server';

export const loader: LoaderFunction = async ({ request }) => {
  const token = await requireAuth(request);
  const response = await fetch(`${getApiBaseUrl()}/platform-admin/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401 || response.status === 403) {
    throw new Response('Access restricted to Wapsell platform administrators.', { status: response.status });
  }
  if (!response.ok) throw new Response('Platform service unavailable', { status: response.status });
  return json({ authorized: true });
};

export default function PlatformAdminLayout() {
  return <div data-area="platform-admin"><Outlet /></div>;
}
