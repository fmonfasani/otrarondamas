import { useState } from 'react';
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useRouteLoaderData, useSearchParams } from '@remix-run/react';
import { Plus, Trash2, X } from 'lucide-react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import { formatDateTime, formatMoney, parseArsNumber } from '~/utils/format';
import type { Product } from '~/utils/catalog';
import {
  IVA_CONDITIONS,
  PURCHASE_STATES,
  formatCuit,
  inventoryAbilities,
  paymentTerms,
  supplierBody,
  suggestionItemsFrom,
  type SuggestionGroup,
  type SupplierProduct,
  pendingOf,
  purchaseItemsFrom,
  receiptItemsFrom,
  receptionMessage,
  suggestedBatchNumber,
  type Purchase,
  type Supplier,
} from '~/utils/inventory';
import type { loader as businessLoader } from './_business';

export const meta: MetaFunction = () => [{ title: 'Compras · Wapsell' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const url = new URL(request.url);
  const selectedId = url.searchParams.get('c');
  const composing = url.searchParams.get('nueva') === '1';
  const tab = url.searchParams.get('tab');
  // OR-B4-052 (stage D1): a supplier's record and the products it provides; the purchase suggestion.
  const supplierId = tab === 'proveedores' ? url.searchParams.get('p') : null;

  const [purchases, suppliers, selected, products, supplierProducts, suggestion] = await Promise.all([
    settle(apiRequest<Purchase[]>(token, '/compras')),
    settle(apiRequest<Supplier[]>(token, '/proveedores')),
    selectedId ? settle(apiRequest<Purchase>(token, `/compras/${encodeURIComponent(selectedId)}`)) : null,
    composing || selectedId || supplierId ? settle(apiRequest<Product[]>(token, '/catalogo/productos?activo=true')) : null,
    supplierId ? settle(apiRequest<SupplierProduct[]>(token, `/proveedores/${encodeURIComponent(supplierId)}/productos`)) : null,
    tab === 'sugerencia' ? settle(apiRequest<SuggestionGroup[]>(token, '/sugerencia-compra')) : null,
  ]);
  return json({
    available: purchases !== null && suppliers !== null,
    purchases: purchases ?? [],
    suppliers: suppliers ?? [],
    selected,
    selectedId,
    composing,
    supplierId,
    supplierProducts: supplierProducts ?? [],
    suggestion: suggestion ?? [],
    products: (products ?? []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      codigoInterno: p.codigoInterno,
      costo: p.costo,
      controlaVencimiento: p.controlaVencimiento,
    })),
  });
}

