import {
  json,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
  type ActionFunctionArgs,
} from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiUpload } from '~/services/api.server';
import { CHAT_UPLOAD_MAX_BYTES } from '~/utils/messaging';

/** OR-B4-037 — the team sends a photo or PDF to a conversation (data only, no page). */
export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await unstable_parseMultipartFormData(
    request,
    unstable_createMemoryUploadHandler({ maxPartSize: CHAT_UPLOAD_MAX_BYTES }),
  ).catch(() => null);
  if (!form) return json({ ok: false, message: 'El archivo es demasiado grande: fotos y PDF hasta 10 MB, videos hasta 64 MB.' }, { status: 413 });
  const conversationId = String(form.get('conversationId') ?? '');
  const file = form.get('archivo');
  if (!conversationId || !(file instanceof File) || file.size === 0) {
    return json({ ok: false, message: 'Elegí una foto, un video o un PDF.' }, { status: 400 });
  }
  const upload = new FormData();
  upload.append('clientMessageId', crypto.randomUUID());
  const caption = String(form.get('caption') ?? '').trim();
  if (caption) upload.append('caption', caption);
  // E5: a voice note from the microphone says so, with its length in seconds.
  if (form.get('voz') === '1') {
    upload.append('voz', '1');
    const seconds = String(form.get('duracion') ?? '');
    if (/^\d{1,4}$/.test(seconds)) upload.append('duracion', seconds);
  }
  upload.append('archivo', file, file.name);
  try {
    await apiUpload(token, `/messaging/conversations/${encodeURIComponent(conversationId)}/attachments`, upload);
    return json({ ok: true, message: '' });
  } catch (error) {
    if (error instanceof ApiError) return json({ ok: false, message: error.message }, { status: error.status });
    throw error;
  }
}
