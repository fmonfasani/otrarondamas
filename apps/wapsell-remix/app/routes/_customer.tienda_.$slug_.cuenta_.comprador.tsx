import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { buyerApi, getBuyer } from '~/services/buyer-session.server';
import { signInCookie } from '~/services/customer-session.server';
import { afterSignIn } from './_customer.tienda_.$slug_.cuenta';

/**
 * Enter a store with the universal buyer account — /tienda/:slug/cuenta/comprador (ADR-IDN-008).
 * The API links (or creates) this store's customer account for the buyer and returns the store
 * session, which goes to the store cookie. Without a buyer session: sign in first.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug ?? '';
  const volver = new URL(request.url).searchParams.get('volver');
  const buyer = await getBuyer(request);
  if (!buyer) return redirect(`/es/auth/login?redirectTo=${encodeURIComponent(`/tienda/${slug}/cuenta/comprador`)}`);
  const result = await buyerApi<{ accessToken: string; cliente: { nombre: string; email: string } }>(
    `/negocio/${encodeURIComponent(slug)}`,
    { method: 'POST', jwt: buyer.jwt },
  );
  if (!result.ok) return redirect(`/tienda/${encodeURIComponent(slug)}/cuenta?error=comprador`);
  return redirect(afterSignIn(slug, volver), { headers: { 'Set-Cookie': await signInCookie(request, slug, result.data) } });
}
