import { redirect } from '@remix-run/node';

/**
 * «Ingresar con Google»: hands the browser to the API, which talks to Google and comes back to
 * /auth/google/callback. Only invited staff accounts get in (the API refuses anyone else).
 */
export function loader() {
  const api = (process.env.API_PUBLIC_URL || 'https://api.wapsell.com').replace(/\/+$/, '');
  return redirect(`${api}/auth/google`);
}
