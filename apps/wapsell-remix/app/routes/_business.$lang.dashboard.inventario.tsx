import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useParams, useRouteLoaderData, useSearchParams } from '@remix-run/react';
import { AlertTriangle, CalendarClock, Search, Truck, X } from 'lucide-react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import { formatDateTime, parseArsNumber } from '~/utils/format';
import {
  ADJUSTMENT_REASONS,
  adjustmentFrom,
  expiryLabel,
  inventoryAbilities,
  type Alerts,
  type Batch,
  type StockMovement,
  type StockRow,
} from '~/utils/inventory';
import type { loader as businessLoader } from './_business';

export const meta: MetaFunction = () => [{ title: 'Inventario · Wapsell' }];

export const PAGE_SIZE = 200;

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const onlyLow = url.searchParams.get('bajo') === '1';
  const selectedId = url.searchParams.get('p');
  const params = new URLSearchParams();
  if (query) params.set('search', query);
  if (onlyLow) params.set('soloConStockBajo', 'true');

  const id = selectedId ? encodeURIComponent(selectedId) : '';
  const [stock, alerts, batches, movements] = await Promise.all([
    settle(apiRequest<StockRow[]>(token, `/inventario/stock${params.size ? `?${params}` : ''}`)),
    settle(apiRequest<Alerts>(token, '/inventario/alertas')),
    selectedId ? settle(apiRequest<Batch[]>(token, `/inventario/productos/${id}/lotes`)) : null,
    selectedId ? settle(apiRequest<StockMovement[]>(token, `/inventario/productos/${id}/movimientos`)) : null,
  ]);
  const selected =
    selectedId && (stock?.find((row) => row.productoId === selectedId) ??
      (await settle(apiRequest<StockRow[]>(token, `/inventario/stock`)))?.find((row) => row.productoId === selectedId));

  return json({
    available: stock !== null,
    rows: (stock ?? []).slice(0, PAGE_SIZE),
    total: stock?.length ?? 0,
    alerts,
    selected: selected || null,
    batches: batches ?? [],
    movements: movements ?? [],
  });
}

