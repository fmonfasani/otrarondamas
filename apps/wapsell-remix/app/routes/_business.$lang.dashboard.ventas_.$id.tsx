import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useParams, useSearchParams } from '@remix-run/react';
import { useState } from 'react';
import { ArrowLeft, Printer, RotateCcw } from 'lucide-react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest } from '~/services/api.server';
import { formatDateTime, formatMoney } from '~/utils/format';
import { returnWindow } from '~/utils/returns';
import { COLLECTION_STATES, PAYMENT_METHODS, changeFor, parseNumber, paymentBody, paymentFrom, saleErrorMessage, saleNumber, type PaymentMethod } from '~/utils/sales';

export const meta: MetaFunction = () => [{ title: 'Venta · Wapsell' }];

interface SaleDetail {
  id: string;
  numeroFormateado: string | null;
  total: string;
  saldo: string;
  estadoCobro: string;
  createdAt: string;
  Cliente: { nombre: string } | null;
  Usuario: { nombre: string } | null;
  ventaItems: Array<{ id: string; nombre: string; codigoInterno: string | null; cantidad: string; precioUnitario: string; descuentoFidelizacionPorcentaje: string | null }>;
  Pago: Array<{ id: string; medio: string; monto: string; montoRecibido: string | null; vuelto: string | null; referencia: string | null; estado: string; createdAt: string }>;
}

const METHOD_LABELS: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));

export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  try {
    return json({ sale: await apiRequest<SaleDetail>(token, `/ventas/${encodeURIComponent(params.id ?? '')}`) });
  } catch (error) {
    if (error instanceof ApiError) throw new Response(error.message, { status: error.status });
    throw error;
  }
}

/** Charges what is left of the sale (a payment that failed when selling, or a partial one). */
export async function action({ request, params }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const id = encodeURIComponent(params.id ?? '');
  const form = await request.formData();
  try {
    const sale = await apiRequest<SaleDetail>(token, `/ventas/${id}`);
    const payment = paymentFrom(form, Number(sale.saldo));
    if (!payment.ok) return json({ ok: false, message: payment.message }, { status: 400 });
    await apiRequest(token, `/ventas/${id}/pagos`, { method: 'POST', body: JSON.stringify(paymentBody(payment)) });
    return json({ ok: true, message: 'Pago registrado.' });
  } catch (error) {
    if (error instanceof ApiError) return json({ ok: false, message: saleErrorMessage(error.message) }, { status: error.status });
    throw error;
  }
}

