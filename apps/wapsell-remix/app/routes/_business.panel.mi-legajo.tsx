import {
  json,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { getCurrentUser, requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, apiUpload, settle } from '~/services/api.server';
import { formatDateTime } from '~/utils/format';
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, dossierFieldsFor, dossierProgress, type DossierDocument } from '~/utils/team';

export const meta: MetaFunction = () => [{ title: 'Mi legajo · Wapsell' }];

interface Dossier {
  dni: string | null;
  telefono: string | null;
  direccion: string | null;
  cuit: string | null;
  razonSocial: string | null;
  condicionIva: string | null;
  DocumentoLegajo: Array<DossierDocument & { rutaArchivo?: string }>;
}

/**
 * Mi legajo — RF-17: the staff member completes their data and uploads the required
 * documents; then the Owner approves it from Equipo. The file's server path is never sent
 * to the browser.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const [user, dossier, status] = await Promise.all([
    getCurrentUser(token),
    apiRequest<Dossier>(token, '/legajo/mi-legajo'),
    settle(apiRequest<{ completo: boolean; faltantes: string[] }>(token, '/legajo/mi-legajo/estado')),
  ]);
  const { DocumentoLegajo, ...data } = dossier;
  return json({
    rol: (user?.rol as string) ?? '',
    estadoLegajo: (user?.estadoLegajo as string | null) ?? null,
    data,
    documents: DocumentoLegajo.map(({ id, tipo, nombreArchivo, vencimiento, createdAt }) => ({ id, tipo, nombreArchivo, vencimiento, createdAt })),
    missing: status?.faltantes ?? [],
  });
}

type ActionData = { ok: boolean; intent: string; message: string };

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await unstable_parseMultipartFormData(
    request,
    unstable_createMemoryUploadHandler({ maxPartSize: MAX_DOCUMENT_BYTES }),
  ).catch(() => null);
  if (!form) return json<ActionData>({ ok: false, intent: 'upload', message: 'El archivo supera los 10 MB.' }, { status: 413 });
  const intent = String(form.get('intent'));
  try {
    if (intent === 'save') {
      const user = await getCurrentUser(token);
      const body: Record<string, string> = {};
      for (const field of dossierFieldsFor(String(user?.rol ?? ''))) {
        const value = String(form.get(field.name) ?? '').trim();
        if (value) body[field.name] = value;
      }
      await apiRequest(token, '/legajo/mi-legajo', { method: 'PATCH', body: JSON.stringify(body) });
      return json<ActionData>({ ok: true, intent, message: 'Datos guardados.' });
    }
    if (intent === 'upload') {
      const file = form.get('archivo');
      const tipo = String(form.get('tipo') ?? '');
      const vencimiento = String(form.get('vencimiento') ?? '');
      if (!(file instanceof File) || file.size === 0) return json<ActionData>({ ok: false, intent, message: 'Elegí el archivo.' }, { status: 400 });
      if (!DOCUMENT_TYPES.some((d) => d.value === tipo)) return json<ActionData>({ ok: false, intent, message: 'Elegí qué documento es.' }, { status: 400 });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimiento)) {
        return json<ActionData>({ ok: false, intent, message: 'Indicá hasta cuándo vale el documento.' }, { status: 400 });
      }
      const upload = new FormData();
      upload.append('tipo', tipo);
      upload.append('vencimiento', vencimiento);
      upload.append('archivo', file, file.name);
      await apiUpload(token, '/legajo/mi-legajo/documentos', upload);
      return json<ActionData>({ ok: true, intent, message: 'Documento subido.' });
    }
    return json<ActionData>({ ok: false, intent, message: 'Acción desconocida.' }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError) return json<ActionData>({ ok: false, intent, message: error.message }, { status: error.status });
    throw error;
  }
}

export default function MyDossier() {
  const { rol, estadoLegajo, data, documents, missing } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
  const fields = dossierFieldsFor(rol);
  const progress = dossierProgress(estadoLegajo, missing);
  const needsDocuments = rol !== 'OWNER';

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">TUS DATOS</p>
          <h1 className="ws-page__title">Mi legajo</h1>
          <p className="ws-page__lead">Lo que el negocio necesita de vos para que puedas operar. Solo lo ve el Owner.</p>
        </div>
        <span className={`ws-chip ws-chip--${progress.tone}`}>{progress.label}</span>
      </div>

      {result && <p className={result.ok ? 'ws-notice' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>{result.message}</p>}
      {progress.hint && <p className={missing.length ? 'ws-alert' : 'ws-notice'}>{progress.hint}</p>}

      <section className="ws-card" aria-labelledby="data-title">
        <h2 id="data-title" className="ws-card__title">Datos</h2>
        <Form method="post" encType="multipart/form-data" className="ws-pos__checkout">
          <input type="hidden" name="intent" value="save" />
          {fields.map((field) => (
            <label key={field.name} className="ws-field">
              <span className="ws-field__label">{field.label}</span>
              <span className="ws-field__control">
                <input name={field.name} defaultValue={data[field.name as keyof typeof data] ?? ''} inputMode={field.inputMode} autoComplete={field.autoComplete} />
              </span>
            </label>
          ))}
          <button className="ws-button ws-button--primary ws-button--auto" type="submit" disabled={busy}>Guardar datos</button>
        </Form>
      </section>

      {needsDocuments && (
        <section className="ws-card" aria-labelledby="docs-title">
          <h2 id="docs-title" className="ws-card__title">Documentos</h2>
          {documents.length > 0 && (
            <ul className="ws-payments">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <span>
                    <b>{DOCUMENT_TYPES.find((d) => d.value === doc.tipo)?.label ?? doc.tipo}</b>
                    <small>{doc.nombreArchivo} · vence {new Date(doc.vencimiento).toLocaleDateString('es-AR', { timeZone: 'UTC' })} · subido {formatDateTime(doc.createdAt)}</small>
                  </span>
                  <span className="ws-chip ws-chip--success">Subido</span>
                </li>
              ))}
            </ul>
          )}
          <Form method="post" encType="multipart/form-data" className="ws-pos__checkout">
            <input type="hidden" name="intent" value="upload" />
            <label className="ws-field">
              <span className="ws-field__label">Documento</span>
              <span className="ws-field__control">
                <select name="tipo" defaultValue={DOCUMENT_TYPES.find((d) => !documents.some((x) => x.tipo === d.value))?.value ?? DOCUMENT_TYPES[0].value}>
                  {DOCUMENT_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </span>
            </label>
            <label className="ws-field">
              <span className="ws-field__label">Vale hasta</span>
              <span className="ws-field__control">
                <input name="vencimiento" type="date" required />
              </span>
            </label>
            <label className="ws-field">
              <span className="ws-field__label">Archivo (PDF, JPG o PNG, hasta 10 MB)</span>
              <span className="ws-field__control">
                <input name="archivo" type="file" accept="application/pdf,image/jpeg,image/png" required />
              </span>
            </label>
            <button className="ws-button ws-button--outline ws-button--auto" type="submit" disabled={busy}>Subir documento</button>
          </Form>
        </section>
      )}
    </div>
  );
}

