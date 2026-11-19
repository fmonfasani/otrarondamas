import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useRouteLoaderData, useSearchParams } from '@remix-run/react';
import { Plus, Search, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCurrentUser, requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import { formatMoney } from '~/utils/format';
import {
  DESCRIPTION_MAX,
  UNITS,
  catalogAbilities,
  categoryLabel,
  categoryOptions,
  matchesFilters,
  productPayload,
  publishMessage,
  storeFilterOf,
  type Hierarchy,
  type Product,
} from '~/utils/catalog';
import type { loader as businessLoader } from './_business';

export const meta: MetaFunction = () => [{ title: 'Mercadería · Wapsell' }];

/** Products a single «publish many» request may carry (the API takes up to 500). */
const MAX_PICKED = 500;

/** Rows rendered at once; search narrows a large catalog (the API caps a search at 50). */
export const PAGE_SIZE = 200;

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const category = url.searchParams.get('cat');
  const status = url.searchParams.get('estado') ?? 'activos';
  const store = storeFilterOf(url.searchParams.get('tienda'));
  const selectedId = url.searchParams.get('p');

  const [products, hierarchy, selected] = await Promise.all([
    settle(apiRequest<Product[]>(token, `/catalogo/productos${query ? `?search=${encodeURIComponent(query)}` : ''}`)),
    settle(apiRequest<Hierarchy>(token, '/catalogo/jerarquia')),
    selectedId ? settle(apiRequest<Product>(token, `/catalogo/productos/${encodeURIComponent(selectedId)}`)) : null,
  ]);

  const filtered = (products ?? []).filter((p) => matchesFilters(p, { category, status, store }));
  const countByCategory: Record<string, number> = {};
  for (const product of products ?? []) countByCategory[product.familiaId] = (countByCategory[product.familiaId] ?? 0) + 1;
  // OR-B4-046: how much of the Mercadería the store shows.
  const active = (products ?? []).filter((p) => p.activo);
  const published = active.filter((p) => p.publicado).length;

  return json({
    available: products !== null && hierarchy !== null,
    hierarchy: hierarchy ?? { familias: [], subfamilias: [], tipos: [], subtipos: [] },
    products: filtered.slice(0, PAGE_SIZE),
    total: filtered.length,
    activeCount: active.length,
    published,
    countByCategory,
    selected,
    selectedId,
  });
}

