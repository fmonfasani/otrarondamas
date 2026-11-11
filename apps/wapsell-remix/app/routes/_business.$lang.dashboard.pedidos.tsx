import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useParams, useSearchParams } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest } from '~/services/api.server';
import { formatDateTime, formatMoney, orderState } from '~/utils/format';

export const meta: MetaFunction = () => [{ title: 'Pedidos · Wapsell' }];

interface OrderRow {
  id: string;
  estado: string;
  total: string;
  createdAt: string;
  canalOrigen: string;
  Cliente?: { nombre: string; telefono?: string | null } | null;
  PedidoItem?: unknown[];
}

const FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'RECIBIDO', label: 'Por confirmar' },
  { value: 'CONFIRMADO', label: 'Confirmados' },
  { value: 'ENTREGADO', label: 'Entregados' },
  { value: 'CANCELADO', label: 'Cancelados' },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const estado = new URL(request.url).searchParams.get('estado') ?? '';
  const allowed = FILTERS.some((filter) => filter.value === estado);
  const query = allowed && estado ? `?estado=${estado}` : '';
  try {
    return json({ orders: await apiRequest<OrderRow[]>(token, `/pedidos${query}`), error: null });
  } catch (error) {
    if (error instanceof ApiError) return json({ orders: [] as OrderRow[], error: error.message });
    throw error;
  }
}

/** Orders list (GET /pedidos), filtered by state. */
export default function OrdersPage() {
  const { orders, error } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const { lang = 'es' } = useParams();
  const active = params.get('estado') ?? '';

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">VENTAS POR CANALES</p>
          <h1 className="ws-page__title">Pedidos</h1>
        </div>
      </div>

      <nav className="ws-tabs" aria-label="Filtrar por estado">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value || 'all'}
            to={filter.value ? `?estado=${filter.value}` : '.'}
            className={`ws-chip ${active === filter.value ? 'ws-chip--secondary' : 'ws-chip--muted'}`}
            aria-current={active === filter.value ? 'page' : undefined}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {error && <p className="ws-alert" role="alert">{error}</p>}

      <section className="ws-card">
        {orders.length === 0 ? (
          <div className="ws-empty">
            <b>No hay pedidos {active ? 'en este estado' : 'todavía'}.</b>
            Los pedidos de la tienda y de los canales aparecen acá.
          </div>
        ) : (
          <div className="ws-list">
            {orders.map((order) => {
              const state = orderState(order.estado);
              return (
                <Link key={order.id} className="ws-list__row" to={`/${lang}/dashboard/pedidos/${order.id}`}>
                  <span className="ws-list__main">
                    <b>{order.Cliente?.nombre ?? 'Cliente'}</b>
                    <span>
                      {formatDateTime(order.createdAt)} · {order.canalOrigen}
                      {order.PedidoItem ? ` · ${order.PedidoItem.length} producto${order.PedidoItem.length === 1 ? '' : 's'}` : ''}
                    </span>
                  </span>
                  <span className="ws-list__aside">
                    {formatMoney(order.total)}
                    <span className={`ws-chip ws-chip--${state.tone}`}>{state.label}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
