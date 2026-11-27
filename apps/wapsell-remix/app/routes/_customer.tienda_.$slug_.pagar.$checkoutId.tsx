import { json, redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { ApiError } from '~/services/api.server';
import { getStoreCustomer } from '~/services/customer-session.server';
import { payCheckout } from '~/services/store.server';
import { checkoutToPay } from '~/utils/store';

export const meta: MetaFunction = () => [{ title: 'Pagar tu pedido · Wapsell' }];

/**
 * OR-B4-055 — the link to pay an order (the business sends it in the chat): signed in, it opens
 * Mercado Pago for that checkout; otherwise the customer signs in first and comes back here. A
 * checkout already paid, or left 30 minutes unpaid, says so instead.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug ?? '';
  const checkoutId = checkoutToPay(`pagar:${params.checkoutId ?? ''}`);
  if (!checkoutId) throw new Response('Pedido no encontrado', { status: 404 });
  const customer = await getStoreCustomer(request, slug);
  if (!customer) return redirect(`/tienda/${slug}/cuenta?volver=pagar:${checkoutId}`);
  try {
    const { url } = await payCheckout(customer.jwt, slug, checkoutId);
    return redirect(url);
  } catch (error) {
    if (error instanceof ApiError) return json({ slug, message: error.message });
    throw error;
  }
}

export default function PayCheckout() {
  const { slug, message } = useLoaderData<typeof loader>();
  return (
    <main className="store-shell">
      <section className="account-intro">
        <span className="eyebrow">TU PEDIDO</span>
        <h1>No pudimos abrir el pago</h1>
        <output className="form-error">{message}</output>
        <p>
          <Link to={`/tienda/${slug}/chat`}>Volver al chat</Link> · <Link to={`/tienda/${slug}/cuenta`}>Mis pedidos</Link>
        </p>
      </section>
    </main>
  );
}