type ActionData = { ok: boolean; message: string };

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = form.get('intent');
  const fail = (message: string, status = 400) => json<ActionData>({ ok: false, message }, { status });
  try {
    if (intent === 'adjust') {
      const loteId = String(form.get('loteId') ?? '');
      if (!loteId) return fail('Elige el lote a ajustar.');
      const parsed = adjustmentFrom(form);
      if (!parsed.ok) return fail(parsed.message);
      await apiRequest(token, '/inventario/ajustes', {
        method: 'POST',
        body: JSON.stringify({ loteId, cantidad: parsed.cantidad, motivo: parsed.motivo }),
      });
      return json<ActionData>({ ok: true, message: 'Ajuste registrado.' });
    }
    if (intent === 'minimum') {
      const productId = String(form.get('productId') ?? '');
      const value = parseArsNumber(form.get('stockMinimo')) ?? Number.NaN;
      if (!(value >= 0)) return fail('El stock mínimo tiene que ser 0 o más.');
      await apiRequest(token, `/catalogo/productos/${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ stockMinimo: value }),
      });
      return json<ActionData>({ ok: true, message: value === 0 ? 'Alerta de stock bajo desactivada.' : `Te avisamos cuando quede ${value} o menos.` });
    }
    return fail('Acción desconocida.');
  } catch (error) {
    if (error instanceof ApiError) return fail(error.message, error.status);
    throw error;
  }
}

const qty = (value: number | string) => Number(value).toLocaleString('es-AR', { maximumFractionDigits: 3 });

/** Inventario: consolidated stock, alerts, and per-product batches, movements and adjustments. */
export default function InventoryPage() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const layout = useRouteLoaderData<typeof businessLoader>('routes/_business');
  const can = inventoryAbilities(layout?.user.rol ?? '');
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
  const { lang = 'es' } = useParams();
  const [searchParams] = useSearchParams();
  const base = `/${lang}/dashboard/inventario`;
  const hrefWith = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `${base}?${qs}` : base;
  };

  if (!data.available) {
    return (
      <div className="ws-page">
        <h1 className="ws-page__title">Inventario</h1>
        <p className="ws-alert" role="alert">No pudimos cargar el inventario. Puede que tu rol no tenga acceso.</p>
      </div>
    );
  }

  const onlyLow = searchParams.get('bajo') === '1';
  const alerts = data.alerts;
  const selected = data.selected;

  return (
    <div className="ws-page ws-page--wide">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">{layout?.user.empresaNombre.toUpperCase()}</p>
          <h1 className="ws-page__title">Inventario</h1>
          <p className="ws-page__lead">Stock por producto, sumando todos sus lotes. La mercadería entra desde Compras.</p>
        </div>
        {can.purchases && (
          <Link className="ws-button ws-button--outline ws-button--auto" to={`/${lang}/dashboard/compras?nueva=1`}>
            <Truck size={16} aria-hidden="true" /> Cargar compra
          </Link>
        )}
      </div>

      {result && <p className={result.ok ? 'ws-success-note' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>{result.message}</p>}

      {alerts && (
        <div className="ws-stats">
          <Link className="ws-stat" to={hrefWith({ bajo: '1', p: null })}>
            <span className="ws-stat__top">
              <span className="ws-stat__symbol ws-chip--warning"><AlertTriangle size={20} aria-hidden="true" /></span>
            </span>
            <span className="ws-stat__value">{alerts.stockBajo.length}</span>
            <span className="ws-stat__label">Productos con stock bajo</span>
            <span className="ws-stat__hint">Según el stock mínimo de cada producto</span>
          </Link>
          <div className="ws-stat">
            <span className="ws-stat__top">
              <span className="ws-stat__symbol ws-chip--primary"><CalendarClock size={20} aria-hidden="true" /></span>
            </span>
            <span className="ws-stat__value">{alerts.lotesPorVencer.length}</span>
            <span className="ws-stat__label">Lotes por vencer o vencidos</span>
            <span className="ws-stat__hint">Próximos {alerts.diasAnticipacion} días</span>
          </div>
        </div>
      )}

      {alerts && alerts.lotesPorVencer.length > 0 && (
        <section className="ws-card" aria-labelledby="expiring-title">
          <h2 id="expiring-title" className="ws-card__title">Lotes por vencer</h2>
          <div className="ws-list">
            {alerts.lotesPorVencer.map((batch) => {
              const expiry = expiryLabel(batch.vencimiento);
              return (
                <Link key={batch.loteId} className="ws-list__row" to={hrefWith({ p: batch.productoId })}>
                  <span className="ws-list__main">
                    <b>{batch.productoNombre}</b>
                    <span>Lote {batch.numeroLote} · {qty(batch.cantidad)} unidades</span>
                  </span>
                  <span className={`ws-chip ws-chip--${expiry.tone}`}>{expiry.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className={`ws-catalog ws-catalog--two${selected ? ' has-editor' : ''}`}>
        <section className="ws-card ws-catalog__list" aria-label="Stock">
          <div className="ws-catalog__toolbar">
            <Form method="get" className="ws-inbox__search" role="search">
              {onlyLow && <input type="hidden" name="bajo" value="1" />}
              <Search size={16} aria-hidden="true" />
              <input name="q" defaultValue={searchParams.get('q') ?? ''} placeholder="Buscar por nombre o código" aria-label="Buscar productos" />
            </Form>
            <div className="ws-tabs">
              <Link className={`ws-chip ${!onlyLow ? 'ws-chip--secondary' : ''}`} to={hrefWith({ bajo: null })}>Todos</Link>
              <Link className={`ws-chip ${onlyLow ? 'ws-chip--secondary' : ''}`} to={hrefWith({ bajo: '1' })}>Stock bajo</Link>
            </div>
          </div>
          {data.rows.length === 0 ? (
            <div className="ws-empty">
              <b>{onlyLow ? 'No hay productos con stock bajo.' : 'No hay productos activos.'}</b>
              {!onlyLow && 'Carga productos en Catálogo y su stock entrando una compra.'}
            </div>
          ) : (
            <div className="ws-table-wrap">
              <table className="ws-table ws-table--stock">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Código</th>
                    <th className="is-num">Stock</th>
                    <th className="is-num">Mínimo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.productoId} className={row.productoId === selected?.productoId ? 'is-selected' : undefined}>
                      <td>
                        <Link className="ws-catalog__name" to={hrefWith({ p: row.productoId })}>{row.nombre}</Link>
                      </td>
                      <td className="ws-catalog__code">{row.codigoInterno}</td>
                      <td className="is-num">{qty(row.stockTotal)}</td>
                      <td className="is-num">{row.stockMinimo > 0 ? qty(row.stockMinimo) : '—'}</td>
                      <td>
                        {row.stockBajo ? (
                          <span className="ws-chip ws-chip--warning">Stock bajo</span>
                        ) : row.stockTotal <= 0 ? (
                          <span className="ws-chip ws-chip--muted">Sin stock</span>
                        ) : (
                          <span className="ws-chip ws-chip--success">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.total > data.rows.length && <p className="ws-page__lead">Mostrando {data.rows.length} de {data.total}. Usa la búsqueda para encontrar el resto.</p>}
            </div>
          )}
        </section>

        {selected && (
          <aside className="ws-card ws-catalog__editor" aria-labelledby="stock-detail-title">
            <div className="ws-card__head">
              <h2 id="stock-detail-title" className="ws-card__title">{selected.nombre}</h2>
              <Link className="ws-icon-button" to={hrefWith({ p: null })} aria-label="Cerrar">
                <X size={18} aria-hidden="true" />
              </Link>
            </div>
            <p className="ws-meta">
              <span>{selected.codigoInterno}</span>
              <b>Stock total: {qty(selected.stockTotal)}</b>
            </p>

            <div className="ws-context__group">
              <span>LOTES</span>
              {data.batches.length === 0 ? (
                <p className="ws-page__lead">Sin lotes. El stock entra al recibir una compra.</p>
              ) : (
                <ul className="ws-batches">
                  {data.batches.map((batch) => {
                    const expiry = expiryLabel(batch.vencimiento);
                    return (
                      <li key={batch.id}>
                        <span>
                          <b>Lote {batch.numeroLote}</b>
                          <small>{expiry.label}</small>
                        </span>
                        <b>{qty(batch.cantidad)}</b>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {can.adjust && data.batches.length > 0 && (
              <details className="ws-catalog__add">
                <summary>Ajustar stock</summary>
                <Form method="post" className="ws-form" key={data.movements.length}>
                  <input type="hidden" name="intent" value="adjust" />
                  <label className="ws-field">
                    <span className="ws-field__label">Lote</span>
                    <span className="ws-field__control">
                      <select name="loteId" required>
                        {data.batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>Lote {batch.numeroLote} ({qty(batch.cantidad)})</option>
                        ))}
                      </select>
                    </span>
                  </label>
                  <div className="ws-catalog__pair">
                    <label className="ws-field">
                      <span className="ws-field__label">Movimiento</span>
                      <span className="ws-field__control">
                        <select name="direccion" defaultValue="salida">
                          <option value="salida">Restar</option>
                          <option value="entrada">Sumar</option>
                        </select>
                      </span>
                    </label>
                    <label className="ws-field">
                      <span className="ws-field__label">Cantidad</span>
                      <span className="ws-field__control"><input name="cantidad" inputMode="numeric" required /></span>
                    </label>
                  </div>
                  <label className="ws-field">
                    <span className="ws-field__label">Motivo</span>
                    <span className="ws-field__control">
                      <select name="motivo" defaultValue="Conteo físico">
                        {ADJUSTMENT_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
                      </select>
                    </span>
                  </label>
                  <label className="ws-field">
                    <span className="ws-field__label">Detalle (opcional; obligatorio si es "Otro")</span>
                    <span className="ws-field__control"><input name="detalle" maxLength={160} /></span>
                  </label>
                  <button className="ws-button ws-button--primary" disabled={busy}>Registrar ajuste</button>
                </Form>
              </details>
            )}

            {can.setMinimum && (
              <Form method="post" className="ws-form ws-form--inline" key={`min-${selected.stockMinimo}`}>
                <input type="hidden" name="intent" value="minimum" />
                <input type="hidden" name="productId" value={selected.productoId} />
                <label className="ws-field">
                  <span className="ws-field__label">Avisarme con stock mínimo de</span>
                  <span className="ws-field__control"><input name="stockMinimo" inputMode="decimal" defaultValue={String(selected.stockMinimo)} /></span>
                </label>
                <button className="ws-button ws-button--outline" disabled={busy}>Guardar</button>
              </Form>
            )}

            <div className="ws-context__group">
              <span>ÚLTIMOS MOVIMIENTOS</span>
              {data.movements.length === 0 ? (
                <p className="ws-page__lead">Todavía no hay movimientos.</p>
              ) : (
                <ul className="ws-batches">
                  {data.movements.map((movement) => (
                    <li key={movement.id}>
                      <span>
                        <b>{movement.motivo}</b>
                        <small>{formatDateTime(movement.createdAt)}{movement.loteVencidoAlMomento ? ' · lote vencido' : ''}</small>
                      </span>
                      <b className={movement.tipoMovimiento === 'Entrada' ? 'is-in' : 'is-out'}>
                        {movement.tipoMovimiento === 'Entrada' ? '+' : '−'}{qty(movement.cantidad)}
                      </b>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
