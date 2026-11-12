import { vi } from 'vitest';
import { commitSession, getSession } from '../../app/services/auth.server';

/** Shared plumbing for route tests: a signed-in session and a fake API behind fetch. */

export const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

export async function sessionCookie() {
  const session = await getSession();
  session.set('jwt', 'jwt-token');
  return (await commitSession(session)).split(';')[0];
}

export function formBody(pairs: Array<[string, string]>) {
  const body = new URLSearchParams();
  for (const [key, value] of pairs) body.append(key, value);
  return body;
}

type Handler = (args: { request: Request; params: Record<string, string>; context: Record<string, never> }) => unknown;

/** POSTs a form to a route action as a signed-in user. */
export async function postTo(handler: Handler, path: string, pairs: Array<[string, string]>) {
  return handler({
    request: new Request(`http://app.test/es/dashboard/${path}`, {
      method: 'POST',
      body: formBody(pairs),
      headers: { Cookie: await sessionCookie() },
    }),
    params: { lang: 'es' },
    context: {},
  }) as Promise<Response>;
}

/**
 * Stubs fetch: /auth/me answers as `role`, every other call goes to the returned mock.
 * Call `restore` (vi.unstubAllGlobals) in afterEach.
 */
export function stubApi(role = 'OWNER') {
  process.env.API_BASE_URL = 'http://api.test';
  const api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
      String(input).endsWith('/auth/me') ? ok({ id: 'u-1', rol: role }) : api(String(input), init),
    ),
  );
  return api;
}
