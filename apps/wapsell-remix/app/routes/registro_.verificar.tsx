import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { buyerApi, buyerSignInCookie, type BuyerLogin } from '~/services/buyer-session.server';

/**
 * The link of the verification email (/registro/verificar?token=…): confirms the buyer's email
 * and signs them in. The token is single-use; a stale one goes back to sign-up.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!token) return redirect('/registro');
  const result = await buyerApi<BuyerLogin>('/verificar', { method: 'POST', body: { token } });
  if (!result.ok) return redirect('/registro?error=enlace');
  return redirect('/cuenta?bienvenida=1', { headers: { 'Set-Cookie': await buyerSignInCookie(request, result.data) } });
}
