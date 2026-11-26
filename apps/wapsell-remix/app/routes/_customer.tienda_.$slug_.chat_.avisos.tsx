import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { apiRequest, settle } from '~/services/api.server';
import { getStoreCustomer } from '~/services/customer-session.server';

const path = (slug: string) => `/${encodeURIComponent(slug)}/tienda/chat/avisos`;

/** Paquete 1 F1 — whether push is on, and the key the customer's browser subscribes with. */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug ?? '';
  const customer = await getStoreCustomer(request, slug);
  if (!customer) return json({ enabled: false, publicKey: null }, { status: 401 });
  const settings = await settle(apiRequest<{ enabled: boolean; publicKey: string | null }>(customer.jwt, path(slug)));
  return json(settings ?? { enabled: false, publicKey: null }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Paquete 1 F1 — the customer's browser accepted notifications (POST) or stopped (DELETE). */
export async function action({ request, params }: ActionFunctionArgs) {
  const slug = params.slug ?? '';
  const customer = await getStoreCustomer(request, slug);
  if (!customer) return new Response(null, { status: 401 });
  if (request.method !== 'POST' && request.method !== 'DELETE') return new Response(null, { status: 405 });
  const body = await request.text();
  if (body.length > 8000) return new Response(null, { status: 413 });
  const ok = await settle(apiRequest(customer.jwt, path(slug), { method: request.method, body }));
  return new Response(null, { status: ok === null ? 502 : 204 });
}
