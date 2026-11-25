import type { ActionFunctionArgs } from '@remix-run/node';
import { getStoreCustomer } from '~/services/customer-session.server';
import { sendTyping } from '~/services/realtime.server';

/** E1 — the customer is writing: the store's screens show «escribiendo…». */
export async function action({ request, params }: ActionFunctionArgs) {
  const slug = params.slug ?? '';
  const customer = await getStoreCustomer(request, slug);
  if (!customer) return new Response(null, { status: 401 });
  await sendTyping(customer.jwt, `/${encodeURIComponent(slug)}/tienda/chat/escribiendo`);
  return new Response(null, { status: 204 });
}
