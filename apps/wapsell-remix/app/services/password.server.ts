import { getApiBaseUrl } from './api.server';

export const SERVICE_UNAVAILABLE = 'No pudimos conectarnos. Intenta de nuevo en unos minutos.';
export const INVALID_LINK = 'El enlace no es válido o ya venció. Pide uno nuevo.';

/** POST /auth/password/forgot — the API answers the same whether the account exists or not. */
export async function requestPasswordReset(email: string): Promise<{ ok: true } | { error: string }> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/password/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (response.ok) return { ok: true };
    if (response.status === 400) return { error: 'Escribe un correo electrónico válido.' };
    return { error: SERVICE_UNAVAILABLE };
  } catch {
    return { error: SERVICE_UNAVAILABLE };
  }
}

/** POST /auth/password/reset — consumes the single-use link. */
export async function resetPassword(
  token: string,
  password: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    if (response.ok) return { ok: true };
    if (response.status === 400) {
      const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
      const message = Array.isArray(body?.message) ? body?.message[0] : body?.message;
      return { error: message || INVALID_LINK };
    }
    return { error: SERVICE_UNAVAILABLE };
  } catch {
    return { error: SERVICE_UNAVAILABLE };
  }
}
