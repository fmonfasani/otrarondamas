import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useLoaderData, useParams, useSearchParams } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest } from '~/services/api.server';
import { formatDateTime } from '~/utils/format';
import { auditQuery, hasFilters, type AuditList } from '~/utils/audit';

export const meta: MetaFunction = () => [{ title: 'Auditoría · Wapsell' }];

/**
 * Auditoría — who did what in the Business, and what changed (OR-B4-041). The Owner sees
 * everyone and can download it; everyone else sees only what they did.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const search = new URL(request.url).searchParams;
  const page = Math.max(1, Number(search.get('page')) || 1);
  try {
    const list = await apiRequest<AuditList>(
      token,
      `/auditoria?${auditQuery(search, { page: String(page) })}`,
    );
    return json({ list, error: null as string | null });
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      return json({ list: null, error: error.message });
    }
    throw error;
  }
}

export default function Auditoria() {
  const { list, error } = useLoaderData<typeof loader>();
  const { lang = 'es' } = useParams();
  const [search] = useSearchParams();
  const base = `/${lang}/dashboard/auditoria`;
  const pages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;
  const pageHref = (page: number) => `?${auditQuery(search, { page: String(page) })}`;
  return (
    <div className="ws-page ws-page--wide">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">CONTROL</p>
          <h1 className="ws-page__title">Auditoría</h1>
          <p className="ws-page__lead">
            {list?.todo
              ? 'Quién hizo qué en el negocio y qué cambió. Nada de esto se puede editar ni borrar.'
              : 'Lo que hiciste vos en el negocio y qué cambió. El Owner ve los movimientos de todo el equipo.'}
          </p>
        </div>
        {list?.todo && (
          <a
            className="ws-button ws-button--outline ws-button--auto"
            href={`${base}/exportar?${auditQuery(search)}`}
            download
          >
            Descargar CSV
          </a>
        )}
      </div>

      <Form method="get" className="ws-audit-filters" aria-label="Filtrar movimientos">
        <label className="ws-field">
          <span className="ws-field__label">Desde</span>
          <span className="ws-field__control">
            <input type="date" name="desde" defaultValue={search.get('desde') ?? ''} />
          </span>
        </label>
        <label className="ws-field">
          <span className="ws-field__label">Hasta</span>
          <span className="ws-field__control">
            <input type="date" name="hasta" defaultValue={search.get('hasta') ?? ''} />
          </span>
        </label>
        <label className="ws-field">
          <span className="ws-field__label">Tema</span>
          <span className="ws-field__control">
            <select name="tema" defaultValue={search.get('tema') ?? ''}>
              <option value="">Todos</option>
              {list?.temas.map((t) => (
                <option key={t.clave} value={t.clave}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </span>
        </label>
        {list?.todo && (
          <label className="ws-field">
            <span className="ws-field__label">Persona</span>
            <span className="ws-field__control">
              <select name="usuarioId" defaultValue={search.get('usuarioId') ?? ''}>
                <option value="">Todo el equipo</option>
                {list.personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </span>
          </label>
        )}
        <div className="ws-audit-filters__actions">
          <button className="ws-button ws-button--primary ws-button--auto" type="submit">
            Filtrar
          </button>
          {hasFilters(search) && (
            <Link className="ws-link" to=".">
              Limpiar
            </Link>
          )}
        </div>
      </Form>

      {error && (
        <p className="ws-alert" role="alert">
          {error}
        </p>
      )}
      {list?.items.length === 0 && (
        <div className="ws-empty">
          <b>No hay movimientos{hasFilters(search) ? ' con esos filtros' : ' todavía'}.</b> Acá van
          a aparecer las ventas, los cambios de precio, la caja, el equipo y más.
        </div>
      )}
      {list && list.items.length > 0 && (
        <section className="ws-card">
          <p className="ws-meta ws-audit-count">
            {list.total} {list.total === 1 ? 'movimiento' : 'movimientos'}
          </p>
          <table className="ws-table ws-table--audit">
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Quién</th>
                <th>Qué hizo</th>
                <th>Tema</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((it) => (
                <tr key={it.id}>
                  <td data-label="Cuándo">{formatDateTime(it.fecha)}</td>
                  <td data-label="Quién">{it.persona?.nombre ?? 'Sistema'}</td>
                  <td data-label="Qué hizo">
                    <Link className="ws-link" to={`${base}/${it.id}`}>
                      {it.nombre}
                    </Link>
                    {(it.sobre || it.motivo) && (
                      <small className="ws-team__email">
                        {[it.sobre, it.motivo].filter(Boolean).join(' · ')}
                      </small>
                    )}
                  </td>
                  <td data-label="Tema">
                    <span className="ws-chip">{it.temaNombre}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {list && pages > 1 && (
        <nav className="ws-audit-pager" aria-label="Páginas">
          {list.page > 1 && (
            <Link className="ws-link" to={pageHref(list.page - 1)}>
              Anterior
            </Link>
          )}
          <span className="ws-meta">
            Página {list.page} de {pages}
          </span>
          {list.page < pages && (
            <Link className="ws-link" to={pageHref(list.page + 1)}>
              Siguiente
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
