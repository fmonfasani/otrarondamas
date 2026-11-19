import { type LoaderFunctionArgs } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';
import { proxyFile } from '~/services/api.server';

/** OR-B4-046 rule 12 — a product photo in the panel (any product of the Business, published or not). */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const productId = encodeURIComponent(params.productoId ?? '');
  const photoId = encodeURIComponent(params.fotoId ?? '');
  return proxyFile(token, `/catalogo/productos/${productId}/fotos/${photoId}`);
}