type ActionData = { ok: boolean; message: string };

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const base = `/panel/mercaderia`;
  const fail = (message: string, status = 400) => json<ActionData>({ ok: false, message }, { status });

  try {
    if (intent === 'createCategory' || intent === 'createSubcategory') {
      const nombre = String(form.get('nombre') ?? '').trim();
      if (!nombre) return fail('Escribe un nombre.');
      const familiaId = String(form.get('familiaId') ?? '');
      const path =
        intent === 'createCategory'
          ? '/catalogo/jerarquia/categorias'
          : `/catalogo/jerarquia/categorias/${encodeURIComponent(familiaId)}/subcategorias`;
      await apiRequest(token, path, { method: 'POST', body: JSON.stringify({ nombre }) });
      return json<ActionData>({ ok: true, message: intent === 'createCategory' ? `Categoría "${nombre}" creada.` : `Subcategoría "${nombre}" creada.` });
    }

    if (intent === 'createProduct' || intent === 'updateProduct') {
      // The role comes from the API (/auth/me), never from the form.
      const me = await getCurrentUser(token);
      const abilities = catalogAbilities(me?.rol ?? '');
      const hierarchy = await apiRequest<Hierarchy>(token, '/catalogo/jerarquia');
      const productId = String(form.get('productId') ?? '');
      const current = intent === 'updateProduct' ? await apiRequest<Product>(token, `/catalogo/productos/${encodeURIComponent(productId)}`) : undefined;
      const fields = Object.fromEntries(form.entries());
      const built = productPayload(fields, hierarchy, {
        mode: intent === 'createProduct' ? 'create' : 'update',
        changePrices: abilities.changePrices,
        current,
      });
      if (!built.ok) return fail(built.message);
      const saved =
        intent === 'createProduct'
          ? await apiRequest<Product>(token, '/catalogo/productos', { method: 'POST', body: JSON.stringify(built.body) })
          : await apiRequest<Product>(token, `/catalogo/productos/${encodeURIComponent(productId)}`, {
              method: 'PATCH',
              body: JSON.stringify(built.body),
            });
      return redirect(`${base}?p=${saved.id}&guardado=1`);
    }

    if (intent === 'toggleActive') {
      const productId = String(form.get('productId') ?? '');
      const activo = form.get('activo') === 'true';
      await apiRequest(token, `/catalogo/productos/${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo }),
      });
      return json<ActionData>({
        ok: true,
        message: activo ? 'Producto activado.' : 'Producto desactivado. Ya no se ofrece para la venta ni en la tienda.',
      });
    }

    // OR-B4-046: publish or unpublish the products picked in the list, or a whole category.
    if (intent === 'publish') {
      const publicado = form.get('publicado') === 'true';
      const ids = form.getAll('id').map(String).filter(Boolean);
      const familiaId = String(form.get('familiaId') ?? '');
      if (!ids.length && !familiaId) return fail('Marcá al menos un producto.');
      if (ids.length > MAX_PICKED) return fail(`Se publican hasta ${MAX_PICKED} productos por vez.`);
      const result = await apiRequest<{ actualizados: number }>(token, '/catalogo/productos/publicacion', {
        method: 'POST',
        body: JSON.stringify(ids.length ? { ids, publicado } : { familiaId, publicado }),
      });
      return json<ActionData>({ ok: true, message: publishMessage(result.actualizados, publicado) });
    }
    return fail('Acción desconocida.');
  } catch (error) {
    if (error instanceof ApiError) return fail(error.message, error.status);
    throw error;
  }
}

/**
 * Mercadería (OR-B4-046): every product of the Business, with its categories (OR-B4-028),
 * search and filters, create/edit, and what the store shows (the Catálogo): published and
 * featured, one by one or many at once.
 */
export default function MercaderiaPage() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const layout = useRouteLoaderData<typeof businessLoader>('routes/_business');
  const role = layout?.user.rol ?? '';
  const can = catalogAbilities(role);
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
  const [searchParams] = useSearchParams();
  const base = `/panel/mercaderia`;
  const [picked, setPicked] = useState<string[]>([]);
  // A new answer (or another list) starts a new selection.
  useEffect(() => setPicked([]), [result, searchParams]);
  const hrefWith = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    next.delete('guardado');
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
        <h1 className="ws-page__title">Mercadería</h1>
        <p className="ws-alert" role="alert">No pudimos cargar la mercadería. Puede que tu rol no tenga acceso.</p>
      </div>
    );
  }

  const category = searchParams.get('cat');
  const status = searchParams.get('estado') ?? 'activos';
  const store = storeFilterOf(searchParams.get('tienda'));
  const creating = searchParams.get('nuevo') === '1';
  const editing = data.selected;
  const options = categoryOptions(data.hierarchy);
  const hasCategories = data.hierarchy.familias.length > 0;
  const saved = searchParams.get('guardado') === '1';
  const categoryName = category ? data.hierarchy.familias.find((f) => f.id === category)?.nombre ?? 'la categoría' : null;
  const pickable = can.editProducts ? data.products.filter((p) => p.activo || p.publicado).map((p) => p.id) : [];
  const allPicked = pickable.length > 0 && pickable.every((id) => picked.includes(id));
  const toggle = (id: string) => setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  return (
    <div className="ws-page ws-page--wide">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">{layout?.user.empresaNombre.toUpperCase()}</p>
          <h1 className="ws-page__title">Mercadería</h1>
          <p className="ws-page__lead">
            {data.total} {data.total === 1 ? 'producto' : 'productos'}
            {status === 'activos' ? ' activos' : status === 'inactivos' ? ' inactivos' : ''}
            {categoryName ? ` en ${categoryName}` : ''}. Tu tienda muestra {data.published} de {data.activeCount}{' '}
            {data.activeCount === 1 ? 'producto activo' : 'productos activos'}.
          </p>
        </div>
        {can.createProducts && hasCategories && (
          <Link className="ws-button ws-button--primary ws-button--auto" to={hrefWith({ nuevo: '1', p: null })}>
            <Plus size={16} aria-hidden="true" /> Nuevo producto
          </Link>
        )}
      </div>

      {result && <p className={result.ok ? 'ws-success-note' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>{result.message}</p>}
      {saved && !result && <p className="ws-success-note" role="status">Producto guardado.</p>}

      {hasCategories && data.activeCount > 0 && data.published === 0 && can.editProducts && (
        <section className="ws-card" aria-labelledby="empty-store">
          <h2 id="empty-store" className="ws-card__title">Tu tienda todavía no muestra productos</h2>
          <p className="ws-page__lead">
            Marcá en la lista los productos que querés vender online y tocá «Publicar en la tienda». El resto lo seguís vendiendo
            en el mostrador y por el chat.
          </p>
        </section>
      )}

      {!hasCategories ? (
        <section className="ws-card" aria-labelledby="first-category">
          <h2 id="first-category" className="ws-card__title">Empecemos por las categorías</h2>
          <p className="ws-page__lead">
            Cada producto va en una categoría (por ejemplo Bebidas, Almacén, Limpieza). Crea la primera y después cargas los productos.
          </p>
          {can.manageCategories ? (
            <CategoryForm intent="createCategory" label="Nombre de la categoría" busy={busy} />
          ) : (
            <p className="ws-page__lead">Pídele a quien administra el negocio que cree las categorías.</p>
          )}
        </section>
      ) : (
        <div className="ws-catalog">
          <aside className="ws-card ws-catalog__categories" aria-labelledby="categories-title">
            <h2 id="categories-title" className="ws-card__title">Categorías</h2>
            <nav className="ws-catalog__cats">
              <Link className={`ws-catalog__cat${!category ? ' is-active' : ''}`} to={hrefWith({ cat: null })}>
                Todas
              </Link>
              {data.hierarchy.familias.map((familia) => (
                <Link key={familia.id} className={`ws-catalog__cat${category === familia.id ? ' is-active' : ''}`} to={hrefWith({ cat: familia.id })}>
                  <span>{familia.nombre}</span>
                  <small>{data.countByCategory[familia.id] ?? 0}</small>
                </Link>
              ))}
            </nav>
            {category && (
              <ul className="ws-catalog__subs">
                {data.hierarchy.subfamilias
                  .filter((s) => s.familiaId === category && s.prefijo !== 'GEN')
                  .map((s) => (
                    <li key={s.id}>{s.nombre}</li>
                  ))}
              </ul>
            )}
            {can.manageCategories && (
              <details className="ws-catalog__add">
                <summary>{category ? 'Agregar subcategoría' : 'Agregar categoría'}</summary>
                {category ? (
                  <CategoryForm intent="createSubcategory" familiaId={category} label="Nombre de la subcategoría" busy={busy} />
                ) : (
                  <CategoryForm intent="createCategory" label="Nombre de la categoría" busy={busy} />
                )}
              </details>
            )}
          </aside>

          <section className="ws-card ws-catalog__list" aria-label="Productos">
            <div className="ws-catalog__toolbar">
              <Form method="get" className="ws-inbox__search" role="search">
                {category && <input type="hidden" name="cat" value={category} />}
                {status !== 'activos' && <input type="hidden" name="estado" value={status} />}
                <Search size={16} aria-hidden="true" />
                <input name="q" defaultValue={searchParams.get('q') ?? ''} placeholder="Buscar por nombre o código" aria-label="Buscar productos" />
              </Form>
              <div className="ws-tabs">
                {[
                  ['activos', 'Activos'],
                  ['inactivos', 'Inactivos'],
                  ['todos', 'Todos'],
                ].map(([value, label]) => (
                  <Link key={value} className={`ws-chip ${status === value ? 'ws-chip--secondary' : ''}`} to={hrefWith({ estado: value === 'activos' ? null : value })}>
                    {label}
                  </Link>
                ))}
              </div>
              <div className="ws-tabs" aria-label="En la tienda">
                {(
                  [
                    [null, 'Con y sin tienda'],
                    ['publicados', 'En la tienda'],
                    ['sin-publicar', 'Sin publicar'],
                  ] as const
                ).map(([value, label]) => (
                  <Link key={label} className={`ws-chip ${store === value ? 'ws-chip--secondary' : ''}`} to={hrefWith({ tienda: value })}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            {can.editProducts && data.products.length > 0 && (
              <div className="ws-bulkbar">
                <Form method="post" id="bulk-publish" className="ws-bulkbar__group">
                  <input type="hidden" name="intent" value="publish" />
                  <span className="ws-bulkbar__count" aria-live="polite">
                    {picked.length ? `${picked.length} ${picked.length === 1 ? 'marcado' : 'marcados'}` : 'Marcá productos para publicarlos'}
                  </span>
                  <button className="ws-button ws-button--primary ws-button--auto" name="publicado" value="true" disabled={busy || picked.length === 0}>
                    Publicar en la tienda
                  </button>
                  <button className="ws-button ws-button--outline ws-button--auto" name="publicado" value="false" disabled={busy || picked.length === 0}>
                    Sacar de la tienda
                  </button>
                </Form>
                {category && (
                  <Form method="post" className="ws-bulkbar__group">
                    <input type="hidden" name="intent" value="publish" />
                    <input type="hidden" name="familiaId" value={category} />
                    <span className="ws-bulkbar__count">Toda la categoría {categoryName}:</span>
                    <button className="ws-button ws-button--outline ws-button--auto" name="publicado" value="true" disabled={busy}>
                      Publicar
                    </button>
                    <button className="ws-button ws-button--outline ws-button--auto" name="publicado" value="false" disabled={busy}>
                      Sacar
                    </button>
                  </Form>
                )}
              </div>
            )}
            {data.products.length === 0 ? (
              <div className="ws-empty">
                <b>{searchParams.get('q') ? 'Nada coincide con la búsqueda.' : 'Todavía no hay productos acá.'}</b>
                {can.createProducts && !searchParams.get('q') && 'Usa "Nuevo producto" para cargar el primero.'}
              </div>
            ) : (
              <div className="ws-table-wrap">
                <table className={`ws-table ws-table--catalog${can.editProducts ? ' has-pick' : ''}`}>
                  <thead>
                    <tr>
                      {can.editProducts && (
                        <th className="ws-table__pick">
                          <input
                            type="checkbox"
                            aria-label="Marcar todos los productos de la lista"
                            checked={allPicked}
                            disabled={pickable.length === 0}
                            onChange={() => setPicked(allPicked ? [] : pickable.slice(0, MAX_PICKED))}
                          />
                        </th>
                      )}
                      <th>Producto</th>
                      <th>Código</th>
                      <th>Categoría</th>
                      <th className="is-num">Precio</th>
                      <th>Tienda</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.map((product) => (
                      <tr key={product.id} className={product.id === data.selectedId ? 'is-selected' : undefined}>
                        {can.editProducts && (
                          <td className="ws-table__pick">
                            <input
                              type="checkbox"
                              name="id"
                              value={product.id}
                              form="bulk-publish"
                              aria-label={`Marcar ${product.nombre}`}
                              checked={picked.includes(product.id)}
                              disabled={!product.activo && !product.publicado}
                              onChange={() => toggle(product.id)}
                            />
                          </td>
                        )}
                        <td>
                          <Link className="ws-catalog__name" to={hrefWith({ p: product.id, nuevo: null })}>
                            {product.nombre}
                          </Link>
                          {product.marca && <small className="ws-catalog__brand">{product.marca}</small>}
                        </td>
                        <td className="ws-catalog__code">{product.codigoInterno}</td>
                        <td>{categoryLabel(data.hierarchy, product)}</td>
                        <td className="is-num">{formatMoney(product.precioMinorista)}</td>
                        <td>
                          <StoreChip product={product} />
                        </td>
                        <td>
                          <span className={`ws-chip ${product.activo ? 'ws-chip--success' : 'ws-chip--muted'}`}>{product.activo ? 'Activo' : 'Inactivo'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.total > data.products.length && (
                  <p className="ws-page__lead">Mostrando {data.products.length} de {data.total}. Usa la búsqueda para encontrar el resto.</p>
                )}
              </div>
            )}
          </section>

          {(creating || editing) && (
            <aside className="ws-card ws-catalog__editor" aria-labelledby="editor-title">
              <div className="ws-card__head">
                <h2 id="editor-title" className="ws-card__title">{creating ? 'Nuevo producto' : 'Editar producto'}</h2>
                <Link className="ws-icon-button" to={hrefWith({ nuevo: null, p: null })} aria-label="Cerrar">
                  <X size={18} aria-hidden="true" />
                </Link>
              </div>
              <ProductForm
                key={creating ? 'new' : editing?.id}
                product={creating ? null : editing}
                options={options}
                busy={busy}
                canEdit={creating ? can.createProducts : can.editProducts}
                canPrice={can.changePrices}
                defaultSubfamilia={category ? options.find((o) => o.familia.id === category)?.subcategories[0]?.id : undefined}
              />
              {!creating && editing && can.editProducts && (
                <Form method="post">
                  <input type="hidden" name="intent" value="toggleActive" />
                  <input type="hidden" name="productId" value={editing.id} />
                  <input type="hidden" name="activo" value={String(!editing.activo)} />
                  <button className="ws-button ws-button--outline" disabled={busy}>
                    {editing.activo ? 'Desactivar producto' : 'Activar producto'}
                  </button>
                </Form>
              )}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

/** Where the product stands in the store: published (and featured) or not. */
function StoreChip({ product }: { product: Product }) {
  if (!product.activo) return <span className="ws-meta">—</span>;
  if (!product.publicado) return <span className="ws-chip ws-chip--muted">Sin publicar</span>;
  return (
    <span className="ws-chip ws-chip--success">
      {product.destacado && <Star size={12} aria-hidden="true" />} {product.destacado ? 'Destacado' : 'En la tienda'}
    </span>
  );
}

function CategoryForm({ intent, familiaId, label, busy }: { intent: string; familiaId?: string; label: string; busy: boolean }) {
  return (
    <Form method="post" className="ws-form" key={`${intent}-${familiaId ?? ''}`}>
      <input type="hidden" name="intent" value={intent} />
      {familiaId && <input type="hidden" name="familiaId" value={familiaId} />}
      <label className="ws-field">
        <span className="ws-field__label">{label}</span>
        <span className="ws-field__control">
          <input name="nombre" required maxLength={80} />
        </span>
      </label>
      <button className="ws-button ws-button--primary" disabled={busy}>Crear</button>
    </Form>
  );
}

function ProductForm({
  product,
  options,
  busy,
  canEdit,
  canPrice,
  defaultSubfamilia,
}: {
  product: Product | null;
  options: ReturnType<typeof categoryOptions>;
  busy: boolean;
  canEdit: boolean;
  canPrice: boolean;
  defaultSubfamilia?: string;
}) {
  const amount = (value: string | null | undefined) => (value === null || value === undefined ? '' : String(Number(value)).replace('.', ','));
  return (
    <Form method="post" className="ws-form">
      <input type="hidden" name="intent" value={product ? 'updateProduct' : 'createProduct'} />
      {product && <input type="hidden" name="productId" value={product.id} />}
      <fieldset disabled={!canEdit} className="ws-form ws-catalog__fields">
        <Field label="Nombre">
          <input name="nombre" required defaultValue={product?.nombre} />
        </Field>
        <Field label="Categoría">
          <select name="subfamiliaId" required defaultValue={product?.subfamiliaId ?? defaultSubfamilia ?? ''}>
            <option value="" disabled>Elige una categoría</option>
            {options.map((group) => (
              <optgroup key={group.familia.id} label={group.familia.nombre}>
                {group.subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        {product ? (
          <p className="ws-meta">
            <span>Código interno</span>
            <b>{product.codigoInterno}</b>
          </p>
        ) : (
          <Field label="Código interno (opcional)" hint="Si lo dejas vacío lo generamos, por ejemplo BEB-0001.">
            <input name="codigoInterno" maxLength={40} autoCapitalize="characters" />
          </Field>
        )}
        <div className="ws-catalog__pair">
          <Field label="Marca (opcional)">
            <input name="marca" defaultValue={product?.marca ?? ''} />
          </Field>
          <Field label="Código de barras (opcional)">
            <input name="codigoBarras" inputMode="numeric" defaultValue={product?.codigoBarras ?? ''} />
          </Field>
        </div>
        <Field label="Unidad">
          <select name="unidadBase" defaultValue={product?.unidadBase ?? 'UNIDAD'}>
            {UNITS.map((unit) => (
              <option key={unit.value} value={unit.value}>{unit.label}</option>
            ))}
          </select>
        </Field>
        {canPrice ? (
          <>
            <div className="ws-catalog__pair">
              <Field label="Costo">
                <input name="costo" inputMode="decimal" required defaultValue={amount(product?.costo)} />
              </Field>
              <Field label="Precio de venta">
                <input name="precioMinorista" inputMode="decimal" required defaultValue={amount(product?.precioMinorista)} />
              </Field>
            </div>
            <div className="ws-catalog__pair">
              <Field label="Precio mayorista (opcional)">
                <input name="precioMayorista" inputMode="decimal" defaultValue={amount(product?.precioMayorista)} />
              </Field>
              <Field label="Descuento % (opcional)">
                <input name="descuentoPorcentaje" inputMode="decimal" defaultValue={amount(product?.descuentoPorcentaje)} />
              </Field>
            </div>
          </>
        ) : (
          product && (
            <p className="ws-meta">
              <span>Precio de venta</span>
              <b>{formatMoney(product.precioMinorista)}</b>
              <span>Los precios los cambia el Owner o un Administrador.</span>
            </p>
          )
        )}
        <StoreFields product={product} />
        {canEdit && (
          <button className="ws-button ws-button--primary" disabled={busy}>
            {product ? 'Guardar cambios' : 'Crear producto'}
          </button>
        )}
      </fieldset>
    </Form>
  );
}

/**
 * OR-B4-046: what the store shows of the product. Each checkbox goes after a hidden "false", so
 * unticking it unpublishes; an inactive product cannot be published (the API refuses it too).
 */
function StoreFields({ product }: { product: Product | null }) {
  const inactive = product ? !product.activo : false;
  return (
    <fieldset className="ws-new__group ws-catalog__store">
      <legend>En la tienda</legend>
      <input type="hidden" name="publicado" value="false" />
      <label className="ws-check">
        <input type="checkbox" name="publicado" value="true" defaultChecked={product?.publicado ?? false} disabled={inactive} />
        <span>
          <b>Publicado en la tienda</b>
          <small>{inactive ? 'Activá el producto para publicarlo.' : 'Se ve y se puede pedir en tu tienda online.'}</small>
        </span>
      </label>
      <input type="hidden" name="destacado" value="false" />
      <label className="ws-check">
        <input type="checkbox" name="destacado" value="true" defaultChecked={product?.destacado ?? false} disabled={inactive} />
        <span>
          <b>Destacado</b>
          <small>Aparece primero en la tienda. Tiene que estar publicado.</small>
        </span>
      </label>
      <Field label="Descripción para la tienda (opcional)" hint="La lee el cliente en la ficha del producto.">
        <textarea name="descripcion" rows={4} maxLength={DESCRIPTION_MAX} defaultValue={product?.descripcion ?? ''} />
      </Field>
    </fieldset>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="ws-field">
      <span className="ws-field__label">{label}</span>
      <span className="ws-field__control">{children}</span>
      {hint && <span className="ws-field__hint">{hint}</span>}
    </label>
  );
}
