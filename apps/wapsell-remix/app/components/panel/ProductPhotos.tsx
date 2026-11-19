import { Form, useRevalidator } from '@remix-run/react';
import { useState, type FormEvent } from 'react';
import { MAX_PHOTOS, PHOTO_MAX_SIDE, panelPhotoSrc, type ProductPhoto } from '~/utils/catalog';

const ACTION = '/panel/mercaderia/fotos';
/** A photo this light and this small goes as it is; anything heavier becomes a JPEG. */
const LIGHT_BYTES = 400_000;

/**
 * Shrinks a photo in the browser before sending it (longest side 1600 px, JPEG), so a photo taken
 * with the phone uploads fast and weighs little in the store. If the browser cannot, it goes as it
 * is (the API still checks its format and size).
 */
async function shrink(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= LIGHT_BYTES) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return file;
    // A transparent PNG gets a white background instead of a black one.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', 0.85));
  } catch {
    return file;
  }
}

function PhotoAction({ intent, productId, photoId, label, busy }: Readonly<{ intent: string; productId: string; photoId: string; label: string; busy: boolean }>) {
  return (
    <Form method="post" action={ACTION}>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="productoId" value={productId} />
      <input type="hidden" name="fotoId" value={photoId} />
      <button type="submit" disabled={busy}>
        {label}
      </button>
    </Form>
  );
}

/**
 * OR-B4-046 rule 12 — the photos of a product in the Mercadería editor: up to 5, the first one is
 * the photo of the store's list. Uploading shrinks them in the browser and sends them one by one;
 * without JavaScript the form still uploads them as they are.
 */
export function ProductPhotos({ productId, photos, canEdit }: Readonly<{ productId: string; photos: ProductPhoto[]; canEdit: boolean }>) {
  const revalidator = useRevalidator();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const room = MAX_PHOTOS - photos.length;

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    const input = event.currentTarget.elements.namedItem('archivo') as HTMLInputElement | null;
    const files = [...(input?.files ?? [])];
    if (!files.length) return;
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    let added = 0;
    let failure = '';
    for (const file of files.slice(0, room)) {
      const body = new FormData();
      body.append('intent', 'upload');
      body.append('productoId', productId);
      body.append('respuesta', 'json');
      body.append('archivo', await shrink(file), file.name);
      try {
        const response = await fetch(ACTION, { method: 'POST', body, headers: { Accept: 'application/json' } });
        const data = (await response.json()) as { ok: boolean; message: string };
        if (!data.ok) {
          failure = data.message;
          break;
        }
        added += 1;
      } catch {
        failure = 'No pudimos subir la foto. Probá de nuevo.';
        break;
      }
    }
    if (!failure && files.length > room) failure = `Cada producto lleva hasta ${MAX_PHOTOS} fotos: subimos las primeras ${room}.`;
    if (input) input.value = '';
    setBusy(false);
    setNotice(failure ? { ok: false, message: failure } : { ok: true, message: added === 1 ? 'Foto agregada.' : `${added} fotos agregadas.` });
    revalidator.revalidate();
  };

  return (
    <fieldset className="ws-new__group ws-photos">
      <legend>Fotos para la tienda</legend>
      {photos.length ? (
        <ul className="ws-photos__grid">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <img src={panelPhotoSrc(productId, photo.id)} alt={index === 0 ? 'Foto principal' : `Foto ${index + 1}`} loading="lazy" />
              {index === 0 ? <span className="ws-photos__main">Principal</span> : null}
              {canEdit ? (
                <div className="ws-photos__actions">
                  {index > 0 ? <PhotoAction intent="first" productId={productId} photoId={photo.id} label="Principal" busy={busy} /> : null}
                  <PhotoAction intent="remove" productId={productId} photoId={photo.id} label="Quitar" busy={busy} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="ws-meta">Todavía no tiene fotos: la tienda muestra la inicial del nombre.</p>
      )}
      {canEdit && room > 0 ? (
        <Form method="post" action={ACTION} encType="multipart/form-data" className="ws-photos__upload" onSubmit={upload}>
          <input type="hidden" name="intent" value="upload" />
          <input type="hidden" name="productoId" value={productId} />
          <input type="file" name="archivo" accept="image/jpeg,image/png,image/webp" multiple required aria-label="Elegir fotos" />
          <button className="ws-button ws-button--outline ws-button--auto" type="submit" disabled={busy}>
            {busy ? 'Subiendo…' : 'Subir fotos'}
          </button>
          <small className="ws-field__hint">
            JPG, PNG o WebP. Hasta {MAX_PHOTOS} por producto: {room === 1 ? 'queda 1 lugar' : `quedan ${room} lugares`}.
          </small>
        </Form>
      ) : null}
      {notice ? (
        <p className={notice.ok ? 'ws-success-note' : 'ws-alert'} role={notice.ok ? 'status' : 'alert'}>
          {notice.message}
        </p>
      ) : null}
    </fieldset>
  );
}
