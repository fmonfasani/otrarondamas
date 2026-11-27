import { useEffect, useRef } from 'react';
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useLoaderData, useSubmit } from '@remix-run/react';
import { Heart, SlidersHorizontal, Store, X } from 'lucide-react';
import { favoriteIds, getBuyer } from '~/services/buyer-session.server';
import { fetchExplorerSearch } from '~/services/store.server';
import { formatMoney } from '~/utils/format';
import { EMPTY_SEARCH, SEARCH_ORDERS, searchHref, searchParamsOf } from '~/utils/explorer';
import { ExplorerSearch } from '~/components/explorer/ExplorerSearch';
import { Carousel, ProductCard, StoreCard } from '~/components/explorer/ExplorerCards';
import explorerStyles from '../styles/explorer.css?url';

export const links = () => [{ rel: 'stylesheet', href: explorerStyles }];

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data?.result.q ? `${data.result.q} · Buscar en Wapsell` : 'Buscar en Wapsell' },
  { name: 'description', content: 'Buscá productos, marcas y negocios en todas las tiendas de Wapsell.' },
];

/**
 * Marketplace, step 3 (Owner, 2026-11-26) — Wapsell's search across every store: products, brands
 * and stores, forgiving typos («¿Quisiste decir…?»), with filters (rubro, brand, price, «en
 * oferta», «abierto ahora») and order (relevance, best sellers, price, newest). Everything travels
 * in the link, so a search can be shared. Public, like Explorar.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const params = searchParamsOf(new URL(request.url));
  const buyer = await getBuyer(request);
  const [result, favs] = await Promise.all([fetchExplorerSearch(params).catch(() => null), favoriteIds(buyer)]);
  return json(
    { result: result ?? { ...EMPTY_SEARCH, q: params.get('q') ?? '' }, failed: !result, params: params.toString(), buyer: buyer ? { nombre: buyer.nombre } : null, favs },
    { headers: { 'Cache-Control': 'private, max-age=30' } },
  );
}

export default function Buscar() {
  const { result, failed, params: raw, buyer, favs } = useLoaderData<typeof loader>();
  const params = new URLSearchParams(raw);
  const submit = useSubmit();
  const filters = useRef<HTMLDetailsElement>(null);
  // A new search (filters applied, a chip removed, another page) closes the sheet.
  useEffect(() => filters.current?.removeAttribute('open'), [raw]);
  const marcas = params.getAll('marca');
  const rubro = params.get('rubro');
  const oferta = params.has('oferta');
  const abierto = params.has('abierto');
  const orden = params.get('orden') ?? 'relevancia';
  const min = params.get('min');
  const max = params.get('max');
  // What a new search from the box keeps: the filters, never the page.
  const keep = [...params.entries()].filter(([k]) => k !== 'q' && k !== 'pagina') as Array<[string, string]>;
  const chips: Array<{ label: string; href: string }> = [
    ...(rubro ? [{ label: rubro, href: searchHref(params, { rubro: null }) }] : []),
    ...marcas.map((m) => ({ label: m, href: searchHref(params, { marca: marcas.filter((x) => x !== m) }) })),
    ...(min || max
      ? [{ label: `${min ? `desde ${formatMoney(min)}` : ''}${min && max ? ' ' : ''}${max ? `hasta ${formatMoney(max)}` : ''}`, href: searchHref(params, { min: null, max: null }) }]
      : []),
  ];

  return (
    <div className="wx">
      <header className="wx-top">
        <Link to="/explorar" className="wx-brand" aria-label="Wapsell, explorar">
          wapsell<span>.</span>
        </Link>
        <span className="wx-top__actions">
          {buyer ? (
            <Link to="/favoritos" className="wx-account wx-account--icon" aria-label="Mis favoritos">
              <Heart size={17} aria-hidden="true" />
            </Link>
          ) : null}
          <Link to={buyer ? '/cuenta' : `/es/auth/login?redirectTo=${encodeURIComponent(`/buscar?${raw}`)}`} className="wx-account">
            {buyer ? `Hola, ${buyer.nombre.split(' ')[0]}` : 'Ingresar'}
          </Link>
        </span>
      </header>

      <ExplorerSearch defaultValue={result.q} keep={keep} />

      <div className="wx-tools">
        <Link to={searchHref(params, { oferta: oferta ? null : '1' })} className={`wx-toggle${oferta ? ' is-on' : ''}`} aria-pressed={oferta} preventScrollReset>
          En oferta
        </Link>
        <Link to={searchHref(params, { abierto: abierto ? null : '1' })} className={`wx-toggle${abierto ? ' is-on' : ''}`} aria-pressed={abierto} preventScrollReset>
          Abierto ahora
        </Link>
        {/* A tap on the dark backdrop (the details itself) closes the sheet. */}
        <details
          className="wx-filters"
          ref={filters}
          onClick={(e) => {
            if (e.target === e.currentTarget) e.currentTarget.open = false;
          }}
        >
          <summary>
            <SlidersHorizontal size={15} aria-hidden="true" /> Filtros
          </summary>
          <Form method="get" action="/buscar" className="wx-sheet">
            <div className="wx-sheet__head">
              <b>Filtros</b>
              <button type="button" aria-label="Cerrar filtros" onClick={() => filters.current?.removeAttribute('open')}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {[...params.entries()]
              .filter(([k]) => ['q', 'oferta', 'abierto', 'orden'].includes(k))
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            {result.facetas.rubros.length > 0 ? (
              <fieldset>
                <legend>Rubro</legend>
                <label>
                  <input type="radio" name="rubro" value="" defaultChecked={!rubro} /> Todos
                </label>
                {result.facetas.rubros.map((r) => (
                  <label key={r}>
                    <input type="radio" name="rubro" value={r} defaultChecked={rubro === r} /> {r}
                  </label>
                ))}
              </fieldset>
            ) : null}
            {result.facetas.marcas.length > 0 ? (
              <fieldset>
                <legend>Marca</legend>
                {result.facetas.marcas.map((m) => (
                  <label key={m.nombre}>
                    <input type="checkbox" name="marca" value={m.nombre} defaultChecked={marcas.includes(m.nombre)} /> {m.nombre} <small>{m.cantidad}</small>
                  </label>
                ))}
              </fieldset>
            ) : null}
            <fieldset className="wx-range">
              <legend>
                Precio
                {result.facetas.precio ? (
                  <small>
                    De {formatMoney(result.facetas.precio.min)} a {formatMoney(result.facetas.precio.max)}
                  </small>
                ) : null}
              </legend>
              <label>
                Desde $
                <input type="number" name="min" min={0} inputMode="numeric" defaultValue={min ?? ''} />
              </label>
              <label>
                Hasta $
                <input type="number" name="max" min={0} inputMode="numeric" defaultValue={max ?? ''} />
              </label>
            </fieldset>
            <button type="submit">Ver resultados</button>
          </Form>
        </details>
        <Form method="get" action="/buscar" className="wx-order" onChange={(e) => submit(e.currentTarget, { preventScrollReset: true })}>
          {[...params.entries()]
            .filter(([k]) => k !== 'orden' && k !== 'pagina')
            .map(([k, v], i) => (
              <input key={`${k}-${i}`} type="hidden" name={k} value={v} />
            ))}
          <label>
            <select name="orden" defaultValue={orden} aria-label="Ordenar">
              {SEARCH_ORDERS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
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
        <div className="wx-active" aria-label="Filtros elegidos">
          {chips.map((c) => (
            <Link key={c.label} to={c.href} preventScrollReset>
              {c.label} <X size={13} aria-label="Quitar" />
            </Link>
          ))}
        </div>
      ) : null}

      {result.sugerencia ? (
        <p className="wx-didyoumean">
          ¿Quisiste decir <Link to={searchHref(params, { q: result.sugerencia })}>{result.sugerencia}</Link>?
        </p>
      ) : null}

      {failed ? <p className="wx-empty">No pudimos buscar ahora. Probá en un ratito.</p> : null}

      {result.negocios.length > 0 ? (
        <Carousel title="Negocios" icon={<Store size={18} aria-hidden="true" />}>
          {result.negocios.map((s) => (
            <StoreCard key={s.slug} store={s} compact />
          ))}
        </Carousel>
      ) : null}

      <section className="wx-section" aria-labelledby="wx-results">
        <h2 id="wx-results">
          {result.total === 1 ? '1 producto' : `${result.total} productos`}
          {result.q ? <small> para «{result.q}»</small> : null}
        </h2>
        {result.total === 0 && !failed ? (
          <div className="wx-empty">
            <p>No encontramos productos{result.q ? ` para «${result.q}»` : ''}.</p>
            <p>Probá con menos palabras, otra marca o sacando filtros.</p>
            <Link to="/explorar">Ver todos los negocios</Link>
          </div>
        ) : (
          <div className="wx-results">
            {result.productos.map((p) => (
              <ProductCard key={`${p.tienda.slug}-${p.productoId}`} product={p} fav={{ on: favs.includes(p.productoId), signedIn: Boolean(buyer) }} />
            ))}
          </div>
        )}
      </section>

      {result.paginas > 1 ? (
        <nav className="wx-pages" aria-label="Páginas">
          {result.pagina > 1 ? <Link to={searchHref(params, { pagina: String(result.pagina - 1) })}>Anterior</Link> : <span />}
          <span>
            Página {result.pagina} de {result.paginas}
          </span>
          {result.pagina < result.paginas ? <Link to={searchHref(params, { pagina: String(result.pagina + 1) })}>Siguiente</Link> : <span />}
        </nav>
      ) : null}

      <footer className="wx-foot">
        <Link to="/explorar">Volver a Explorar</Link>
      </footer>
    </div>
  );
}
