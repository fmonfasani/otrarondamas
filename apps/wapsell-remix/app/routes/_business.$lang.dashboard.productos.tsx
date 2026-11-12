import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useParams, useRouteLoaderData, useSearchParams } from '@remix-run/react';
import { Plus, Search, X } from 'lucide-react';
import { getCurrentUser, requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import { formatMoney } from '~/utils/format';
import {
  UNITS,
  catalogAbilities,
  categoryLabel,
  categoryOptions,
  matchesFilters,
  productPayload,
  type Hierarchy,
  type Product,
} from '~/utils/catalog';
import type { loader as businessLoader } from './_business';

export const meta: MetaFunction = () => [{ title: 'Catálogo · Wapsell' }];

/** Rows rendered at once; search narrows a large catalog (the API caps a search at 50). */
export const PAGE_SIZE = 200;

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const category = url.searchParams.get('cat');
  const status = url.searchParams.get('estado') ?? 'activos';
  const selectedId = url.searchParams.get('p');

  const [products, hierarchy, selected] = await Promise.all([
    settle(apiRequest<Product[]>(token, `/catalogo/productos${query ? `?search=${encodeURIComponent(query)}` : ''}`)),
    settle(apiRequest<Hierarchy>(token, '/catalogo/jerarquia')),
    selectedId ? settle(apiRequest<Product>(token, `/catalogo/productos/${encodeURIComponent(selectedId)}`)) : null,
  ]);

  const filtered = (products ?? []).filter((p) => matchesFilters(p, { category, status }));
  const countByCategory: Record<string, number> = {};
  for (const product of products ?? []) countByCategory[product.familiaId] = (countByCategory[product.familiaId] ?? 0) + 1;

  return json({
    available: products !== null && hierarchy !== null,
    hierarchy: hierarchy ?? { familias: [], subfamilias: [], tipos: [], subtipos: [] },
    products: filtered.slice(0, PAGE_SIZE),
    total: filtered.length,
    countByCategory,
    selected,
    selectedId,
  });
}

type ActionData = { ok: boolean; message: string };

export async function action({ request, params }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const base = `/${params.lang ?? 'es'}/dashboard/productos`;
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
      return json<ActionData>({ ok: true, message: activo ? 'Producto activado.' : 'Producto desactivado. Ya no se ofrece para la venta.' });
    }
    return fail('Acción desconocida.');
  } catch (error) {
    if (error instanceof ApiError) return fail(error.message, error.status);
    throw error;
  }
}

/** Catálogo: categories (OR-B4-028), product list with search and filters, create/edit. */
export default function CatalogPage() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const layout = useRouteLoaderData<typeof businessLoader>('routes/_business');
  const role = layout?.user.rol ?? '';
  const can = catalogAbilities(role);
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
  const { lang = 'es' } = useParams();
  const [searchParams] = useSearchParams();
  const base = `/${lang}/dashboard/productos`;
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
        <h1 className="ws-page__title">Catálogo</h1>
        <p className="ws-alert" role="alert">No pudimos cargar el catálogo. Puede que tu rol no tenga acceso.</p>
      </div>
    );
  }

  const category = searchParams.get('cat');
  const status = searchParams.get('estado') ?? 'activos';
  const creating = searchParams.get('nuevo') === '1';
  const editing = data.selected;
  const options = categoryOptions(data.hierarchy);
  const hasCategories = data.hierarchy.familias.length > 0;
  const saved = searchParams.get('guardado') === '1';

  return (
    <div className="ws-page ws-page--wide">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">{layout?.user.empresaNombre.toUpperCase()}</p>
          <h1 className="ws-page__title">Catálogo</h1>
          <p className="ws-page__lead">
            {data.total} {data.total === 1 ? 'producto' : 'productos'}
            {status === 'activos' ? ' activos' : status === 'inactivos' ? ' inactivos' : ''}
            {category ? ` en ${data.hierarchy.familias.find((f) => f.id === category)?.nombre ?? 'la categoría'}` : ''}.
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
            </div>
            {data.products.length === 0 ? (
              <div className="ws-empty">
                <b>{searchParams.get('q') ? 'Nada coincide con la búsqueda.' : 'Todavía no hay productos acá.'}</b>
                {can.createProducts && !searchParams.get('q') && 'Usa "Nuevo producto" para cargar el primero.'}
              </div>
            ) : (
              <div className="ws-table-wrap">
                <table className="ws-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Código</th>
                      <th>Categoría</th>
                      <th className="is-num">Precio</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.map((product) => (
                      <tr key={product.id} className={product.id === data.selectedId ? 'is-selected' : undefined}>
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
        {canEdit && (
          <button className="ws-button ws-button--primary" disabled={busy}>
            {product ? 'Guardar cambios' : 'Crear producto'}
          </button>
        )}
      </fieldset>
    </Form>
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
