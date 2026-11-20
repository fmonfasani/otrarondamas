import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useRouteLoaderData, useSearchParams } from '@remix-run/react';
import { ArrowLeft } from 'lucide-react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import { formatMoney } from '~/utils/format';
import {
  brandsOf,
  bulkItemsFrom,
  bulkMessage,
  bulkRuleFrom,
  catalogAbilities,
  type BulkPreview,
  type Hierarchy,
  type Product,
} from '~/utils/catalog';
import type { loader as businessLoader } from './_business';

export const meta: MetaFunction = () => [{ title: 'Actualizar precios · Wapsell' }];

type Supplier = { id: string; nombre: string };

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const params = new URL(request.url).searchParams;
  const parsed = bulkRuleFrom(params);
  const [hierarchy, products, suppliers, preview] = await Promise.all([
    settle(apiRequest<Hierarchy>(token, '/catalogo/jerarquia')),
    settle(apiRequest<Product[]>(token, '/catalogo/productos?activo=true')),
    settle(apiRequest<Supplier[]>(token, '/proveedores')),
    parsed?.ok
      ? apiRequest<BulkPreview>(token, '/catalogo/precios/vista-previa', { method: 'POST', body: JSON.stringify(parsed.rule) }).then(
          (value) => ({ ok: true as const, value }),
          (error: unknown) => ({ ok: false as const, message: error instanceof ApiError ? error.message : 'No pudimos calcular los precios.' }),
        )
      : null,
  ]);
  return json({
    categories: hierarchy?.familias ?? [],
    brands: brandsOf(products ?? []),
    suppliers: suppliers ?? [],
    invalid: parsed && !parsed.ok ? parsed.message : null,
    preview: preview?.ok ? preview.value : null,
    previewError: preview && !preview.ok ? preview.message : null,
  });
}

type ActionData = { ok: boolean; message: string };

/** Applies the rule to the products of the preview, with the prices the person saw. */
export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const fail = (message: string, status = 400) => json<ActionData>({ ok: false, message }, { status });
  const parsed = bulkRuleFrom(new URLSearchParams([...form.entries()].map(([k, v]) => [k, String(v)])));
  if (!parsed?.ok) return fail(parsed?.message ?? 'Elegí la regla antes de aplicar.');
  const items = bulkItemsFrom(form);
  if (items.length === 0) return fail('No hay precios para cambiar.');
  try {
    const result = await apiRequest<{ actualizados: number; regla: string }>(token, '/catalogo/precios/actualizacion', {
      method: 'POST',
      body: JSON.stringify({ ...parsed.rule, items }),
    });
    // Back to the rule without its value: the same percent again would apply on top of the new prices.
    const next = new URLSearchParams();
    for (const key of ['cat', 'marca', 'proveedor', 'modo', 'redondeo']) {
      const v = String(form.get(key) ?? '');
      if (v) next.set(key, v);
    }
    next.set('listo', String(result.actualizados));
    next.set('regla', result.regla);
    return redirect(`/panel/mercaderia/precios?${next.toString()}`);
  } catch (error) {
    if (error instanceof ApiError) return fail(error.message, error.status);
    throw error;
  }
}

/**
 * OR-B4-046 §4.3, stage C2 — update many prices at once, by category, brand or supplier: a percent
 * over the current price, or the cost plus a margin. First the person sees every change; nothing
 * changes until they apply it.
 */
