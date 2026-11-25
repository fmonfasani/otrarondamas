import type { ActionFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';
import { sendTyping } from '~/services/realtime.server';
import { isConversationId } from '~/utils/live';

/** E1 — «escribiendo…»: the API tells the others in the conversation. */
export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const conversationId = String((await request.formData()).get('conversationId') ?? '');
  if (!isConversationId(conversationId)) return new Response(null, { status: 400 });
  await sendTyping(token, `/messaging/conversations/${conversationId}/typing`);
  return new Response(null, { status: 204 });
}
