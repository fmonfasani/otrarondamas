import { redirect } from '@remix-run/node';

/**
 * «Continuar con Google» of «Vendé en Wapsell» (ADR-IDN-008): the API flow that, for a Google
 * identity without an account, comes back to /vender to register the Business.
 */
export function loader() {
  const api = withoutTrailingSlash(process.env.API_PUBLIC_URL || 'https://api.wapsell.com');
  return redirect(`${api}/auth/registro/google/iniciar`);
}

/** «https://api.x/» → «https://api.x» (no regular expression). */
function withoutTrailingSlash(url: string) {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end -= 1;
  return url.slice(0, end);
}
