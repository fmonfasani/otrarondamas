import { createCookie } from '@remix-run/node';
import { ApiError, getApiBaseUrl } from './api.server';

/**
 * OR-B4-044 — «Recordar este dispositivo»: the API's 30-day device token, kept in its own
 * httpOnly cookie (never readable by the page) and sent with the next password sign-in.
 */
export const deviceCookie = createCookie('__wapsell_device', {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 30,
  secrets: [process.env.SESSION_SECRET || 'dev-only-secret-do-not-use-in-production'],
});

export async function deviceFrom(request: Request): Promise<string | undefined> {
  const value = await deviceCookie.parse(request.headers.get('Cookie'));
  return typeof value === 'string' && value ? value : undefined;
}

/** A call to the API's public second-factor endpoints (they take the sign-in ticket). */
export async function mfaPublicPost<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/auth/mfa${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(503, 'No pudimos conectarnos. Intenta de nuevo en unos minutos.');
  }
  const data = (await response.json().catch(() => ({}))) as { message?: string | string[] };
  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message.join(' ') : data.message;
    throw new ApiError(response.status, message || 'No pudimos verificar el código.');
  }
  return data as T;
}

/** Six digits (spaces allowed) or a recovery code like `abcd-efgh`. */
export const sixDigits = (value: unknown) =>
  typeof value === 'string' && /^\d{6}$/.test(value.replaceAll(/\s/g, ''));
