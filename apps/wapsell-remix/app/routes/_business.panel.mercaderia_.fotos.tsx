import {
  json,
  redirect,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
  type ActionFunctionArgs,
} from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, apiUpload } from '~/services/api.server';
import { MAX_PHOTOS, PHOTO_UPLOAD_MAX_BYTES } from '~/utils/catalog';

/**
 * OR-B4-046 rule 12 — the photos of a product, from the Mercadería editor: upload (the browser
 * shrinks them first), make one the main photo, or remove one. The page's script sends
 * `respuesta=json` and gets JSON; a form (with or without JavaScript) comes back to the product.
 */
export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const acceptsJson = (request.headers.get('Accept') ?? '').includes('application/json');
  const multipart = (request.headers.get('Content-Type') ?? '').includes('multipart/form-data');
  const form = multipart
    ? await unstable_parseMultipartFormData(request, unstable_createMemoryUploadHandler({ maxPartSize: PHOTO_UPLOAD_MAX_BYTES })).catch(() => null)
    : await request.formData();
  const wantsJson = form ? form.get('respuesta') === 'json' : acceptsJson;
  const productId = String(form?.get('productoId') ?? '');
  const back = `/panel/mercaderia?p=${encodeURIComponent(productId)}`;
  const answer = (ok: boolean, message: string, status = ok ? 200 : 400) =>
    wantsJson ? json({ ok, message }, { status }) : redirect(ok ? `${back}&fotos=ok` : `${back}&fotos=${encodeURIComponent(message)}`);

  if (!form) return answer(false, 'Cada foto puede pesar hasta 10 MB.', 413);
  if (!productId) return answer(false, 'Falta el producto.');
  const base = `/catalogo/productos/${encodeURIComponent(productId)}/fotos`;
  const intent = String(form.get('intent') ?? '');
  try {
    if (intent === 'upload') {
      const files = form.getAll('archivo').filter((f): f is File => f instanceof File && f.size > 0);
      if (!files.length) return answer(false, 'Elegí una o más fotos.');
      for (const file of files.slice(0, MAX_PHOTOS)) {
        const upload = new FormData();
        upload.append('archivo', file, file.name || 'foto.jpg');
        await apiUpload(token, base, upload);
      }
      return answer(true, files.length === 1 ? 'Foto agregada.' : `${files.length} fotos agregadas.`);
    }
    const photoId = String(form.get('fotoId') ?? '');
    if (intent === 'first') {
      await apiRequest(token, `${base}/orden`, { method: 'PATCH', body: JSON.stringify({ ids: [photoId] }) });
      return answer(true, 'Listo: es la foto principal.');
    }
    if (intent === 'remove') {
      await apiRequest(token, `${base}/${encodeURIComponent(photoId)}`, { method: 'DELETE' });
      return answer(true, 'Foto quitada.');
    }
    return answer(false, 'Acción desconocida.');
  } catch (error) {
    if (error instanceof ApiError) return answer(false, error.message, error.status);
    throw error;
  }
}
