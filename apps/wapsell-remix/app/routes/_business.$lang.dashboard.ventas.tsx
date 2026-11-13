import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useFetcher, useLoaderData, useParams } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { Minus, Plus, Search, Trash2 } from 'lucide-react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import { formatMoney, formatTime } from '~/utils/format';
import {
  COLLECTION_STATES,
  PAYMENT_METHODS,
  addLine,
  changeFor,
  parseNumber,
  parseSaleLines,
  paymentBody,
  paymentFrom,
  previewTotal,
  saleErrorMessage,
  saleNumber,
  startOfTodayBA,
  type PaymentMethod,
  type SaleLine,
  type SearchProduct,
} from '~/utils/sales';

export const meta: MetaFunction = () => [{ title: 'Ventas · Wapsell' }];

interface SaleRow {
  id: string;
  numeroFormateado: string | null;
  total: string;
  saldo: string;
  estadoCobro: string;
  createdAt: string;
  medios: string[];
  Cliente: { nombre: string } | null;
  Usuario: { nombre: string } | null;
}
interface Customer {
  id: string;
  nombre: string;
}
interface CashStatus {
  aperturaVigente: unknown | null;
}

/**
 * Ventas — counter sale (POS) on the existing /ventas API: find products, build the sale,
 * optional customer (loyalty discounts), total quoted by the API, and charge it in cash
 * (needs the cash register open; change is computed), transfer or QR. Below, today's sales.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q) {
    if (q.length < 2) return json({ kind: 'search' as const, results: [] as SearchProduct[] });
    const results = await settle(apiRequest<SearchProduct[]>(token, `/ventas/productos?search=${encodeURIComponent(q)}`));
    return json({ kind: 'search' as const, results: results ?? [] });
  }
  const today = await settle(
    apiRequest<{ data: SaleRow[] }>(token, `/ventas?desde=${encodeURIComponent(startOfTodayBA())}&pageSize=50`),
  );
  const [customers, cash] = await Promise.all([
    settle(apiRequest<Customer[]>(token, '/clientes')),
    settle(apiRequest<CashStatus>(token, '/caja/estado')),
  ]);
  return json({
    kind: 'page' as const,
    sales: today?.data ?? null,
    customers: customers ?? [],
    cashOpen: Boolean(cash?.aperturaVigente),
  });
}

type ActionData = { intent: string; ok: boolean; message?: string; total?: string };

export async function action({ request, params }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = String(form.get('intent'));
  const items = parseSaleLines(form.get('items'));
  const lines = (() => {
    try {
      return JSON.parse(String(form.get('items') ?? '[]')) as Array<{ productoId: string; nombre: string }>;
    } catch {
      return [];
    }
  })();
  if (!items) return json<ActionData>({ intent, ok: false, message: 'Agregá al menos un producto.' }, { status: 400 });
  const clienteId = String(form.get('clienteId') ?? '') || undefined;
  const body = { canal: 'presencial', items, ...(clienteId ? { clienteId } : {}) };

  try {
    if (intent === 'quote') {
      const quote = await apiRequest<{ total: string }>(token, '/ventas/cotizacion', { method: 'POST', body: JSON.stringify(body) });
      return json<ActionData>({ intent, ok: true, total: quote.total });
    }
    if (intent !== 'sell') return json<ActionData>({ intent, ok: false, message: 'Acción desconocida.' }, { status: 400 });

    const medio = String(form.get('medio') ?? '') as PaymentMethod;
    // Cash needs an open register; checked before the sale so stock is not taken for a sale
    // that then cannot be charged.
    if (medio === 'efectivo') {
      const cash = await apiRequest<CashStatus>(token, '/caja/estado');
      if (!cash.aperturaVigente) {
        return json<ActionData>({ intent, ok: false, message: saleErrorMessage('CAJA_CERRADA') }, { status: 409 });
      }
    }
    const quoted = await apiRequest<{ total: string }>(token, '/ventas/cotizacion', { method: 'POST', body: JSON.stringify(body) });
    const payment = paymentFrom(form, Number(quoted.total));
    if (!payment.ok) return json<ActionData>({ intent, ok: false, message: payment.message }, { status: 400 });

    const sale = await apiRequest<{ id: string; total: string }>(token, '/ventas', {
      method: 'POST',
      body: JSON.stringify({ ...body, idempotencyKey: String(form.get('idempotencyKey') ?? '') || undefined }),
    });
    const base = `/${params.lang ?? 'es'}/dashboard/ventas/${sale.id}`;
    try {
      // The sale's own total, in case prices changed between the quote and the sale.
      await apiRequest(token, `/ventas/${sale.id}/pagos`, {
        method: 'POST',
        body: JSON.stringify({ ...paymentBody(payment), monto: Number(sale.total) }),
      });
    } catch (error) {
      // The sale exists (stock taken): finish charging it from its page.
      const reason = error instanceof ApiError ? saleErrorMessage(error.message) : 'No pudimos registrar el pago.';
      return redirect(`${base}?pago=pendiente&motivo=${encodeURIComponent(reason)}`);
    }
    return redirect(`${base}?nueva=1`);
  } catch (error) {
    if (error instanceof ApiError) {
      return json<ActionData>({ intent, ok: false, message: saleErrorMessage(error.message, lines) }, { status: error.status });
    }
    throw error;
  }
}

export default function Ventas() {
  const data = useLoaderData<typeof loader>();
  const { lang = 'es' } = useParams();
  if (data.kind !== 'page') return null;
  if (!data.sales) {
    return (
      <div className="ws-page">
        <h1 className="ws-page__title">Ventas</h1>
        <p className="ws-alert" role="alert">No pudimos cargar las ventas. Puede que tu rol no tenga acceso.</p>
      </div>
    );
  }
  return (
    <div className="ws-page ws-page--wide">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">MOSTRADOR</p>
          <h1 className="ws-page__title">Ventas</h1>
          <p className="ws-page__lead">Cargá los productos, cobrá y listo: el stock se descuenta solo.</p>
        </div>
      </div>
      <div className="ws-pos">
        <NewSale customers={data.customers} cashOpen={data.cashOpen} lang={lang} />
        <TodaySales sales={data.sales} lang={lang} />
      </div>
    </div>
  );
}

function NewSale({ customers, cashOpen, lang }: Readonly<{ customers: Customer[]; cashOpen: boolean; lang: string }>) {
  const search = useFetcher<typeof loader>();
  const quote = useFetcher<ActionData>();
  const sell = useFetcher<ActionData>();
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [medio, setMedio] = useState<PaymentMethod>(cashOpen ? 'efectivo' : 'transferencia');
  const [received, setReceived] = useState('');
  // One key per sale on this screen: a retry after an error cannot create the sale twice,
  // and a successful sale leaves the screen (its detail page).
  const [idempotencyKey] = useState(() => globalThis.crypto?.randomUUID?.() ?? '');
  const items = JSON.stringify(lines.map(({ productoId, nombre, cantidad }) => ({ productoId, nombre, cantidad })));

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = window.setTimeout(() => search.load(`/${lang}/dashboard/ventas?q=${encodeURIComponent(query.trim())}`), 250);
    return () => window.clearTimeout(timer);
    // Only the typed text matters.
  }, [query, lang]);

  useEffect(() => {
    if (!lines.length) return;
    const timer = window.setTimeout(() => quote.submit({ intent: 'quote', items, clienteId }, { method: 'post' }), 300);
    return () => window.clearTimeout(timer);
    // Re-quote when the lines or the customer change.
  }, [items, clienteId]);

  const results = search.data?.kind === 'search' && query.trim().length >= 2 ? search.data.results : [];
  const total = lines.length && quote.data?.ok && quote.data.total ? Number(quote.data.total) : previewTotal(lines);
  const change = medio === 'efectivo' ? changeFor(total, parseNumber(received)) : null;
  const busy = sell.state !== 'idle';

  return (
    <section className="ws-card ws-pos__sale" aria-labelledby="sale-title">
      <h2 id="sale-title" className="ws-card__title">Nueva venta</h2>
      <label className="ws-field__control ws-pos__search">
        <Search size={16} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar producto por nombre o código"
          aria-label="Buscar producto"
          autoComplete="off"
        />
      </label>
      {results.length > 0 && (
        <ul className="ws-pos__results">
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => {
                  setLines((current) => addLine(current, product));
                  setQuery('');
                }}
                disabled={product.stockDisponible <= 0}
              >
                <span>
                  <b>{product.nombre}</b>
                  <small>{product.codigoInterno ?? ''} · Stock {product.stockDisponible}</small>
                </span>
                <span>{formatMoney(product.precioMinorista)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && search.state === 'idle' && results.length === 0 && (
        <p className="ws-meta">No encontramos productos con “{query.trim()}”.</p>
      )}

      {lines.length === 0 ? (
        <p className="ws-empty">Buscá un producto para empezar la venta.</p>
      ) : (
        <ul className="ws-pos__lines">
          {lines.map((line) => (
            <li key={line.productoId}>
              <span className="ws-pos__line-name">
                <b>{line.nombre}</b>
                <small>{formatMoney(line.precio)} c/u</small>
              </span>
              <span className="ws-pos__qty">
                <button type="button" aria-label={`Restar ${line.nombre}`} onClick={() => setLines((ls) => ls.map((l) => (l.productoId === line.productoId ? { ...l, cantidad: Math.max(1, l.cantidad - 1) } : l)))}>
                  <Minus size={14} aria-hidden="true" />
                </button>
                <span>{line.cantidad}</span>
                <button type="button" aria-label={`Sumar ${line.nombre}`} disabled={line.cantidad >= line.stock} onClick={() => setLines((ls) => ls.map((l) => (l.productoId === line.productoId ? { ...l, cantidad: l.cantidad + 1 } : l)))}>
                  <Plus size={14} aria-hidden="true" />
                </button>
              </span>
              <b className="ws-pos__line-total">{formatMoney(Number(line.precio) * line.cantidad)}</b>
              <button type="button" className="ws-icon-button" aria-label={`Quitar ${line.nombre}`} onClick={() => setLines((ls) => ls.filter((l) => l.productoId !== line.productoId))}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <sell.Form method="post" className="ws-pos__checkout">
        <input type="hidden" name="intent" value="sell" />
        <input type="hidden" name="items" value={items} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <label className="ws-field">
          <span className="ws-field__label">Cliente (opcional, aplica sus descuentos)</span>
          <span className="ws-field__control">
            <select name="clienteId" value={clienteId} onChange={(event) => setClienteId(event.target.value)}>
              <option value="">Consumidor final</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </span>
        </label>
        <fieldset className="ws-pos__methods">
          <legend>Cómo paga</legend>
          {PAYMENT_METHODS.map((m) => (
            <label key={m.value} className={`ws-chip ${medio === m.value ? 'ws-chip--secondary' : ''}`}>
              <input type="radio" name="medio" value={m.value} checked={medio === m.value} onChange={() => setMedio(m.value)} />
              {m.label}
            </label>
          ))}
        </fieldset>
        {medio === 'efectivo' && !cashOpen && (
          <p className="ws-alert">La caja está cerrada. <Link className="ws-link" to={`/${lang}/dashboard/caja`}>Abrila</Link> para cobrar en efectivo.</p>
        )}
        {medio === 'efectivo' ? (
          <label className="ws-field">
            <span className="ws-field__label">Paga con (opcional)</span>
            <span className="ws-field__control">
              <input name="recibido" inputMode="decimal" value={received} onChange={(event) => setReceived(event.target.value)} placeholder={formatMoney(total)} />
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
        <div className="ws-pos__total">
          <span>Total</span>
          <b>{formatMoney(total)}</b>
        </div>
        {sell.state === 'idle' && sell.data && !sell.data.ok && <p className="ws-alert" role="alert">{sell.data.message}</p>}
        {quote.state === 'idle' && quote.data && !quote.data.ok && <p className="ws-alert" role="alert">{quote.data.message}</p>}
        <button className="ws-button ws-button--primary" type="submit" disabled={busy || lines.length === 0 || (medio === 'efectivo' && !cashOpen)}>
          {busy ? 'Cobrando…' : `Cobrar ${formatMoney(total)}`}
        </button>
      </sell.Form>
    </section>
  );
}

function TodaySales({ sales, lang }: Readonly<{ sales: SaleRow[]; lang: string }>) {
  const collected = sales.reduce((sum, s) => sum + Number(s.total) - Number(s.saldo), 0);
  return (
    <section className="ws-card" aria-labelledby="today-title">
      <h2 id="today-title" className="ws-card__title">Hoy · {sales.length} {sales.length === 1 ? 'venta' : 'ventas'} · {formatMoney(collected)} cobrado</h2>
      {sales.length === 0 ? (
        <p className="ws-empty">Todavía no hay ventas hoy.</p>
      ) : (
        <table className="ws-table ws-table--sales">
          <thead>
            <tr>
              <th>Venta</th>
              <th>Hora</th>
              <th>Cliente</th>
              <th>Cobro</th>
              <th className="is-num">Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => {
              const state = COLLECTION_STATES[sale.estadoCobro] ?? { label: sale.estadoCobro, tone: 'muted' };
              return (
                <tr key={sale.id}>
                  <td><Link className="ws-link" to={`/${lang}/dashboard/ventas/${sale.id}`}>{saleNumber(sale)}</Link></td>
                  <td>{formatTime(sale.createdAt)}</td>
                  <td>{sale.Cliente?.nombre ?? 'Consumidor final'}</td>
                  <td><span className={`ws-chip ws-chip--${state.tone}`}>{state.label}</span></td>
                  <td className="is-num">{formatMoney(sale.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
