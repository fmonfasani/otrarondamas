import { createCookieSessionStorage } from '@remix-run/node';
import { getApiBaseUrl } from './api.server';

const SESSION_SECRET = process.env.SESSION_SECRET;

if (process.env.NODE_ENV === 'production' && !SESSION_SECRET) {
  throw new Error(
    'SESSION_SECRET environment variable must be set in production. ' +
    'Set a strong, randomly-generated secret and restart the application.'
  );
}

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    sameSite: 'lax',
    secrets: [SESSION_SECRET || 'dev-only-secret-do-not-use-in-production'],
    secure: process.env.NODE_ENV === 'production',
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;

/**
 * Validate the session against the existing authenticated profile endpoint.
 * NestJS does not expose POST /auth/validate; GET /auth/me is the canonical
 * authenticated-user endpoint and applies the API's identity guards.
 */
export async function validateJWT(token: string): Promise<boolean> {
  if (!token) return false;

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Response('Authentication service is unavailable.', { status: 503 });
  }

  if (response.status === 401 || response.status === 404) return false;
  if (response.status === 403) {
    throw new Response('This identity cannot access staff operations.', { status: 403 });
  }
  if (!response.ok) {
    throw new Response('Authentication service is unavailable.', { status: 503 });
  }

  return true;
}

export async function getCurrentUser(token: string) {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Response('Authentication service is unavailable.', { status: 503 });
  }

  if (response.status === 401 || response.status === 404) return null;
  if (response.status === 403) {
    throw new Response('This identity cannot access staff operations.', { status: 403 });
  }
  if (!response.ok) {
    throw new Response('Authentication service is unavailable.', { status: 503 });
  }

  return response.json();
}

export async function loginWithNestJS(email: string, password: string) {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    throw new Response('Authentication service is unavailable.', { status: 503 });
  }
  if (!response.ok) throw new Error('Invalid credentials');
  // API contract: AuthService.issueSession → { accessToken, usuario, empresas, empresaId }.
  const data = await response.json();
  if (!data?.accessToken) throw new Error('Invalid credentials');
  return {
    token: data.accessToken as string,
    user: data.usuario,
    empresas: Array.isArray(data.empresas) ? data.empresas : [],
    empresaId: data.empresaId as string | undefined,
  };
}

export async function requireAuth(request: Request) {
  const session = await getSession(request.headers.get('Cookie'));
  const token = session.get('jwt');

  if (!token) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const isValid = await validateJWT(token);
  if (!isValid) {
    throw new Response('Token expired or user no longer exists.', { status: 401 });
  }

  return token;
}
