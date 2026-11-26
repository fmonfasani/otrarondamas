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

/**
 * Authenticated multipart upload (a file plus text fields) to the API. fetch sets the
 * multipart boundary itself, so no Content-Type is given here. Same errors as apiRequest.
 */
export async function apiUpload<T>(token: string, path: string, body: FormData): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      body,
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    throw new ApiError(503, 'No pudimos conectarnos. Intenta de nuevo en unos minutos.');
  }
  if (!response.ok) throw new ApiError(response.status, await messageFrom(response));
  return (await response.json()) as T;
}

/**
 * OR-B4-037 — passes a chat file from the API to the browser, which never holds the token.
 * Keeps the API's safe headers (type, nosniff, disposition, private cache).
 */
export async function proxyFile(token: string, path: string, request?: Request): Promise<Response> {
  let response: Response;
  // E5: a voice note or a video is read in pieces (seeking; Safari needs it to play at all).
  const range = request?.headers.get('range');
  const asked: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (range && /^bytes=\d*-\d*$/.test(range)) asked.Range = range;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, { headers: asked });
  } catch {
    return new Response('No pudimos traer el archivo.', { status: 503 });
  }
  if (response.status === 416) return new Response(null, { status: 416, headers: { 'Content-Range': response.headers.get('content-range') ?? '' } });
  if (!response.ok) return new Response('Archivo no encontrado', { status: response.status === 403 ? 404 : response.status });
  const headers = new Headers();
  for (const name of ['content-type', 'content-disposition', 'x-content-type-options', 'cache-control', 'content-length', 'accept-ranges', 'content-range']) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, { status: response.status === 206 ? 206 : 200, headers });
}

/**
 * OR-B4-046 rule 12 — passes a public file of the store (a product photo) from the API to the
 * browser, keeping its type and its cache (photos never change).
 */
export async function proxyPublicFile(path: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`);
  } catch {
    return new Response('No pudimos traer la foto.', { status: 503 });
  }
  if (!response.ok) return new Response('Foto no encontrada', { status: response.status === 503 ? 503 : 404 });
  const headers = new Headers();
  for (const name of ['content-type', 'cache-control', 'content-length']) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, { status: 200, headers });
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
