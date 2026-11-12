import { createCookieSessionStorage } from '@remix-run/node';
import { getApiBaseUrl } from './api.server';

/**
 * Session of a store customer — its own cookie, separate from the staff `__session`, so
 * signing in to a store never touches the business panel and vice versa. The customer
 * token stays on the Remix server (httpOnly); the browser never sees it.
 *
 * An account belongs to one Business (Cliente is per Empresa), so the session remembers
 * the store slug it was opened in and only counts as signed in for that store.
 */
const customerStorage = createCookieSessionStorage({
  cookie: {
    name: '__wapsell_customer',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.SESSION_SECRET || 'dev-only-secret-do-not-use-in-production'],
    secure: process.env.NODE_ENV === 'production',
  },
});

export type StoreCustomer = { jwt: string; nombre: string; email: string };

async function sessionOf(request: Request) {
  return customerStorage.getSession(request.headers.get('Cookie'));
}

/** The customer signed in to this store, or null. */
export async function getStoreCustomer(request: Request, slug: string): Promise<StoreCustomer | null> {
  const session = await sessionOf(request);
  if (session.get('slug') !== slug || !session.get('jwt')) return null;
  return { jwt: session.get('jwt'), nombre: session.get('nombre') ?? '', email: session.get('email') ?? '' };
}

/** Set-Cookie header that signs the customer in to this store. */
export async function signInCookie(
  request: Request,
  slug: string,
  login: { accessToken: string; cliente: { nombre: string; email: string } },
) {
  const session = await sessionOf(request);
  session.set('slug', slug);
  session.set('jwt', login.accessToken);
  session.set('nombre', login.cliente.nombre);
  session.set('email', login.cliente.email);
  return customerStorage.commitSession(session);
}

/** Set-Cookie header that signs the customer out. */
export async function signOutCookie(request: Request) {
  return customerStorage.destroySession(await sessionOf(request));
}

export type StoreAuthResult =
  | { ok: true; accessToken: string; cliente: { nombre: string; email: string } }
  | { ok: false; message: string };

/** Login or registration in the store of `slug`. Messages are fit to show the customer. */
export async function storeAuth(
  slug: string,
  mode: 'login' | 'registro',
  body: Record<string, string>,
): Promise<StoreAuthResult> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/auth/cliente/negocio/${encodeURIComponent(slug)}/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, message: 'No pudimos conectarnos con la tienda. Probá de nuevo en unos minutos.' };
  }
  const payload = (await response.json().catch(() => ({}))) as {
    accessToken?: string;
    cliente?: { nombre: string; email: string };
    message?: string | string[];
  };
  if (response.ok && payload.accessToken && payload.cliente) {
    return { ok: true, accessToken: payload.accessToken, cliente: payload.cliente };
  }
  if (response.status === 401) return { ok: false, message: 'El email o la contraseña no son correctos.' };
  if (response.status === 400 && mode === 'registro') {
    const message = Array.isArray(payload.message) ? payload.message.join(' ') : payload.message;
    return {
      ok: false,
      message: message?.startsWith('Ya existe') ? 'Ya tenés una cuenta con ese email. Ingresá con tu contraseña.' : 'Revisá los datos e intentá de nuevo.',
    };
  }
  if (response.status === 404) return { ok: false, message: 'Esta tienda no existe.' };
  return { ok: false, message: 'No pudimos completar el ingreso. Probá de nuevo en unos minutos.' };
}
