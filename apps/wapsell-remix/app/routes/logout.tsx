import { redirect, type ActionFunction } from '@remix-run/node';
import { destroySession, getSession } from '~/services/auth.server';

/**
 * Logout Action
 *
 * ROUTE: /logout (POST)
 * AREA: Shared (all authenticated areas)
 *
 * Destroys session and redirects to login.
 */

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return redirect('/');
  }

  const session = await getSession(request.headers.get('Cookie'));
  return redirect('/es/auth/login', {
    headers: {
      'Set-Cookie': await destroySession(session),
    },
  });
};

export default function Logout() {
  return null;
}
