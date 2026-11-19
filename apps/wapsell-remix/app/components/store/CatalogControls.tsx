import { Form, Link, useNavigate, useSubmit } from '@remix-run/react';
import type { FormEvent } from 'react';
import { formatMoney } from '~/utils/format';
import { ORDER_OPTIONS, activeFilters, linkWith, listingQuery, panelFilterCount, type StoreListing } from '~/utils/store-browse';

/**
 * OR-B4-047 — how the customer narrows the store: categories and subcategories with how many
 * products each one has, the order, and the brand / price / stock filters (a panel that opens
 * from the bottom on a phone). Everything is a link or a GET form, so it works without JavaScript
 * and the address can be shared with its filters.
 */
export function CatalogControls({ base, query, listing }: Readonly<{ base: string; query: URLSearchParams; listing: StoreListing }>) {
  const submit = useSubmit();
  const navigate = useNavigate();
  const cat = query.get('cat');
  const sub = query.get('sub');
  const { categorias, marcas, precio } = listing.facetas;
  const category = categorias.find((c) => c.id === cat);
  const everything = categorias.reduce((sum, c) => sum + c.cantidad, 0);
  const chips = activeFilters(base, query, listing.facetas);
  const inPanel = panelFilterCount(query);
  const brands = query.getAll('marca');
  // With JavaScript, the filters go to a clean address (no empty fields, «1.500» as 1500), so the
  // link shared is the same one the store would build. Without it, the plain GET form still works.
  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const url = new URL(base, window.location.origin);
    for (const [key, value] of new FormData(event.currentTarget)) url.searchParams.append(key, String(value));
    const clean = listingQuery(url).toString();
    navigate(clean ? `${base}?${clean}` : base, { preventScrollReset: true });
  };
  const keep = (keys: string[]) =>
    keys.flatMap((key) => query.getAll(key).map((value) => <input key={`${key}-${value}`} type="hidden" name={key} value={value} />));

  return (
    <div className="catalog-controls">
      {categorias.length > 0 ? (
        <nav className="catalog-nav" aria-label="Categorías">
          <Link className={cat ? undefined : 'is-active'} to={linkWith(base, query, { cat: null, sub: null })} preventScrollReset>
            Todas <small>{everything}</small>
          </Link>
          {categorias.map((c) => (
            <Link
              key={c.id}
              className={c.id === cat ? 'is-active' : undefined}
              to={linkWith(base, query, { cat: c.id, sub: null, marca: null })}
              preventScrollReset
            >
              {c.nombre} <small>{c.cantidad}</small>
            </Link>
          ))}
        </nav>
      ) : null}
      {category && category.subcategorias.length > 0 ? (
        <nav className="catalog-nav catalog-nav--sub" aria-label={`Subcategorías de ${category.nombre}`}>
          <Link className={sub ? undefined : 'is-active'} to={linkWith(base, query, { sub: null })} preventScrollReset>
            Todo {category.nombre}
          </Link>
          {category.subcategorias.map((s) => (
            <Link key={s.id} className={s.id === sub ? 'is-active' : undefined} to={linkWith(base, query, { sub: s.id })} preventScrollReset>
              {s.nombre} <small>{s.cantidad}</small>
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="catalog-toolbar">
        <details className="catalog-filters" key={`f-${query.toString()}`}>
          <summary>Filtros{inPanel ? ` (${inPanel})` : ''}</summary>
          <Form method="get" action={base} className="catalog-filters__panel" preventScrollReset onSubmit={applyFilters}>
            {keep(['q', 'cat', 'sub', 'orden'])}
            {marcas.length > 0 ? (
              <fieldset>
                <legend>Marca</legend>
                <div className="catalog-filters__brands">
                  {marcas.map((m) => (
                    <label key={m.nombre} className="catalog-check">
                      <input type="checkbox" name="marca" value={m.nombre} defaultChecked={brands.includes(m.nombre)} />
                      <span>{m.nombre}</span>
                      <small>{m.cantidad}</small>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <fieldset>
              <legend>Precio</legend>
              <div className="catalog-price">
                <label>
                  <span>Desde</span>
                  <input name="min" inputMode="numeric" placeholder={precio ? formatMoney(precio.min) : '$ 0'} defaultValue={query.get('min') ?? ''} />
                </label>
                <label>
                  <span>Hasta</span>
                  <input name="max" inputMode="numeric" placeholder={precio ? formatMoney(precio.max) : ''} defaultValue={query.get('max') ?? ''} />
                </label>
              </div>
            </fieldset>
            <label className="catalog-check">
              <input type="checkbox" name="stock" value="1" defaultChecked={query.get('stock') === '1'} />
              <span>Solo con stock</span>
            </label>
            <div className="catalog-filters__actions">
              <button type="submit">Ver resultados</button>
              <Link to={linkWith(base, query, { marca: null, min: null, max: null, stock: null })} preventScrollReset>
                Limpiar
              </Link>
            </div>
          </Form>
        </details>

        <Form
          method="get"
          action={base}
          className="catalog-sort"
          key={`o-${query.toString()}`}
          preventScrollReset
          onChange={(event) => submit(event.currentTarget, { preventScrollReset: true })}
        >
          {keep(['q', 'cat', 'sub', 'marca', 'min', 'max', 'stock'])}
          <label>
            <span>Ordenar por</span>
            <select name="orden" defaultValue={query.get('orden') ?? 'destacados'}>
              {ORDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <noscript>
            <button type="submit">Ordenar</button>
          </noscript>
        </Form>
      </div>

      {chips.length > 0 ? (
        <div className="active-filters" aria-label="Filtros en uso">
          {chips.map((chip) => (
            <Link key={chip.label} to={chip.href} preventScrollReset aria-label={`Quitar ${chip.label}`}>
              {chip.label} <span aria-hidden="true">×</span>
            </Link>
          ))}
          <Link to={base} className="active-filters__clear" preventScrollReset>
            Quitar todo
          </Link>
        </div>
      ) : null}
    </div>
  );
}