export default function BulkPricesPage() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const layout = useRouteLoaderData<typeof businessLoader>('routes/_business');
  const can = catalogAbilities(layout?.user.rol ?? '');
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
  const [searchParams] = useSearchParams();
  const value = (key: string) => searchParams.get(key) ?? '';
  const mode = value('modo') === 'margen' ? 'margen' : 'porcentaje';
  const preview = data.preview;
  const changing = preview?.productos.filter((p) => p.cambia) ?? [];

  const head = (
    <div className="ws-page__head">
      <div className="ws-page__titles">
        <p className="ws-page__eyebrow">{layout?.user.empresaNombre.toUpperCase()}</p>
        <h1 className="ws-page__title">Actualizar precios</h1>
        <p className="ws-page__lead">
          Cambiá muchos precios de una vez: subilos o bajalos un porcentaje, o ponelos en el costo más tu ganancia. Primero ves
          cada cambio; nada cambia hasta que lo apliques.
        </p>
      </div>
      <Link className="ws-button ws-button--outline ws-button--auto" to="/panel/mercaderia">
        <ArrowLeft size={16} aria-hidden="true" /> Mercadería
      </Link>
    </div>
  );

  if (!can.changePrices) {
    return (
      <div className="ws-page ws-page--wide">
        {head}
        <p className="ws-alert" role="alert">Los precios los cambia el Owner o un Administrador.</p>
      </div>
    );
  }

  return (
    <div className="ws-page ws-page--wide">
      {head}

      {result && (
        <p className={result.ok ? 'ws-success-note' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>
          {result.message}
        </p>
      )}
      {!result && searchParams.has('listo') && (
        <p className="ws-success-note" role="status">
          {bulkMessage(Number(searchParams.get('listo')), value('regla'))}
        </p>
      )}

      <section className="ws-card" aria-labelledby="bulk-rule">
        <h2 id="bulk-rule" className="ws-card__title">Qué productos y cómo</h2>
        {/* Keyed by the address: after applying, the fields show the rule without its value. */}
        <Form method="get" className="ws-bulkprice" key={searchParams.toString()}>
          <div className="ws-bulkprice__which">
            <label className="ws-field">
              <span className="ws-field__label">Categoría</span>
              <span className="ws-field__control">
                <select name="cat" defaultValue={value('cat')}>
                  <option value="">Todas</option>
                  {data.categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </span>
            </label>
            <label className="ws-field">
              <span className="ws-field__label">Marca</span>
              <span className="ws-field__control">
                <select name="marca" defaultValue={value('marca')}>
                  <option value="">Todas</option>
                  {data.brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </span>
            </label>
            <label className="ws-field">
              <span className="ws-field__label">Proveedor</span>
              <span className="ws-field__control">
                <select name="proveedor" defaultValue={value('proveedor')}>
                  <option value="">Todos</option>
                  {data.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </span>
            </label>
          </div>
          <fieldset className="ws-bulkprice__how">
            <legend className="ws-field__label">Cómo</legend>
            <label className="ws-check">
              <input type="radio" name="modo" value="porcentaje" defaultChecked={mode === 'porcentaje'} />
              <span>
                <b>Subir o bajar un porcentaje</b>
                <small>Sobre el precio de hoy. Para bajar, escribí un número negativo (−5).</small>
              </span>
            </label>
            <label className="ws-check">
              <input type="radio" name="modo" value="margen" defaultChecked={mode === 'margen'} />
              <span>
                <b>Costo más ganancia</b>
                <small>El precio queda en el último costo más ese porcentaje de ganancia.</small>
              </span>
            </label>
          </fieldset>
          <div className="ws-bulkprice__which">
            <label className="ws-field">
              <span className="ws-field__label">Porcentaje</span>
              <span className="ws-field__control">
                <input name="valor" inputMode="decimal" required defaultValue={value('valor')} placeholder="10" />
                <span aria-hidden="true">%</span>
              </span>
            </label>
            <label className="ws-field">
              <span className="ws-field__label">Redondear a</span>
              <span className="ws-field__control">
                <select name="redondeo" defaultValue={value('redondeo') || '1'}>
                  <option value="1">$ 1</option>
                  <option value="10">$ 10</option>
                  <option value="100">$ 100</option>
                </select>
              </span>
            </label>
          </div>
          <button className="ws-button ws-button--primary ws-button--auto" disabled={busy}>Ver los cambios</button>
        </Form>
      </section>

      {(data.invalid || data.previewError) && (
        <p className="ws-alert" role="alert">{data.invalid ?? data.previewError}</p>
      )}

      {preview && (
        <section className="ws-card" aria-labelledby="bulk-preview">
          <h2 id="bulk-preview" className="ws-card__title">
            {preview.cambian === 0
              ? 'Ningún precio cambia con esta regla'
              : `${preview.cambian === 1 ? 'Cambia 1 precio' : `Cambian ${preview.cambian} precios`} (${preview.regla})`}
          </h2>
          {preview.productos.length === 0 ? (
            <div className="ws-empty"><b>No hay productos activos con esos filtros.</b></div>
          ) : (
            <Form method="post" className="ws-form">
              {(['cat', 'marca', 'proveedor', 'modo', 'valor', 'redondeo'] as const).map((key) => (
                <input key={key} type="hidden" name={key} value={value(key)} />
              ))}
              <div className="ws-table-wrap">
                <table className="ws-table ws-table--sheet ws-table--bulkprice">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className="is-num">Costo</th>
                      <th className="is-num">Precio de hoy</th>
                      <th className="is-num">Precio nuevo</th>
                      <th className="is-num">Ganancia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.productos.map((row) => {
                      const markup = row.precioNuevo !== null && row.costo > 0 ? Math.round(((row.precioNuevo - row.costo) / row.costo) * 100) : null;
                      return (
                        <tr key={row.productoId} className={row.cambia ? undefined : 'is-muted'}>
                          <td className="ws-sheet__wide">
                            <span className="ws-sheet__name">
                              <b>{row.nombre}</b>
                              <small>{[row.codigoInterno, row.marca].filter(Boolean).join(' · ')}</small>
                            </span>
                            {row.cambia && (
                              <>
                                <input type="hidden" name="productoId" value={row.productoId} />
                                <input type="hidden" name="precioActual" value={String(row.precioActual)} />
                              </>
                            )}
                          </td>
                          <td className="is-num" data-label="Costo">{formatMoney(row.costo)}</td>
                          <td className="is-num" data-label="Precio de hoy">{formatMoney(row.precioActual)}</td>
                          <td className="is-num" data-label="Precio nuevo">
                            {row.precioNuevo === null ? <span className="ws-sheet__none">Sin costo</span> : <b>{formatMoney(row.precioNuevo)}</b>}
                          </td>
                          <td className="is-num" data-label="Ganancia">
                            {markup === null ? '—' : <span className={markup < 0 ? 'ws-bulkprice__loss' : undefined}>{markup} %</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="ws-sheet__foot">
                <p className="ws-sheet__summary">
                  {changing.length === 0
                    ? 'Probá con otro porcentaje o con otros filtros.'
                    : `Se aplica a ${changing.length === 1 ? '1 producto' : `${changing.length} productos`}. Cada cambio queda en la auditoría.`}
                </p>
                <button className="ws-button ws-button--primary ws-button--auto" disabled={busy || changing.length === 0}>
                  Aplicar a {changing.length === 1 ? '1 producto' : `${changing.length} productos`}
                </button>
              </div>
            </Form>
          )}
        </section>
      )}
    </div>
  );
}
