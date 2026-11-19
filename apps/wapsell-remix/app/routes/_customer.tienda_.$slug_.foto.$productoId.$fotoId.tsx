import { type LoaderFunctionArgs } from '@remix-run/node';
import { proxyPublicFile } from '~/services/api.server';

/**
 * OR-B4-046 rule 12 — a photo of a published product of the store. The API only finds photos of
 * published products of this Business; a photo never changes, so its long public cache is kept.
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const slug = encodeURIComponent(params.slug ?? '');
  const productId = encodeURIComponent(params.productoId ?? '');
  const photoId = encodeURIComponent(params.fotoId ?? '');
  return proxyPublicFile(`/${slug}/tienda/productos/${productId}/fotos/${photoId}`);
}
