import { redirect } from '@remix-run/node';

/**
 * «Continuar con Google» of «Vendé en Wapsell» (ADR-IDN-008): the API flow that, for a Google
 * identity without an account, comes back to /vender to register the Business.
 */
export function loader() {
  const api = (process.env.API_PUBLIC_URL || 'https://api.wapsell.com').replace(/\/+$/, '');
  return redirect(`${api}/auth/registro/google/iniciar`);
}