export default function SalePage() {
  const { sale } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const [params] = useSearchParams();
  const { lang = 'es' } = useParams();
  const [medio, setMedio] = useState<PaymentMethod>('efectivo');
  const [received, setReceived] = useState('');
  const state = COLLECTION_STATES[sale.estadoCobro] ?? { label: sale.estadoCobro, tone: 'muted' };
  const balance = Number(sale.saldo);
  const lastCash = [...sale.Pago].reverse().find((p) => p.vuelto !== null && Number(p.vuelto) > 0);
  const change = medio === 'efectivo' ? changeFor(balance, parseNumber(received)) : null;

  return (
    <div className="ws-page">
      <Link className="ws-back ws-no-print" to={`/${lang}/dashboard/ventas`}>
        <ArrowLeft size={16} aria-hidden="true" /> Ventas
      </Link>

      {params.get('nueva') === '1' && (
        <output className="ws-notice ws-no-print">
          Venta {saleNumber(sale)} registrada{lastCash ? `. Vuelto: ${formatMoney(lastCash.vuelto)}` : ''}.{' '}
          <Link className="ws-link" to={`/${lang}/dashboard/ventas`}>Nueva venta</Link>
        </output>
      )}
      {params.get('pago') === 'pendiente' && balance > 0 && (
        <p className="ws-alert ws-no-print" role="alert">
          La venta quedó registrada pero no pudimos cobrarla: {params.get('motivo') ?? 'error al registrar el pago'}. Cobrala abajo.
        </p>
      )}
      {result && <p className={`${result.ok ? 'ws-notice' : 'ws-alert'} ws-no-print`}>{result.message}</p>}

      <section className="ws-card ws-receipt" aria-labelledby="sale-title">
        <div className="ws-receipt__head">
          <div>
            <p className="ws-page__eyebrow">VENTA {saleNumber(sale)}</p>
            <h1 id="sale-title" className="ws-page__title">{sale.Cliente?.nombre ?? 'Consumidor final'}</h1>
            <p className="ws-meta">
              {formatDateTime(sale.createdAt)}
              {sale.Usuario ? ` · Atendió ${sale.Usuario.nombre}` : ''}
            </p>
          </div>
          <span className={`ws-chip ws-chip--${state.tone}`}>{state.label}</span>
        </div>
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
            {sale.ventaItems.map((item) => {
              const pct = item.descuentoFidelizacionPorcentaje ? Number(item.descuentoFidelizacionPorcentaje) : 0;
              const subtotal = Number(item.precioUnitario) * Number(item.cantidad) * (1 - pct / 100);
              return (
                <tr key={item.id}>
                  <td>
                    {item.nombre}
                    {pct > 0 && <small> · −{pct}% cliente</small>}
                  </td>
                  <td className="is-num">{Number(item.cantidad)}</td>
                  <td className="is-num">{formatMoney(item.precioUnitario)}</td>
                  <td className="is-num">{formatMoney(subtotal)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={3}>Total</th>
              <th className="is-num">{formatMoney(sale.total)}</th>
            </tr>
          </tfoot>
        </table>
        {sale.Pago.length > 0 && (
          <ul className="ws-payments">
            {sale.Pago.map((p) => (
              <li key={p.id}>
                <span>
                  <span>
                    <b>{formatMoney(p.monto)}</b> · {METHOD_LABELS[p.medio] ?? p.medio}
                  </span>
                  <small>
                    {p.montoRecibido ? `Entregó ${formatMoney(p.montoRecibido)} · vuelto ${formatMoney(p.vuelto)}` : (p.referencia ?? formatDateTime(p.createdAt))}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        )}
        {balance > 0 && <p className="ws-meta">Falta cobrar {formatMoney(balance)}.</p>}
      </section>

      <div className="ws-receipt__actions ws-no-print">
        <button type="button" className="ws-button ws-button--outline ws-button--auto" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> Imprimir comprobante
        </button>
        {returnWindow(sale.createdAt).open && (
          <Link className="ws-button ws-button--outline ws-button--auto" to={`/${lang}/dashboard/devoluciones/nueva?venta=${sale.id}`}>
            <RotateCcw size={16} aria-hidden="true" /> Registrar devolución
          </Link>
        )}
      </div>

      {balance > 0 && (
        <section className="ws-card ws-no-print" aria-labelledby="pay-title">
          <h2 id="pay-title" className="ws-card__title">Cobrar {formatMoney(balance)}</h2>
          <Form method="post" className="ws-pos__checkout">
            <fieldset className="ws-pos__methods">
              <legend>Cómo paga</legend>
              {PAYMENT_METHODS.map((m) => (
                <label key={m.value} className={`ws-chip ${medio === m.value ? 'ws-chip--secondary' : ''}`}>
                  <input type="radio" name="medio" value={m.value} checked={medio === m.value} onChange={() => setMedio(m.value)} />
                  {m.label}
                </label>
              ))}
            </fieldset>
            {medio === 'efectivo' ? (
              <label className="ws-field">
                <span className="ws-field__label">Paga con (opcional)</span>
                <span className="ws-field__control">
                  <input name="recibido" inputMode="decimal" value={received} onChange={(event) => setReceived(event.target.value)} />
                </span>
                {change !== null && <small className="ws-pos__change">Vuelto: <b>{formatMoney(change)}</b></small>}
              </label>
            ) : (
              <label className="ws-field">
                <span className="ws-field__label">Referencia (opcional)</span>
                <span className="ws-field__control">
                  <input name="referencia" placeholder="N.º de operación" />
                </span>
              </label>
            )}
            <button className="ws-button ws-button--primary" type="submit" disabled={navigation.state !== 'idle'}>
              Registrar pago
            </button>
          </Form>
        </section>
      )}
    </div>
  );
}
