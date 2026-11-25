import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';
import { apiRequest, settle } from '~/services/api.server';
import { NO_UNREAD, type UnreadSummary } from '~/utils/alerts';

/** E2 — unread messages for the panel menu, the tab title and the notification. */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const summary = await settle(apiRequest<UnreadSummary>(token, '/messaging/conversations/unread'));
  return json(summary ?? NO_UNREAD, { headers: { 'Cache-Control': 'no-store' } });
}
