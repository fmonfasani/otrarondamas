import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createCookie, redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { buyerApi, buyerSignInCookie } from '~/services/buyer-session.server';

/**
 * «Continuar con Google» for the universal buyer — /registro/google (ADR-IDN-008).
 *   no token  → hand the browser to the API (/auth/comprador/google), which talks to Google.
 *   ?token=…  → the API is back with a buyer session: it moves to the httpOnly cookie.
 * The browser that starts gets a random value in an httpOnly cookie; it travels inside the
 * API's signed state and must come back unchanged, so a link with someone else's token
 * (login CSRF) is refused.
 */
const startCookie = createCookie('__wapsell_buyer_google', {
  httpOnly: true,
  sameSite: 'lax',
  path: '/registro',
  maxAge: 600,
  secure: process.env.NODE_ENV === 'production',
});

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    if (process.env.GOOGLE_LOGIN_ENABLED !== '1') return redirect('/registro');
    const nonce = randomBytes(24).toString('base64url');
    const api = withoutTrailingSlash(process.env.API_PUBLIC_URL || 'https://api.wapsell.com');
    const next = new URL(`${api}/auth/comprador/google`);
    next.searchParams.set('web', nonce);
    return redirect(next.toString(), { headers: { 'Set-Cookie': await startCookie.serialize(nonce) } });
  }

  const clear = await startCookie.serialize('', { maxAge: 0 });
  const fail = redirect('/registro?error=google', { headers: { 'Set-Cookie': clear } });
  const expected = (await startCookie.parse(request.headers.get('Cookie'))) as string | null;
  const web = url.searchParams.get('web') ?? '';
  if (!expected || !web || !same(expected, web)) return fail;

  const me = await buyerApi<{ nombre: string; email: string }>('/me', { jwt: token });
  if (!me.ok) return fail;

  const headers = new Headers();
  headers.append('Set-Cookie', clear);
  headers.append('Set-Cookie', await buyerSignInCookie(request, { accessToken: token, comprador: me.data }));
  return redirect('/cuenta', { headers });
}

/** «https://api.x/» → «https://api.x» (no regular expression). */
function withoutTrailingSlash(url: string) {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end -= 1;
  return url.slice(0, end);
}
