import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';
import { apiRequest, settle } from '~/services/api.server';

/** E3 — whether push is on, and the public key this browser subscribes with. */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const settings = await settle(apiRequest<{ enabled: boolean; publicKey: string | null }>(token, '/messaging/conversations/push'));
  return json(settings ?? { enabled: false, publicKey: null }, { headers: { 'Cache-Control': 'no-store' } });
}

/** E3 — this browser accepted notifications (POST) or stopped (DELETE). Body: the subscription JSON. */
export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  if (request.method !== 'POST' && request.method !== 'DELETE') return new Response(null, { status: 405 });
  const body = await request.text();
  if (body.length > 8000) return new Response(null, { status: 413 });
  const ok = await settle(
    apiRequest(token, '/messaging/conversations/push/subscriptions', { method: request.method, body }),
  );
  return new Response(null, { status: ok === null ? 502 : 204 });
}