type ActionData = { ok: boolean; message: string };

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const base = `/panel/compras`;
  const fail = (message: string, status = 400) => json<ActionData>({ ok: false, message }, { status });
  const text = (key: string) => String(form.get(key) ?? '').trim();
  try {
    if (intent === 'createSupplier') {
      const parsed = supplierBody(form, false);
      if (!parsed.ok) return fail(parsed.message);
      await apiRequest(token, '/proveedores', { method: 'POST', body: JSON.stringify(parsed.body) });
      return json<ActionData>({ ok: true, message: `Proveedor "${parsed.body.nombre}" agregado.` });
    }
    // OR-B4-052 (stage D1): the supplier's data, the products it provides and the suggestion.
    if (intent === 'updateSupplier') {
      const parsed = supplierBody(form, true);
      if (!parsed.ok) return fail(parsed.message);
      await apiRequest(token, `/proveedores/${encodeURIComponent(text('proveedorId'))}`, { method: 'PATCH', body: JSON.stringify(parsed.body) });
      return json<ActionData>({ ok: true, message: 'Datos del proveedor guardados.' });
    }
    if (intent === 'saveSupplierProduct') {
      const productoId = text('productoId');
      if (!productoId) return fail('Elegí el producto.');
      const cost = parseArsNumber(text('costoUnitario'));
      const body: Record<string, string | number | boolean | null> = { codigoProveedor: text('codigoProveedor') || null };
      if (cost !== null) {
        if (!(cost >= 0)) return fail('El costo tiene que ser un número.');
        body.costoUnitario = cost;
      }
      if (form.get('habitual') === 'true') body.habitual = true;
      await apiRequest(token, `/proveedores/${encodeURIComponent(text('proveedorId'))}/productos/${encodeURIComponent(productoId)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      return json<ActionData>({ ok: true, message: 'Producto del proveedor guardado.' });
    }
    if (intent === 'removeSupplierProduct') {
      await apiRequest(token, `/proveedores/${encodeURIComponent(text('proveedorId'))}/productos/${encodeURIComponent(text('productoId'))}`, {
        method: 'DELETE',
      });
      return json<ActionData>({ ok: true, message: 'Producto quitado del proveedor.' });
    }
    if (intent === 'draftFromSuggestion') {
      const parsed = suggestionItemsFrom(form);
      if (!parsed.ok) return fail(parsed.message);
      const created = await apiRequest<Purchase>(token, '/sugerencia-compra/orden', {
        method: 'POST',
        body: JSON.stringify({ proveedorId: text('proveedorId'), items: parsed.items }),
      });
      return redirect(`${base}?c=${created.id}`);
    }
    if (intent === 'createPurchase') {
      const proveedorId = text('proveedorId');
      if (!proveedorId) return fail('Elige el proveedor.');
      const parsed = purchaseItemsFrom(form);
      if (!parsed.ok) return fail(parsed.message);
      const created = await apiRequest<Purchase>(token, '/compras', {
        method: 'POST',
        body: JSON.stringify({ proveedorId, items: parsed.items, ...(text('fechaRecepcionEsperada') ? { fechaRecepcionEsperada: text('fechaRecepcionEsperada') } : {}) }),
      });
      if (form.get('emitir') === '1') {
        await apiRequest(token, `/compras/${created.id}/emitir`, { method: 'POST' });
      }
      return redirect(`${base}?c=${created.id}`);
    }
    if (intent === 'issue') {
      await apiRequest(token, `/compras/${encodeURIComponent(text('compraId'))}/emitir`, { method: 'POST' });
      return json<ActionData>({ ok: true, message: 'Compra emitida. Cuando llegue la mercadería, regístrala acá.' });
    }
    if (intent === 'receive') {
      const parsed = receiptItemsFrom(form);
      if (!parsed.ok) return fail(parsed.message);
      const reception = await apiRequest<{ preciosARevisar?: number }>(token, `/compras/${encodeURIComponent(text('compraId'))}/recepciones`, {
        method: 'POST',
        body: JSON.stringify({ items: parsed.items, ...(text('observaciones') ? { observaciones: text('observaciones') } : {}) }),
      });
      return json<ActionData>({ ok: true, message: receptionMessage(reception?.preciosARevisar) });
    }
    return fail('Acción desconocida.');
  } catch (error) {
    if (error instanceof ApiError) return fail(error.message, error.status);
    throw error;
  }
}

/** Compras: suppliers, purchase orders (draft → issued) and goods receipt into stock. */
export default function PurchasesPage() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const layout = useRouteLoaderData<typeof businessLoader>('routes/_business');
  const can = inventoryAbilities(layout?.user.rol ?? '');
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
  const [searchParams] = useSearchParams();
  const base = `/panel/compras`;
  const tabParam = searchParams.get('tab');
  const tab = tabParam === 'proveedores' || tabParam === 'sugerencia' ? tabParam : 'compras';
  const supplier = data.suppliers.find((s) => s.id === data.supplierId) ?? null;
  const productName = (id: string) => data.products.find((p) => p.id === id)?.nombre ?? 'Producto';
  const controlsExpiry = (id: string) => Boolean(data.products.find((p) => p.id === id)?.controlaVencimiento);

  if (!data.available) {
    return (
      <div className="ws-page">
        <h1 className="ws-page__title">Compras</h1>
        <p className="ws-alert" role="alert">No pudimos cargar las compras. Puede que tu rol no tenga acceso.</p>
      </div>
    );
  }

  return (
    <div className="ws-page ws-page--wide">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">{layout?.user.empresaNombre.toUpperCase()}</p>
          <h1 className="ws-page__title">Compras</h1>
          <p className="ws-page__lead">Pedidos a proveedores y recepción de mercadería. Al recibir, el stock entra al inventario.</p>
        </div>
        {can.purchases && data.suppliers.length > 0 && (
          <Link className="ws-button ws-button--primary ws-button--auto" to={`${base}?nueva=1`}>
            <Plus size={16} aria-hidden="true" /> Nueva compra
          </Link>
        )}
      </div>

      {result && <p className={result.ok ? 'ws-success-note' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>{result.message}</p>}

      <div className="ws-tabs">
        <Link className={`ws-chip ${tab === 'compras' ? 'ws-chip--secondary' : ''}`} to={base}>Compras · {data.purchases.length}</Link>
        <Link className={`ws-chip ${tab === 'proveedores' ? 'ws-chip--secondary' : ''}`} to={`${base}?tab=proveedores`}>Proveedores · {data.suppliers.length}</Link>
        <Link className={`ws-chip ${tab === 'sugerencia' ? 'ws-chip--secondary' : ''}`} to={`${base}?tab=sugerencia`}>Sugerencia de compra</Link>
      </div>

      {tab === 'proveedores' || data.suppliers.length === 0 ? (
        <div className="ws-columns">
          <section className="ws-card" aria-labelledby="suppliers-title">
            <h2 id="suppliers-title" className="ws-card__title">Proveedores</h2>
            {data.suppliers.length === 0 ? (
              <div className="ws-empty"><b>Todavía no hay proveedores.</b>Agrega el primero para poder cargar compras.</div>
            ) : (
              <div className="ws-list">
                {data.suppliers.map((s) => (
                  <Link key={s.id} className={`ws-list__row${s.id === data.supplierId ? ' is-selected' : ''}`} to={`${base}?tab=proveedores&p=${s.id}`}>
                    <span className="ws-list__main">
                      <b>{s.nombre}</b>
                      <span>
                        {[formatCuit(s.cuit) ? `CUIT ${formatCuit(s.cuit)}` : null, paymentTerms(s.plazoPagoDias), s.telefono, s.email]
                          .filter(Boolean)
                          .join(' · ') || 'Sin datos de contacto'}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
          {supplier ? (
            <SupplierRecord
              supplier={supplier}
              products={data.supplierProducts}
              catalog={data.products}
              canEdit={can.purchases}
              busy={busy}
              close={`${base}?tab=proveedores`}
            />
          ) : can.purchases && (
            <section className="ws-card" aria-labelledby="new-supplier">
              <h2 id="new-supplier" className="ws-card__title">Agregar proveedor</h2>
              <Form method="post" className="ws-form" key={data.suppliers.length}>
                <input type="hidden" name="intent" value="createSupplier" />
                {[
                  ['nombre', 'Nombre', true],
                  ['telefono', 'Teléfono (opcional)', false],
                  ['email', 'Email (opcional)', false],
                  ['direccion', 'Dirección (opcional)', false],
                ].map(([name, label, required]) => (
                  <label key={String(name)} className="ws-field">
                    <span className="ws-field__label">{label}</span>
                    <span className="ws-field__control">
                      <input name={String(name)} required={Boolean(required)} type={name === 'email' ? 'email' : 'text'} />
                    </span>
                  </label>
                ))}
                <TaxFields />
                <button className="ws-button ws-button--primary" disabled={busy}>Agregar</button>
              </Form>
            </section>
          )}
        </div>
      ) : tab === 'sugerencia' ? (
        <Suggestion groups={data.suggestion} canEdit={can.purchases} busy={busy} />
      ) : data.composing && can.purchases ? (
        <NewPurchase suppliers={data.suppliers} products={data.products} busy={busy} close={base} />
      ) : (
        <div className={`ws-catalog ws-catalog--two${data.selected ? ' has-editor' : ''}`}>
          <section className="ws-card" aria-label="Compras">
            {data.purchases.length === 0 ? (
              <div className="ws-empty"><b>Todavía no hay compras.</b>Usa "Nueva compra" para pedir mercadería a un proveedor.</div>
            ) : (
              <div className="ws-table-wrap">
                <table className="ws-table">
                  <thead>
                    <tr>
                      <th>Proveedor</th>
                      <th>Fecha</th>
                      <th className="is-num">Total</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.purchases.map((purchase) => {
                      const state = PURCHASE_STATES[purchase.estado];
                      return (
                        <tr key={purchase.id} className={purchase.id === data.selectedId ? 'is-selected' : undefined}>
                          <td>
                            <Link className="ws-catalog__name" to={`${base}?c=${purchase.id}`}>{purchase.Proveedor.nombre}</Link>
                            <small className="ws-catalog__brand">{purchase.CompraItem.length} {purchase.CompraItem.length === 1 ? 'producto' : 'productos'}</small>
                          </td>
                          <td>{formatDateTime(purchase.fechaOrden)}</td>
                          <td className="is-num">{formatMoney(purchase.total)}</td>
                          <td><span className={`ws-chip ws-chip--${state.tone}`}>{state.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {data.selected && (
            <aside className="ws-card ws-catalog__editor ws-catalog__editor--wide" aria-labelledby="purchase-title">
              <div className="ws-card__head">
                <h2 id="purchase-title" className="ws-card__title">Compra a {data.selected.Proveedor.nombre}</h2>
                <Link className="ws-icon-button" to={base} aria-label="Cerrar"><X size={18} aria-hidden="true" /></Link>
              </div>
              <p className="ws-meta">
                <span>{formatDateTime(data.selected.fechaOrden)} · Total {formatMoney(data.selected.total)}</span>
                <b><span className={`ws-chip ws-chip--${PURCHASE_STATES[data.selected.estado].tone}`}>{PURCHASE_STATES[data.selected.estado].label}</span></b>
              </p>

              {data.selected.estado === 'BORRADOR' && (
                <>
                  <ItemsTable purchase={data.selected} productName={productName} />
                  {can.purchases && (
                    <Form method="post">
                      <input type="hidden" name="intent" value="issue" />
                      <input type="hidden" name="compraId" value={data.selected.id} />
                      <button className="ws-button ws-button--primary" disabled={busy}>Emitir compra</button>
                    </Form>
                  )}
                </>
              )}

              {(data.selected.estado === 'EMITIDA' || data.selected.estado === 'RECEPCION_PARCIAL') && (can.purchases ? (
                <Form method="post" className="ws-form" key={data.selected.RecepcionCompra?.length ?? 0}>
                  <input type="hidden" name="intent" value="receive" />
                  <input type="hidden" name="compraId" value={data.selected.id} />
                  <h3 className="ws-card__title">Recibir mercadería</h3>
                  <div className="ws-receipt">
                    {data.selected.CompraItem.map((item) => {
                      const pending = pendingOf(item);
                      return (
                        <fieldset key={item.id} className="ws-receipt__row" disabled={pending === 0}>
                          <legend>
                            <b>{productName(item.productoId)}</b>
                            <small>Pedido {Number(item.cantidadPedida)} · recibido {Number(item.cantidadRecibida)}</small>
                          </legend>
                          <input type="hidden" name="compraItemId" value={item.id} />
                          <input type="hidden" name="controlaVencimiento" value={controlsExpiry(item.productoId) ? '1' : '0'} />
                          <label className="ws-field">
                            <span className="ws-field__label">Llegaron</span>
                            <span className="ws-field__control"><input name="recibido" inputMode="decimal" defaultValue={pending ? String(pending) : '0'} /></span>
                          </label>
                          <label className="ws-field">
                            <span className="ws-field__label">Lote (opcional)</span>
                            <span className="ws-field__control"><input name="lote" defaultValue={suggestedBatchNumber(data.selected!)} /></span>
                          </label>
                          {controlsExpiry(item.productoId) ? (
                            <label className="ws-field">
                              <span className="ws-field__label">Vence</span>
                              <span className="ws-field__control"><input name="vencimiento" type="date" required /></span>
                            </label>
                          ) : (
                            // OR-B4-046 rule 9: no date for a product that does not control expiry.
                            <input type="hidden" name="vencimiento" value="" />
                          )}
                        </fieldset>
                      );
                    })}
                  </div>
                  <label className="ws-field">
                    <span className="ws-field__label">Observaciones (opcional)</span>
                    <span className="ws-field__control"><input name="observaciones" maxLength={200} /></span>
                  </label>
                  <button className="ws-button ws-button--primary" disabled={busy}>Registrar recepción</button>
                </Form>
              ) : (
                <ItemsTable purchase={data.selected} productName={productName} />
              ))}

              {data.selected.estado === 'RECIBIDA' && <ItemsTable purchase={data.selected} productName={productName} />}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

function ItemsTable({ purchase, productName }: { purchase: Purchase; productName: (id: string) => string }) {
  return (
    <table className="ws-table">
      <thead>
        <tr>
          <th>Producto</th>
          <th className="is-num">Pedido</th>
          <th className="is-num">Recibido</th>
          <th className="is-num">Costo</th>
        </tr>
      </thead>
      <tbody>
        {purchase.CompraItem.map((item) => (
          <tr key={item.id}>
            <td>{productName(item.productoId)}</td>
            <td className="is-num">{Number(item.cantidadPedida)}</td>
            <td className="is-num">{Number(item.cantidadRecibida)}</td>
            <td className="is-num">{formatMoney(item.costoUnitario)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NewPurchase({
  suppliers,
  products,
  busy,
  close,
}: {
  suppliers: Supplier[];
  products: Array<{ id: string; nombre: string; codigoInterno: string; costo: string }>;
  busy: boolean;
  close: string;
}) {
  const [rows, setRows] = useState([0]);
  const [nextKey, setNextKey] = useState(1);
  const costOf = (id: string) => {
    const cost = products.find((p) => p.id === id)?.costo;
    return cost ? String(Number(cost)).replace('.', ',') : '';
  };
  return (
    <section className="ws-card" aria-labelledby="new-purchase">
      <div className="ws-card__head">
        <h2 id="new-purchase" className="ws-card__title">Nueva compra</h2>
        <Link className="ws-icon-button" to={close} aria-label="Cancelar"><X size={18} aria-hidden="true" /></Link>
      </div>
      {products.length === 0 ? (
        <p className="ws-page__lead">Primero carga productos en Mercadería.</p>
      ) : (
        <Form method="post" className="ws-form">
          <input type="hidden" name="intent" value="createPurchase" />
          <div className="ws-catalog__pair">
            <label className="ws-field">
              <span className="ws-field__label">Proveedor</span>
              <span className="ws-field__control">
                <select name="proveedorId" required defaultValue="">
                  <option value="" disabled>Elige un proveedor</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </span>
            </label>
            <label className="ws-field">
              <span className="ws-field__label">Llega aprox. (opcional)</span>
              <span className="ws-field__control"><input name="fechaRecepcionEsperada" type="date" /></span>
            </label>
          </div>
          <div className="ws-purchase-rows">
            {rows.map((key, index) => (
              <div key={key} className="ws-purchase-row">
                <label className="ws-field">
                  <span className="ws-field__label">Producto {index + 1}</span>
                  <span className="ws-field__control">
                    <select
                      name="productoId"
                      defaultValue=""
                      onChange={(event) => {
                        const cost = event.currentTarget.closest('.ws-purchase-row')?.querySelector<HTMLInputElement>('input[name=costo]');
                        if (cost && !cost.value) cost.value = costOf(event.currentTarget.value);
                      }}
                    >
                      <option value="">Elige un producto</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.codigoInterno}</option>)}
                    </select>
                  </span>
                </label>
                <label className="ws-field">
                  <span className="ws-field__label">Cantidad</span>
                  <span className="ws-field__control"><input name="cantidad" inputMode="decimal" /></span>
                </label>
                <label className="ws-field">
                  <span className="ws-field__label">Costo unitario</span>
                  <span className="ws-field__control"><input name="costo" inputMode="decimal" /></span>
                </label>
                {rows.length > 1 && (
                  <button type="button" className="ws-icon-button" aria-label={`Quitar fila ${index + 1}`} onClick={() => setRows(rows.filter((k) => k !== key))}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="ws-button ws-button--outline ws-button--auto"
            onClick={() => {
              setRows([...rows, nextKey]);
              setNextKey(nextKey + 1);
            }}
          >
            <Plus size={16} aria-hidden="true" /> Agregar producto
          </button>
          <div className="ws-form--inline">
            <button className="ws-button ws-button--outline" name="emitir" value="0" disabled={busy}>Guardar borrador</button>
            <button className="ws-button ws-button--primary" name="emitir" value="1" disabled={busy}>Guardar y emitir</button>
          </div>
        </Form>
      )}
    </section>
  );
}

/** OR-B4-052: CUIT, VAT condition and payment terms, empty or with the supplier's values. */
function TaxFields({ supplier }: { supplier?: Supplier }) {
  return (
    <>
      <label className="ws-field">
        <span className="ws-field__label">CUIT (opcional)</span>
        <span className="ws-field__control"><input name="cuit" inputMode="numeric" placeholder="30-71234567-1" defaultValue={formatCuit(supplier?.cuit)} /></span>
      </label>
      <label className="ws-field">
        <span className="ws-field__label">Condición de IVA (opcional)</span>
        <span className="ws-field__control">
          <select name="condicionIva" defaultValue={supplier?.condicionIva ?? ''}>
            <option value="">Sin indicar</option>
            {IVA_CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </span>
      </label>
      <label className="ws-field">
        <span className="ws-field__label">Plazo de pago en días (opcional)</span>
        <span className="ws-field__control">
          <input name="plazoPagoDias" inputMode="numeric" placeholder="0 = contado" defaultValue={supplier?.plazoPagoDias ?? ''} />
        </span>
      </label>
    </>
  );
}

/** OR-B4-052: a supplier's data and the products it provides (code, last cost, usual supplier). */
function SupplierRecord({
  supplier,
  products,
  catalog,
  canEdit,
  busy,
  close,
}: {
  supplier: Supplier;
  products: SupplierProduct[];
  catalog: Array<{ id: string; nombre: string; codigoInterno: string }>;
  canEdit: boolean;
  busy: boolean;
  close: string;
}) {
  const linked = new Set(products.map((p) => p.productoId));
  return (
    <section className="ws-card ws-supplier" aria-labelledby="supplier-title">
      <div className="ws-card__head">
        <h2 id="supplier-title" className="ws-card__title">{supplier.nombre}</h2>
        <Link className="ws-icon-button" to={close} aria-label="Cerrar"><X size={18} aria-hidden="true" /></Link>
      </div>
      <Form method="post" className="ws-form" key={`${supplier.id}-${supplier.cuit ?? ''}-${supplier.plazoPagoDias ?? ''}`}>
        <input type="hidden" name="intent" value="updateSupplier" />
        <input type="hidden" name="proveedorId" value={supplier.id} />
        <fieldset disabled={!canEdit} className="ws-form ws-catalog__fields">
          {[
            ['nombre', 'Nombre', true, supplier.nombre],
            ['telefono', 'Teléfono (opcional)', false, supplier.telefono],
            ['email', 'Email (opcional)', false, supplier.email],
            ['direccion', 'Dirección (opcional)', false, supplier.direccion],
          ].map(([name, label, required, value]) => (
            <label key={String(name)} className="ws-field">
              <span className="ws-field__label">{label}</span>
              <span className="ws-field__control">
                <input name={String(name)} required={Boolean(required)} type={name === 'email' ? 'email' : 'text'} defaultValue={String(value ?? '')} />
              </span>
            </label>
          ))}
          <TaxFields supplier={supplier} />
          {canEdit && <button className="ws-button ws-button--primary ws-button--auto" disabled={busy}>Guardar datos</button>}
        </fieldset>
      </Form>

      <h3 className="ws-supplier__subtitle">Productos que provee</h3>
      {products.length === 0 ? (
        <p className="ws-meta">Todavía ninguno. Se agregan solos al recibir una compra, o a mano acá abajo.</p>
      ) : (
        <div className="ws-table-wrap">
          <table className="ws-table ws-table--sheet ws-table--supplier">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Su código</th>
                <th className="is-num">Último costo</th>
                <th>Última compra</th>
                <th>Habitual</th>
                {canEdit && <th aria-label="Acciones" />}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.productoId}>
                  <td className="ws-sheet__wide">
                    <span className="ws-sheet__name"><b>{p.nombre}</b><small>{p.codigoInterno}</small></span>
                  </td>
                  <td data-label="Su código">{p.codigoProveedor ?? '—'}</td>
                  <td className="is-num" data-label="Último costo">{p.costoUnitario === null ? '—' : formatMoney(p.costoUnitario)}</td>
                  <td data-label="Última compra">{p.ultimaCompra ? formatDateTime(p.ultimaCompra) : '—'}</td>
                  <td data-label="Habitual">
                    {p.habitual ? (
                      <span className="ws-chip ws-chip--success">Habitual</span>
                    ) : canEdit ? (
                      <Form method="post">
                        <input type="hidden" name="intent" value="saveSupplierProduct" />
                        <input type="hidden" name="proveedorId" value={supplier.id} />
                        <input type="hidden" name="productoId" value={p.productoId} />
                        <input type="hidden" name="codigoProveedor" value={p.codigoProveedor ?? ''} />
                        <input type="hidden" name="habitual" value="true" />
                        <button className="ws-button ws-button--outline ws-button--auto" disabled={busy}>Hacerlo habitual</button>
                      </Form>
                    ) : (
                      '—'
                    )}
                  </td>
                  {canEdit && (
                    <td className="ws-sheet__wide">
                      <Form method="post">
                        <input type="hidden" name="intent" value="removeSupplierProduct" />
                        <input type="hidden" name="proveedorId" value={supplier.id} />
                        <input type="hidden" name="productoId" value={p.productoId} />
                        <button className="ws-icon-button" aria-label={`Quitar ${p.nombre}`} disabled={busy}><Trash2 size={16} aria-hidden="true" /></button>
                      </Form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && (
        <Form method="post" className="ws-supplier__add" key={products.length}>
          <input type="hidden" name="intent" value="saveSupplierProduct" />
          <input type="hidden" name="proveedorId" value={supplier.id} />
          <label className="ws-field">
            <span className="ws-field__label">Agregar un producto</span>
            <span className="ws-field__control">
              <select name="productoId" required defaultValue="">
                <option value="" disabled>Elegí un producto</option>
                {catalog.filter((c) => !linked.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.codigoInterno}</option>)}
              </select>
            </span>
          </label>
          <label className="ws-field">
            <span className="ws-field__label">Su código (opcional)</span>
            <span className="ws-field__control"><input name="codigoProveedor" maxLength={60} /></span>
          </label>
          <label className="ws-field">
            <span className="ws-field__label">Costo (opcional)</span>
            <span className="ws-field__control"><input name="costoUnitario" inputMode="decimal" /></span>
          </label>
          <label className="ws-check">
            <input type="checkbox" name="habitual" value="true" />
            <span><b>Es su proveedor habitual</b></span>
          </label>
          <button className="ws-button ws-button--outline ws-button--auto" disabled={busy}>Agregar producto</button>
        </Form>
      )}
    </section>
  );
}

/** OR-B4-052: what is under its minimum stock, by usual supplier, ready to become a draft purchase. */
function Suggestion({ groups, canEdit, busy }: { groups: SuggestionGroup[]; canEdit: boolean; busy: boolean }) {
  if (groups.length === 0) {
    return (
      <section className="ws-card">
        <div className="ws-empty">
          <b>No hay productos debajo de su stock mínimo.</b>
          Definí el stock mínimo de cada producto en Inventario para recibir sugerencias.
        </div>
      </section>
    );
  }
  return (
    <>
      <p className="ws-page__lead">
        Los productos debajo de su stock mínimo, por su proveedor habitual. Sugerimos llevar cada uno al doble del mínimo; cambiá
        las cantidades (0 lo saca) y armá la orden.
      </p>
      {groups.map((group) => (
        <section key={group.proveedor?.id ?? 'none'} className="ws-card" aria-label={group.proveedor?.nombre ?? 'Sin proveedor habitual'}>
          <h2 className="ws-card__title">{group.proveedor?.nombre ?? 'Sin proveedor habitual'}</h2>
          <Form method="post" className="ws-form">
            <input type="hidden" name="intent" value="draftFromSuggestion" />
            {group.proveedor && <input type="hidden" name="proveedorId" value={group.proveedor.id} />}
            <div className="ws-table-wrap">
              <table className="ws-table ws-table--sheet">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="is-num">Disponible</th>
                    <th className="is-num">Mínimo</th>
                    <th className="is-num">Costo</th>
                    <th className="is-num">Pedir</th>
                  </tr>
                </thead>
                <tbody>
                  {group.productos.map((p) => (
                    <tr key={p.productoId}>
                      <td className="ws-sheet__wide">
                        <span className="ws-sheet__name">
                          <b>{p.nombre}</b>
                          <small>{[p.codigoInterno, p.codigoProveedor ? `su código ${p.codigoProveedor}` : null].filter(Boolean).join(' · ')}</small>
                        </span>
                        <input type="hidden" name="productoId" value={p.productoId} />
                      </td>
                      <td className="is-num" data-label="Disponible">{p.disponible}</td>
                      <td className="is-num" data-label="Mínimo">{p.stockMinimo}</td>
                      <td className="is-num" data-label="Costo">{p.costoUnitario === null ? '—' : formatMoney(p.costoUnitario)}</td>
                      <td className="is-num" data-label="Pedir">
                        <input className="ws-sheet-input" name="cantidad" inputMode="decimal" defaultValue={p.cantidadSugerida} aria-label={`Cantidad de ${p.nombre}`} disabled={!group.proveedor} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ws-sheet__foot">
              <p className="ws-sheet__summary">
                {group.proveedor
                  ? 'La orden queda en borrador, al último costo de este proveedor: revisala y emitila.'
                  : 'Estos productos no tienen proveedor habitual: marcalo en Proveedores para que aparezcan con él.'}
              </p>
              {canEdit && group.proveedor && (
                <button className="ws-button ws-button--primary ws-button--auto" disabled={busy}>Armar orden</button>
              )}
            </div>
          </Form>
        </section>
      ))}
    </>
  );
}
