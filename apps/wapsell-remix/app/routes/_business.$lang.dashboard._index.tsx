import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useParams, useRouteLoaderData } from '@remix-run/react';
import { AlertTriangle, ShoppingBag, Users, Wallet } from 'lucide-react';
import { requireAuth } from '~/services/auth.server';
import { apiRequest, settle } from '~/services/api.server';
import { formatDateTime, formatMoney, orderState } from '~/utils/format';
import type { loader as businessLoader } from './_business';

export const meta: MetaFunction = () => [{ title: 'Inicio · Wapsell' }];

interface Order {
  id: string;
  estado: string;
  total: string;
  createdAt: string;
  canalOrigen: string;
  Cliente?: { nombre: string } | null;
}
interface CashStatus {
  caja: { estado: 'ABIERTA' | 'CERRADA'; nombre: string };
  aperturaVigente: { montoInicial: string; fechaApertura: string } | null;
}
interface Alerts {
  stockBajo: unknown[];
  lotesPorVencer: unknown[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const [orders, cash, alerts, customers] = await Promise.all([
    settle(apiRequest<Order[]>(token, '/pedidos')),
    settle(apiRequest<CashStatus>(token, '/caja/estado')),
    settle(apiRequest<Alerts>(token, '/inventario/alertas')),
    settle(apiRequest<unknown[]>(token, '/clientes')),
  ]);
  return json({
    pendingOrders: orders?.filter((order) => order.estado === 'RECIBIDO').length ?? null,
    recentOrders: orders?.slice(0, 5) ?? null,
    cash,
    alertCount: alerts ? alerts.stockBajo.length + alerts.lotesPorVencer.length : null,
    customerCount: customers?.length ?? null,
  });
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Business panel home — real figures from the API; sections the role cannot read show "—". */
export default function DashboardHome() {
  const data = useLoaderData<typeof loader>();
  const layout = useRouteLoaderData<typeof businessLoader>('routes/_business');
  const { lang = 'es' } = useParams();
  const base = `/${lang}/dashboard`;
  const open = data.cash?.caja.estado === 'ABIERTA';
  const value = (n: number | null) => (n === null ? '—' : n);

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">{layout?.user.empresaNombre.toUpperCase()}</p>
          <h1 className="ws-page__title">Hola, {firstName(layout?.user.nombre ?? '')}.</h1>
          <p className="ws-page__lead">Esto es lo que necesita tu atención hoy.</p>
        </div>
      </div>

      <div className="ws-stats">
        <Link className="ws-stat" to={`${base}/pedidos?estado=RECIBIDO`}>
          <span className="ws-stat__top">
            <span className="ws-stat__symbol ws-chip--warning"><ShoppingBag size={20} aria-hidden="true" /></span>
          </span>
          <span className="ws-stat__value">{value(data.pendingOrders)}</span>
          <span className="ws-stat__label">Pedidos por confirmar</span>
        </Link>
        <div className="ws-stat">
          <span className="ws-stat__top">
            <span className={`ws-stat__symbol ${open ? 'ws-chip--success' : 'ws-chip--muted'}`}>
              <Wallet size={20} aria-hidden="true" />
            </span>
            {open && <span className="ws-chip ws-chip--success">Abierta</span>}
          </span>
          <span className="ws-stat__value">
            {data.cash ? (open ? formatMoney(data.cash.aperturaVigente?.montoInicial) : 'Cerrada') : '—'}
          </span>
          <span className="ws-stat__label">{data.cash?.caja.nombre ?? 'Caja'}</span>
          {open && data.cash?.aperturaVigente && (
            <span className="ws-stat__hint">
              Abierta desde {formatDateTime(data.cash.aperturaVigente.fechaApertura)}
            </span>
          )}
        </div>
        <div className="ws-stat">
          <span className="ws-stat__top">
            <span className="ws-stat__symbol ws-chip--primary"><AlertTriangle size={20} aria-hidden="true" /></span>
          </span>
          <span className="ws-stat__value">{value(data.alertCount)}</span>
          <span className="ws-stat__label">Alertas de stock</span>
          <span className="ws-stat__hint">Stock bajo y lotes por vencer</span>
        </div>
        <div className="ws-stat">
          <span className="ws-stat__top">
            <span className="ws-stat__symbol ws-chip--secondary"><Users size={20} aria-hidden="true" /></span>
          </span>
          <span className="ws-stat__value">{value(data.customerCount)}</span>
          <span className="ws-stat__label">Clientes</span>
        </div>
      </div>

      <section className="ws-card" aria-labelledby="recent-orders">
        <div className="ws-card__head">
          <h2 id="recent-orders" className="ws-card__title">Últimos pedidos</h2>
          <Link className="ws-link" to={`${base}/pedidos`}>Ver todos</Link>
        </div>
        {data.recentOrders === null ? (
          <p className="ws-alert">No pudimos cargar los pedidos.</p>
        ) : data.recentOrders.length === 0 ? (
          <div className="ws-empty">
            <b>Todavía no hay pedidos.</b>
            Cuando entre uno desde la tienda o un canal, lo vas a ver acá.
          </div>
        ) : (
          <div className="ws-list">
            {data.recentOrders.map((order) => {
              const state = orderState(order.estado);
              return (
                <Link key={order.id} className="ws-list__row" to={`${base}/pedidos/${order.id}`}>
                  <span className="ws-list__main">
                    <b>{order.Cliente?.nombre ?? 'Cliente'}</b>
                    <span>{formatDateTime(order.createdAt)} · {order.canalOrigen}</span>
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
