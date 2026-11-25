import type { LoaderFunctionArgs } from '@remix-run/node';
import { getStoreCustomer } from '~/services/customer-session.server';
import { realtimeStream } from '~/services/realtime.server';

/** E1 — the store chat hears the store's answers and «escribiendo» at once. */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const customer = await getStoreCustomer(request, params.slug ?? '');
  if (!customer) return new Response('Ingresá a tu cuenta', { status: 401 });
  return realtimeStream(request, customer.jwt, 'cliente');
}
