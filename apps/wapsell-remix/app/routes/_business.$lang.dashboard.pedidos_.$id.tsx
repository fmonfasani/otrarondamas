import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useParams } from '@remix-run/react';
import { ArrowLeft, Check, X } from 'lucide-react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest } from '~/services/api.server';
import { formatDateTime, formatMoney, orderState } from '~/utils/format';

export const meta: MetaFunction = () => [{ title: 'Pedido · Wapsell' }];

interface OrderDetail {
  id: string;
  estado: string;
  total: string;
  descuento: string;
  createdAt: string;
  canalOrigen: string;
  Cliente: { nombre: string; email?: string | null; telefono?: string | null };
  PedidoItem: { id: string; cantidad: string; precioUnitario: string; Producto?: { nombre: string } | null }[];
  Pago?: { id: string; monto: string; estado: string; medio: string; createdAt: string }[];
}

/** AS-IS Pago states, as the team reads them. */
const PAYMENT_STATES: Record<string, { label: string; tone: string }> = {
  APROBADO: { label: 'Aprobado', tone: 'success' },
  PENDIENTE: { label: 'Pendiente', tone: 'warning' },
  EN_PROCESO: { label: 'En proceso', tone: 'warning' },
  RECHAZADO: { label: 'Rechazado', tone: 'primary' },
  CANCELADO: { label: 'Cancelado', tone: 'muted' },
  REEMBOLSADO_PARCIAL: { label: 'Reembolso parcial', tone: 'muted' },
  REEMBOLSADO_TOTAL: { label: 'Reembolsado', tone: 'muted' },
};
const MEDIOS: Record<string, string> = { MERCADOPAGO: 'Mercado Pago' };

/** API rule (orders.service cancelOrder): these states can still be cancelled. */
const CANCELLABLE = new Set(['RECIBIDO', 'CONFIRMADO', 'ENTREGA_FALLIDA']);

export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  try {
    return json({ order: await apiRequest<OrderDetail>(token, `/pedidos/${encodeURIComponent(params.id ?? '')}`) });
  } catch (error) {
    if (error instanceof ApiError) throw new Response(error.message, { status: error.status });
    throw error;
  }
}

type ActionData = { ok: true; message: string } | { ok: false; message: string };

export async function action({ request, params }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const id = encodeURIComponent(params.id ?? '');
  const form = await request.formData();
  const intent = form.get('intent');
  try {
    if (intent === 'confirm') {
      await apiRequest(token, `/pedidos/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: 'CONFIRMADO' }),
      });
      return json<ActionData>({ ok: true, message: 'Pedido confirmado. El stock quedó reservado.' });
    }
    if (intent === 'cancel') {
      const motivo = String(form.get('motivo') ?? '').trim();
      await apiRequest(token, `/pedidos/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify(motivo ? { motivo } : {}),
      });
      return json<ActionData>({ ok: true, message: 'Pedido cancelado.' });
    }
    return json<ActionData>({ ok: false, message: 'Acción desconocida.' }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError) return json<ActionData>({ ok: false, message: error.message }, { status: error.status });
    throw error;
  }
}

