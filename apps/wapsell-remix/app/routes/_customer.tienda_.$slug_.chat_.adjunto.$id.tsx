import { type LoaderFunctionArgs } from '@remix-run/node';
import { proxyFile } from '~/services/api.server';
import { getStoreCustomer } from '~/services/customer-session.server';

/** OR-B4-037 — a photo or PDF of the customer's own chat (E5: a voice note or video, by pieces). */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug ?? '';
  const customer = await getStoreCustomer(request, slug);
  if (!customer) return new Response('Ingresá a tu cuenta', { status: 401 });
  return proxyFile(customer.jwt, `/${encodeURIComponent(slug)}/tienda/chat/adjuntos/${encodeURIComponent(params.id ?? '')}`, request);
}
