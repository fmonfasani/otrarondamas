export function getApiBaseUrl(): string {
  const configuredUrl = process.env.API_BASE_URL || process.env.API_URL;
  if (!configuredUrl) throw new Response('API_BASE_URL is not configured on the Remix server.', { status: 503 });
  try {
    const url = new URL(configuredUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Response('API_BASE_URL is not a valid HTTP(S) URL.', { status: 503 });
  }
}

/** Error from the API with a message fit to show to the user. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const GENERIC_MESSAGES: Record<number, string> = {
  401: 'Tu sesión venció. Vuelve a ingresar.',
  403: 'No tienes permiso para hacer esto.',
  404: 'No encontramos lo que buscabas.',
};

async function messageFrom(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(body?.message) ? body?.message.join(' ') : body?.message;
  if (response.status >= 500) return 'No pudimos completar la operación. Intenta de nuevo en unos minutos.';
  return message || GENERIC_MESSAGES[response.status] || 'No pudimos completar la operación.';
}

/**
 * Authenticated call to the Wapsell API from a loader or action. Throws ApiError with a
 * user-facing message on a non-2xx answer, and on network failure (status 503).
 */
export async function apiRequest<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    throw new ApiError(503, 'No pudimos conectarnos. Intenta de nuevo en unos minutos.');
  }
  if (!response.ok) throw new ApiError(response.status, await messageFrom(response));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Runs several reads; a failed one yields `null` instead of failing the whole page. */
export async function settle<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof Response) throw error;
    return null;
  }
}
