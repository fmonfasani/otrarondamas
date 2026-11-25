import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';
import { realtimeStream } from '~/services/realtime.server';

/** E1 — the open Mensajes screen hears «cambio» and «escribiendo» at once (see realtime.server). */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  return realtimeStream(request, token, 'equipo');
}
