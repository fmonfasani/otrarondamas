import {
  json,
  redirect,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
  type ActionFunctionArgs,
} from '@remix-run/node';
import { ApiError, apiUpload } from '~/services/api.server';
import { getStoreCustomer } from '~/services/customer-session.server';
import { CHAT_FILE_MAX_BYTES } from '~/utils/messaging';

/** OR-B4-037 — the store customer sends a photo or PDF to the Business. */
export async function action({ request, params }: ActionFunctionArgs) {
  const slug = params.slug ?? '';
  const customer = await getStoreCustomer(request, slug);
  if (!customer) throw redirect(`/tienda/${slug}/cuenta?volver=chat`);
  const form = await unstable_parseMultipartFormData(
    request,
    unstable_createMemoryUploadHandler({ maxPartSize: CHAT_FILE_MAX_BYTES }),
  ).catch(() => null);
  if (!form) return json({ ok: false, message: 'El archivo puede pesar hasta 10 MB.' }, { status: 413 });
  const file = form.get('archivo');
  if (!(file instanceof File) || file.size === 0) return json({ ok: false, message: 'Elegí una foto o un PDF.' }, { status: 400 });
  const upload = new FormData();
  upload.append('clientMessageId', crypto.randomUUID());
  upload.append('archivo', file, file.name);
  try {
    await apiUpload(customer.jwt, `/${encodeURIComponent(slug)}/tienda/chat/adjuntos`, upload);
    return json({ ok: true, message: '' });
  } catch (error) {
    if (error instanceof ApiError) return json({ ok: false, message: error.message }, { status: error.status });
    throw error;
  }
}
