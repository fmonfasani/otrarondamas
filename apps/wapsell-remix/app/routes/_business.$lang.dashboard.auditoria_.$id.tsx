import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useParams } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest } from '~/services/api.server';
import { formatDateTime } from '~/utils/format';
import { fieldName, valueText, type AuditDetail } from '~/utils/audit';

export const meta: MetaFunction = () => [{ title: 'Movimiento · Auditoría · Wapsell' }];

/** One audit entry: who, when, and what changed field by field (OR-B4-041). */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  try {
    const entry = await apiRequest<AuditDetail>(
      token,
      `/auditoria/${encodeURIComponent(params.id ?? '')}`,
    );
    return json({ entry });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new Response('Movimiento no encontrado', { status: 404 });
    }
    throw error;
  }
}

export default function AuditEntry() {
  const { entry } = useLoaderData<typeof loader>();
  const { lang = 'es' } = useParams();
  const who = entry.persona ? `${entry.persona.nombre} (${entry.persona.email})` : 'Sistema';
  return (
    <div className="ws-page">
      <Link className="ws-link" to={`/${lang}/dashboard/auditoria`}>
        ← Auditoría
      </Link>
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">{entry.temaNombre.toUpperCase()}</p>
          <h1 className="ws-page__title">{entry.nombre}</h1>
          <p className="ws-page__lead">
            {who} · {formatDateTime(entry.fecha)}
          </p>
        </div>
      </div>
      <section className="ws-card ws-audit-detail">
        {(entry.sobre || entry.motivo || entry.autorizado) && (
          <dl className="ws-audit-facts">
            {entry.sobre && (
              <>
                <dt>Sobre</dt>
                <dd>{entry.sobre}</dd>
              </>
            )}
            {entry.motivo && (
              <>
                <dt>Motivo</dt>
                <dd>{entry.motivo}</dd>
              </>
            )}
            {entry.autorizado && (
              <>
                <dt>Autorización</dt>
                <dd>Con autorización registrada</dd>
              </>
            )}
          </dl>
        )}
        {entry.cambios.length === 0 ? (
          <p className="ws-meta">Este movimiento no guarda cambios dato por dato.</p>
        ) : (
          <table className="ws-table ws-table--audit-changes">
            <thead>
              <tr>
                <th>Dato</th>
                <th>Antes</th>
                <th>Después</th>
              </tr>
            </thead>
            <tbody>
              {entry.cambios.map((c) => (
                <tr key={c.campo}>
                  <td data-label="Dato">{fieldName(c.campo)}</td>
                  <td data-label="Antes">{valueText(c.campo, c.antes)}</td>
                  <td data-label="Después">
                    <b>{valueText(c.campo, c.despues)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
