import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';
import { proxyFile } from '~/services/api.server';
import { auditQuery } from '~/utils/audit';

/** OR-B4-041 — the filtered audit trail as CSV (Owner only; the API checks and records it). */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  return proxyFile(token, `/auditoria/exportar?${auditQuery(new URL(request.url).searchParams)}`);
}
