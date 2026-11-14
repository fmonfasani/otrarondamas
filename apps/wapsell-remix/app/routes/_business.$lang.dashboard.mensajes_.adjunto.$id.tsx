import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';
import { proxyFile } from '~/services/api.server';

/** OR-B4-037 — a photo or PDF of a conversation, through the API's access check. */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  return proxyFile(token, `/messaging/conversations/attachments/${encodeURIComponent(params.id ?? '')}`);
}
