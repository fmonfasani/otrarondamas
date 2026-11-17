import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import {
  commitSession,
  getCurrentUser,
  getSession,
  REMEMBER_ME_MAX_AGE,
} from '~/services/auth.server';

/**
 * Where the API sends the browser back after Google:
 *   ?token=…                   a session (accounts without a second factor)
 *   ?mfa=verificar|activar&ticket=…   OR-B4-044: the second step is still missing
 * The values leave the address right away: the session lives in the httpOnly cookie.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const fail = redirect('/es/auth/login?error=google');
  const session = await getSession(request.headers.get('Cookie'));

  const mfa = url.searchParams.get('mfa');
  const ticket = url.searchParams.get('ticket');
  if ((mfa === 'verificar' || mfa === 'activar') && ticket) {
    session.unset('jwt');
    session.set('mfaTicket', ticket);
    session.set('mfaStep', mfa);
    session.set('mfaRemember', true);
    session.set('mfaRedirect', '/es/dashboard');
    session.unset('mfaEnroll');
    return redirect(`/es/auth/${mfa === 'activar' ? 'activar-mfa' : 'verificacion'}`, {
      headers: { 'Set-Cookie': await commitSession(session) },
    });
  }

  const token = url.searchParams.get('token');
  if (!token) return fail;
  const user = await getCurrentUser(token);
  if (!user) return fail;
  session.set('jwt', token);
  session.set('userId', user.id);
  session.set('empresaId', user.empresaId);
  return redirect('/es/dashboard', {
    headers: { 'Set-Cookie': await commitSession(session, { maxAge: REMEMBER_ME_MAX_AGE }) },
  });
}
