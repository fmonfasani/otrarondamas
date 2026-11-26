import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';
import { apiRequest, settle } from '~/services/api.server';
import type { Message } from '~/utils/messaging';

/** Paquete 1 F2 — the page of a conversation before message sequence `antes`. */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const url = new URL(request.url);
  const conversationId = url.searchParams.get('c') ?? '';
  const before = url.searchParams.get('antes') ?? '';
  if (!conversationId || !/^\d{1,19}$/.test(before)) return json({ messages: [] as Message[] }, { status: 400 });
  const messages = await settle(
    apiRequest<Message[]>(
      token,
      `/messaging/conversations/${encodeURIComponent(conversationId)}/messages?antes=${before}`,
    ),
  );
  return json({ messages: messages ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}
