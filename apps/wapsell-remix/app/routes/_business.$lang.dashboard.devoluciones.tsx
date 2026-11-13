import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useParams, useSearchParams } from '@remix-run/react';
import { getCurrentUser, requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import { formatDateTime, formatMoney } from '~/utils/format';
import { RETURN_WINDOW_DAYS, canManageReturns, returnNumber, returnState, windowDaysFrom, type CustomerReturn } from '~/utils/returns';

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
  const [settings, user] = await Promise.all([
    settle(apiRequest<{ plazoDias: number }>(token, '/devoluciones/ajustes')),
    getCurrentUser(token),
  ]);
  const plazoDias = settings?.plazoDias ?? RETURN_WINDOW_DAYS;
  const manage = canManageReturns(String(user?.rol ?? ''));
  try {
    const data = await apiRequest<{ items: CustomerReturn[]; total: number }>(
      token,
      `/devoluciones?limit=100${estado ? `&estado=${encodeURIComponent(estado)}` : ''}`,
    );
    return json({ returns: data.items, error: null as string | null, plazoDias, manage });
  } catch (error) {
    if (error instanceof ApiError) return json({ returns: [] as CustomerReturn[], error: error.message, plazoDias, manage });
    throw error;
  }
}

/** OR-B4-035 rule 4 — Owner/Admin change the Business's return window. */
export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const days = windowDaysFrom((await request.formData()).get('plazoDias'));
  if (days === null) return json({ ok: false, message: 'El plazo tiene que ser de 1 a 365 días.' }, { status: 400 });
  try {
    await apiRequest(token, '/devoluciones/ajustes', { method: 'PUT', body: JSON.stringify({ plazoDias: days }) });
    return json({ ok: true, message: `Listo: se aceptan devoluciones hasta ${days} días después de la venta.` });
  } catch (error) {
    if (error instanceof ApiError) return json({ ok: false, message: error.message }, { status: error.status });
    throw error;
  }
}

export default function Devoluciones() {
  const { returns, error, plazoDias, manage } = useLoaderData<typeof loader>();
  const saved = useActionData<typeof action>();
  const navigation = useNavigation();
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
            Se registran desde la venta, hasta {plazoDias} días después. Cada una pasa por autorizar, recibir y reembolsar.
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
      {manage && (
        <details className="ws-return-close ws-return-settings">
          <summary>Plazo para devolver: {plazoDias} días</summary>
          <Form method="post" className="ws-return-search">
            <label className="ws-field">
              <span className="ws-field__label">Días después de la venta</span>
              <span className="ws-field__control">
                <input name="plazoDias" type="number" min={1} max={365} step={1} defaultValue={plazoDias} inputMode="numeric" />
              </span>
            </label>
            <button className="ws-button ws-button--outline ws-button--auto" type="submit" disabled={navigation.state !== 'idle'}>Guardar</button>
          </Form>
          <small className="ws-meta">Fuera de plazo solo el Owner o un administrador puede registrarla, con un motivo.</small>
        </details>
      )}
      {saved && <p className={saved.ok ? 'ws-notice' : 'ws-alert'} role={saved.ok ? 'status' : 'alert'}>{saved.message}</p>}
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
