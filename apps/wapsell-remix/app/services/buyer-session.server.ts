import { createCookieSessionStorage } from '@remix-run/node';
import { getApiBaseUrl } from './api.server';

/**
 * ADR-IDN-001/008 — session of the universal buyer (Comprador): its own cookie, separate from
 * the staff `__session` and from each store's `__wapsell_customer`. The buyer token stays on the
 * Remix server (httpOnly); the browser never sees it.
 */
const buyerStorage = createCookieSessionStorage({
  cookie: {
    name: '__wapsell_buyer',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.SESSION_SECRET || 'dev-only-secret-do-not-use-in-production'],
    secure: process.env.NODE_ENV === 'production',
  },
});

export type Buyer = { jwt: string; nombre: string; email: string };
export type BuyerLogin = { accessToken: string; comprador: { nombre: string; email: string } };

const sessionOf = (request: Request) => buyerStorage.getSession(request.headers.get('Cookie'));

export async function getBuyer(request: Request): Promise<Buyer | null> {
  const session = await sessionOf(request);
  const jwt = session.get('jwt');
  return jwt ? { jwt, nombre: session.get('nombre') ?? '', email: session.get('email') ?? '' } : null;
}

export async function buyerSignInCookie(request: Request, login: BuyerLogin) {
  const session = await sessionOf(request);
  session.set('jwt', login.accessToken);
  session.set('nombre', login.comprador.nombre);
  session.set('email', login.comprador.email);
  return buyerStorage.commitSession(session);
}

export async function buyerSignOutCookie(request: Request) {
  return buyerStorage.destroySession(await sessionOf(request));
}

type Result<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

/** A call to /auth/comprador…; messages are fit to show the buyer. */
export async function buyerApi<T>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown; jwt?: string } = {},
): Promise<Result<T>> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/auth/comprador${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.jwt ? { Authorization: `Bearer ${init.jwt}` } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    return { ok: false, status: 503, message: 'No pudimos conectarnos. Probá de nuevo en unos minutos.' };
  }
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string | string[] };
  if (response.ok) return { ok: true, data: payload };
  const message = Array.isArray(payload.message) ? payload.message.join(' ') : payload.message;
  return { ok: false, status: response.status, message: message || 'No pudimos completar la operación.' };
}
