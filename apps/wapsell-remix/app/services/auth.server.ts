import { createCookieSessionStorage } from '@remix-run/node';
import { getApiBaseUrl } from './api.server';

const SESSION_SECRET = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === 'production' && !SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable must be set in production.');
}
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session', httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/',
    sameSite: 'lax', secrets: [SESSION_SECRET || 'dev-only-secret-do-not-use-in-production'],
    secure: process.env.NODE_ENV === 'production',
  },
});
export const { getSession, commitSession, destroySession } = sessionStorage;

export async function validateJWT(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    if (response.status === 401 || response.status === 403) return false;
    if (!response.ok) throw new Response('Authentication service is unavailable.', { status: 503 });
    return true;
  } catch (error) {
    if (error instanceof Response) throw error;
    throw new Response('Authentication service is unavailable.', { status: 503 });
  }
}

export async function getCurrentUser(token: string) {
  const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function loginWithNestJS(email: string, password: string) {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    throw new Response('Authentication service is unavailable.', { status: 503 });
  }
  if (!response.ok) throw new Error('Invalid credentials');
  const data = await response.json();
  return { token: data.access_token, user: data.user, empresas: data.empresas };
}

export async function requireAuth(request: Request) {
  const session = await getSession(request.headers.get('Cookie'));
  const token = session.get('jwt');
  if (!token) throw new Response('Unauthorized', { status: 401 });
  if (!(await validateJWT(token))) throw new Response('Token expired', { status: 401 });
  return token;
}