/** Order detail (GET /pedidos/:id) with confirm (ORDER_CONFIRM) and cancel (ORDER_CANCEL). */
export default function OrderPage() {
  const { order } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const { lang = 'es' } = useParams();
  const busy = navigation.state === 'submitting';
  const state = orderState(order.estado);
  const payments = order.Pago ?? [];
  const paid = payments.filter((p) => p.estado === 'APROBADO').reduce((sum, p) => sum + Number(p.monto), 0);

  return (
    <div className="ws-page">
      <Link className="ws-back" to={`/${lang}/dashboard/pedidos`}>
        <ArrowLeft size={16} aria-hidden="true" /> Pedidos
      </Link>
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">PEDIDO · {order.canalOrigen.toUpperCase()}</p>
          <h1 className="ws-page__title">{order.Cliente.nombre}</h1>
          <p className="ws-page__lead">{formatDateTime(order.createdAt)}</p>
        </div>
        <span className={`ws-chip ws-chip--${state.tone}`}>{state.label}</span>
      </div>

      {result && (
        <p className={result.ok ? 'ws-success-note' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>
          {result.message}
        </p>
      )}

      <div className="ws-columns">
        <section className="ws-card" aria-labelledby="items-title">
          <h2 id="items-title" className="ws-card__title">Productos</h2>
          <table className="ws-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="is-num">Cant.</th>
                <th className="is-num">Precio</th>
                <th className="is-num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.PedidoItem.map((item) => (
                <tr key={item.id}>
                  <td>{item.Producto?.nombre ?? 'Producto'}</td>
                  <td className="is-num">{Number(item.cantidad)}</td>
                  <td className="is-num">{formatMoney(item.precioUnitario)}</td>
                  <td className="is-num">{formatMoney(Number(item.precioUnitario) * Number(item.cantidad))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {Number(order.descuento) > 0 && (
                <tr>
                  <td colSpan={3}>Descuento</td>
                  <td className="is-num">−{formatMoney(order.descuento)}</td>
                </tr>
              )}
              <tr>
                <th colSpan={3}>Total</th>
                <th className="is-num">{formatMoney(order.total)}</th>
              </tr>
            </tfoot>
          </table>
        </section>

        <aside className="ws-stack">
          <section className="ws-card" aria-labelledby="customer-title">
            <h2 id="customer-title" className="ws-card__title">Cliente</h2>
            <p className="ws-meta">
              <b>{order.Cliente.nombre}</b>
              {order.Cliente.email && <span>{order.Cliente.email}</span>}
              {order.Cliente.telefono && <span>{order.Cliente.telefono}</span>}
            </p>
          </section>

          <section className="ws-card" aria-labelledby="payments-title">
            <h2 id="payments-title" className="ws-card__title">Pagos</h2>
            {payments.length === 0 ? (
              <p className="ws-meta">Sin pagos online. El cliente puede pagar con Mercado Pago cuando confirmes el pedido.</p>
            ) : (
              <ul className="ws-payments">
                {payments.map((payment) => {
                  const ps = PAYMENT_STATES[payment.estado] ?? { label: payment.estado, tone: 'muted' };
                  return (
                    <li key={payment.id}>
                      <span>
                        <span>
                          <b>{formatMoney(payment.monto)}</b> · {MEDIOS[payment.medio] ?? payment.medio}
                        </span>
                        <small>{formatDateTime(payment.createdAt)}</small>
                      </span>
                      <span className={`ws-chip ws-chip--${ps.tone}`}>{ps.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {paid > 0 && (
              <p className="ws-meta">
                {paid >= Number(order.total) ? 'Pagado completo.' : `Pagado ${formatMoney(paid)} de ${formatMoney(order.total)}.`}
                {CANCELLABLE.has(order.estado) && ' Si lo cancelás, devolvé el dinero desde Mercado Pago: Wapsell no lo reembolsa solo.'}
              </p>
            )}
          </section>

          {(order.estado === 'RECIBIDO' || CANCELLABLE.has(order.estado)) && (
            <section className="ws-card" aria-labelledby="actions-title">
              <h2 id="actions-title" className="ws-card__title">Acciones</h2>
              {order.estado === 'RECIBIDO' && (
                <Form method="post">
                  <button className="ws-button ws-button--primary" name="intent" value="confirm" disabled={busy}>
                    <Check size={16} aria-hidden="true" /> Confirmar pedido
                  </button>
                </Form>
              )}
              {CANCELLABLE.has(order.estado) && (
                <Form method="post" className="ws-form">
                  <label className="ws-field">
                    <span className="ws-field__label">Motivo de cancelación (opcional)</span>
                    <span className="ws-field__control">
                      <input name="motivo" maxLength={500} placeholder="Ej.: el cliente ya no lo necesita" />
                    </span>
                  </label>
                  <button className="ws-button ws-button--outline" name="intent" value="cancel" disabled={busy}>
                    <X size={16} aria-hidden="true" /> Cancelar pedido
                  </button>
                </Form>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
