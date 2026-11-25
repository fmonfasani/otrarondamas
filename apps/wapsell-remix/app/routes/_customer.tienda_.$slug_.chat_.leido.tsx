import type { ActionFunctionArgs } from '@remix-run/node';
import { getStoreCustomer } from '~/services/customer-session.server';
import { getApiBaseUrl } from '~/services/api.server';

/**
 * E2 — the customer is looking at the chat: they read the store's messages (blue ✓✓ for
 * the store when both sides have read receipts on). Sent by the page only while it is in
 * front, so a chat open in a background tab does not count as read.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const slug = params.slug ?? '';
  const customer = await getStoreCustomer(request, slug);
  if (!customer) return new Response(null, { status: 401 });
  try {
    await fetch(`${getApiBaseUrl()}/${encodeURIComponent(slug)}/tienda/chat/leido`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customer.jwt}` },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Best-effort: the next visit marks it.
  }
  return new Response(null, { status: 204 });
}
