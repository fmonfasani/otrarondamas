import { createCookieSessionStorage, redirect } from '@remix-run/node';
import { getApiBaseUrl } from './api.server';

const SESSION_SECRET = process.env.SESSION_SECRET;

if (process.env.NODE_ENV === 'production' && !SESSION_SECRET) {
  throw new Error(
    'SESSION_SECRET environment variable must be set in production. ' +
      'Set a strong, randomly-generated secret and restart the application.',
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

/** A session from the API (AuthService.issueSession). */
export type ApiSession = {
  token: string;
  user: { id?: string } | undefined;
  empresas: Array<{ id: string }>;
  empresaId: string | undefined;
};

/** OR-B4-044 — the password is right but a second factor is still missing. */
export type MfaStep = { mfa: 'verificar' | 'activar'; ticket: string };

export function sessionFrom(data: Record<string, unknown>): ApiSession {
  if (typeof data?.accessToken !== 'string') throw new Error('Invalid credentials');
  return {
    token: data.accessToken,
    user: data.usuario as ApiSession['user'],
    empresas: Array.isArray(data.empresas) ? data.empresas : [],
    empresaId: data.empresaId as string | undefined,
  };
}

/**
 * POST /auth/login. Returns the session, or the second-factor step (OR-B4-044). `device` is the
 * «remember this device» token from an earlier verification, if this browser has one.
 */
export async function loginWithNestJS(
  email: string,
  password: string,
  device?: string,
): Promise<ApiSession | MfaStep> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, ...(device ? { dispositivo: device } : {}) }),
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    throw new Response('Authentication service is unavailable.', { status: 503 });
  }
  if (!response.ok) throw new Error('Invalid credentials');
  const data = await response.json();
  if ((data?.mfa === 'verificar' || data?.mfa === 'activar') && typeof data.ticket === 'string') {
    return { mfa: data.mfa, ticket: data.ticket };
  }
  return sessionFrom(data);
}

export const isMfaStep = (value: ApiSession | MfaStep): value is MfaStep => 'mfa' in value;

/** "Recordarme": a persistent cookie; unchecked, the session ends with the browser. */
export const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;

/** Writes an API session into the web session cookie. */
export async function commitApiSession(request: Request, api: ApiSession, remember: boolean) {
  const session = await getSession(request.headers.get('Cookie'));
  for (const key of ['mfaTicket', 'mfaStep', 'mfaRemember', 'mfaEnroll', 'mfaRedirect'])
    session.unset(key);
  session.set('jwt', api.token);
  session.set('userId', api.user?.id);
  session.set('empresas', api.empresas);
  session.set('empresaId', api.empresaId ?? api.empresas[0]?.id);
  return commitSession(session, { maxAge: remember ? REMEMBER_ME_MAX_AGE : undefined });
}

/** Only same-site relative paths are accepted as a post-login destination. */
export function safeRedirectPath(value: unknown, fallback = '/es/dashboard'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//'))
    return fallback;
  return value;
}

/** Sends an anonymous or expired visitor to the login page, back to where they were going. */
function loginRedirect(request: Request, clearSession: boolean, headers?: HeadersInit) {
  const url = new URL(request.url);
  const target = `${url.pathname}${url.search}`;
  const lang = url.pathname.split('/')[1] === 'en' ? 'en' : 'es';
  return redirect(`/${lang}/auth/login?redirectTo=${encodeURIComponent(target)}`, {
    headers: clearSession ? headers : undefined,
  });
}

export async function requireAuth(request: Request) {
  const session = await getSession(request.headers.get('Cookie'));
  const token = session.get('jwt');

  if (!token) {
    throw loginRedirect(request, false);
  }

  const isValid = await validateJWT(token);
  if (!isValid) {
    throw loginRedirect(request, true, { 'Set-Cookie': await destroySession(session) });
  }

  return token;
}

/**
 * The dossier state written in the session token when it was issued (the API's
 * ApprovedDossierGuard reads it from there, not from the database). Decoded only to explain
 * the panel to the person; never used to authorize anything.
 */
export function sessionDossierState(token: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as { estadoLegajo?: unknown };
    return typeof payload.estadoLegajo === 'string' ? payload.estadoLegajo : null;
  } catch {
    return null;
  }
}
