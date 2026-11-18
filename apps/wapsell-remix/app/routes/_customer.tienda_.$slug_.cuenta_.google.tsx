import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createCookie, redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { getApiBaseUrl } from '~/services/api.server';
import { signInCookie } from '~/services/customer-session.server';
import { afterSignIn } from './_customer.tienda_.$slug_.cuenta';

/**
 * «Continuar con Google» in a store — /tienda/:slug/cuenta/google (ADR-IDN-007).
 *   no token  → hand the browser to the API, which talks to Google for this store.
 *   ?token=…  → the API is back with a customer session of this store: it moves to the
 *               httpOnly cookie right away and the browser returns where it came from.
 *
 * The browser that starts gets a random value in an httpOnly cookie; it travels inside the
 * API's signed state and must come back unchanged. A link with someone else's token (login
 * CSRF) has no matching cookie and is refused.
 */
const startCookie = createCookie('__wapsell_store_google', {
  httpOnly: true,
  sameSite: 'lax',
  path: '/tienda',
  maxAge: 600,
  secure: process.env.NODE_ENV === 'production',
});

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug ?? '';
  const url = new URL(request.url);
  const volver = url.searchParams.get('volver');
  const account = `/tienda/${encodeURIComponent(slug)}/cuenta`;
  const token = url.searchParams.get('token');

  if (!token) {
    if (process.env.GOOGLE_LOGIN_ENABLED !== '1') return redirect(account);
    const nonce = randomBytes(24).toString('base64url');
    const api = (process.env.API_PUBLIC_URL || 'https://api.wapsell.com').replace(/\/+$/, '');
    const next = new URL(`${api}/auth/cliente/negocio/${encodeURIComponent(slug)}/google`);
    next.searchParams.set('web', nonce);
    if (volver === 'carrito' || volver === 'chat') next.searchParams.set('volver', volver);
    return redirect(next.toString(), { headers: { 'Set-Cookie': await startCookie.serialize(nonce) } });
  }

  const clear = await startCookie.serialize('', { maxAge: 0 });
  const fail = redirect(`${account}?error=google`, { headers: { 'Set-Cookie': clear } });
  const expected = (await startCookie.parse(request.headers.get('Cookie'))) as string | null;
  const web = url.searchParams.get('web') ?? '';
  if (!expected || !web || !same(expected, web)) return fail;

  let profile: { nombre?: string; email?: string } | null = null;
  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/cliente/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (response.ok) profile = (await response.json()) as { nombre?: string; email?: string };
  } catch {
    profile = null;
  }
  if (!profile?.email) return fail;

  const headers = new Headers();
  headers.append('Set-Cookie', clear);
  headers.append(
    'Set-Cookie',
    await signInCookie(request, slug, { accessToken: token, cliente: { nombre: profile.nombre ?? '', email: profile.email } }),
  );
  return redirect(afterSignIn(slug, volver), { headers });
}
