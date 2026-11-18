import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';
import { apiRequest, settle } from '~/services/api.server';
import type { SearchProduct } from '~/utils/sales';

/** OR-B4-037 — catalogue search for the product picker of Mensajes (no page, data only). */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return json({ q, products: [] as SearchProduct[] });
  const products = await settle(apiRequest<SearchProduct[]>(token, `/ventas/productos?search=${encodeURIComponent(q)}`));
  return json({ q, products: (products ?? []).slice(0, 8) });
}
