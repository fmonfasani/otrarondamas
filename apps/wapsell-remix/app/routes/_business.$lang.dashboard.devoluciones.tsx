import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useParams, useSearchParams } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest } from '~/services/api.server';
import { formatDateTime, formatMoney } from '~/utils/format';
import { returnNumber, returnState, type CustomerReturn } from '~/utils/returns';

export const meta: MetaFunction = () => [{ title: 'Devoluciones · Wapsell' }];

const FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'SOLICITADA', label: 'Por autorizar' },
  { value: 'AUTORIZADA', label: 'Por recibir' },
  { value: 'RECIBIDA', label: 'Por reembolsar' },
  { value: 'PROCESADA', label: 'Cerradas' },
];

/**
 * Devoluciones — every customer return of the Business and the step it is in (OR-B4-034).
 * New returns start from the sale (Ventas → the sale → Registrar devolución).
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const estado = new URL(request.url).searchParams.get('estado') ?? '';
  try {
    const data = await apiRequest<{ items: CustomerReturn[]; total: number }>(
      token,
      `/devoluciones?limit=100${estado ? `&estado=${encodeURIComponent(estado)}` : ''}`,
    );
    return json({ returns: data.items, error: null as string | null });
  } catch (error) {
    if (error instanceof ApiError) return json({ returns: [] as CustomerReturn[], error: error.message });
    throw error;
  }
}

export default function Devoluciones() {
  const { returns, error } = useLoaderData<typeof loader>();
  const { lang = 'es' } = useParams();
  const [params] = useSearchParams();
  const current = params.get('estado') ?? '';
  return (
    <div className="ws-page ws-page--wide">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">POSVENTA</p>
          <h1 className="ws-page__title">Devoluciones</h1>
          <p className="ws-page__lead">
            Se registran desde la venta, hasta 10 días después. Cada una pasa por autorizar, recibir y reembolsar.
          </p>
        </div>
        <Link className="ws-button ws-button--outline ws-button--auto" to={`/${lang}/dashboard/ventas`}>
          Buscar la venta
        </Link>
      </div>
      <nav className="ws-inbox__filters" aria-label="Filtrar por estado">
        {FILTERS.map((f) => (
          <Link key={f.value} className={`ws-chip ${current === f.value ? 'ws-chip--secondary' : ''}`} to={f.value ? `?estado=${f.value}` : '.'}>
            {f.label}
          </Link>
        ))}
      </nav>
      {error && <p className="ws-alert" role="alert">{error}</p>}
      {!error && returns.length === 0 ? (
        <div className="ws-empty">
          <b>No hay devoluciones {current ? 'en este estado' : 'todavía'}.</b>
          Para registrar una, abrí la venta en Ventas y tocá «Registrar devolución».
        </div>
      ) : (
        <section className="ws-card">
          <table className="ws-table ws-table--returns">
            <thead>
              <tr>
                <th>Devolución</th>
                <th>Cliente</th>
                <th>Productos</th>
                <th>Estado</th>
                <th className="is-num">A devolver</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => {
                const state = returnState(r);
                return (
                  <tr key={r.id}>
                    <td>
                      <Link className="ws-link" to={`/${lang}/dashboard/devoluciones/${r.id}`}>{returnNumber(r)}</Link>
                      <small className="ws-team__email">{formatDateTime(r.fechaSolicitud)}</small>
                    </td>
                    <td>{r.cliente.nombre}</td>
                    <td>{r.items.map((i) => `${i.cantidad} × ${i.producto}`).join(', ')}</td>
                    <td><span className={`ws-chip ws-chip--${state.tone}`}>{state.label}</span></td>
                    <td className="is-num">{formatMoney(r.montoReembolsable)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
