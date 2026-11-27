import { useMemo, useState } from 'react';
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useSearchParams } from '@remix-run/react';
import { Search, Store, Tag } from 'lucide-react';
import { getBuyer } from '~/services/buyer-session.server';
import { fetchExplorer } from '~/services/store.server';
import { formatMoney } from '~/utils/format';
import {
  EMPTY_EXPLORER,
  filterProducts,
  filterStores,
  productPhoto,
  storeCover,
  storeLine,
  type ExplorerProduct,
  type ExplorerStore,
} from '~/utils/explorer';
import { storeMark } from '~/utils/store';
import explorerStyles from '../styles/explorer.css?url';

export const links = () => [{ rel: 'stylesheet', href: explorerStyles }];

export const meta: MetaFunction = () => [
  { title: 'Explorar · Wapsell' },
  { name: 'description', content: 'Los negocios de tu barrio en Wapsell: tiendas, ofertas del día y chat con cada negocio.' },
];

/**
 * Marketplace, step 2 (Owner, 2026-11-26) — «Explorar», the customer app's home, PedidosYa-like:
 * Wapsell on top, a search box, rubros, carousels (today's offers, most ordered, best sellers,
 * new on Wapsell) and every store. Public: anyone looks; buying and chatting ask for an account.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const [buyer, explorer] = await Promise.all([getBuyer(request), fetchExplorer().catch(() => null)]);
  return json(
    { explorer: explorer ?? EMPTY_EXPLORER, failed: !explorer, buyer: buyer ? { nombre: buyer.nombre } : null },
    { headers: { 'Cache-Control': 'private, max-age=30' } },
  );
}

export default function Explorar() {
  const { explorer, failed, buyer } = useLoaderData<typeof loader>();
  const [params, setParams] = useSearchParams();
  const rubro = params.get('rubro');
  const [q, setQ] = useState(params.get('q') ?? '');
  const searching = Boolean(rubro || q.trim());
  const stores = useMemo(() => filterStores(explorer.negocios, { rubro, q }), [explorer.negocios, rubro, q]);
  const products = useMemo(
    () => (q.trim() ? filterProducts([...explorer.carruseles.ofertas, ...explorer.carruseles.masVendidos], q) : []),
    [explorer.carruseles, q],
  );
  const choose = (next: string | null) => {
    const p = new URLSearchParams(params);
    if (next) p.set('rubro', next);
    else p.delete('rubro');
    setParams(p, { replace: true, preventScrollReset: true });
  };

  return (
    <div className="wx">
      <header className="wx-top">
        <Link to="/explorar" className="wx-brand" aria-label="Wapsell, explorar">
          wapsell<span>.</span>
        </Link>
        <Link to={buyer ? '/cuenta' : '/es/auth/login?redirectTo=%2Fexplorar'} className="wx-account">
          {buyer ? `Hola, ${buyer.nombre.split(' ')[0]}` : 'Ingresar'}
        </Link>
      </header>

      <form className="wx-search" role="search" onSubmit={(e) => e.preventDefault()}>
        <Search size={18} aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscá negocios, productos o rubros"
          aria-label="Buscá negocios, productos o rubros"
          enterKeyHint="search"
        />
      </form>

      {explorer.rubros.length > 0 ? (
        <nav className="wx-chips" aria-label="Rubros">
          <button type="button" className={!rubro ? 'is-on' : ''} onClick={() => choose(null)} aria-pressed={!rubro}>
            Todos
          </button>
          {explorer.rubros.map((r) => (
            <button key={r} type="button" className={rubro === r ? 'is-on' : ''} onClick={() => choose(rubro === r ? null : r)} aria-pressed={rubro === r}>
              {r}
            </button>
          ))}
        </nav>
      ) : null}

      {failed ? <p className="wx-empty">No pudimos cargar los negocios. Probá en un ratito.</p> : null}

      {searching ? (
        <>
          {products.length > 0 ? (
            <Carousel title="Productos" icon={<Tag size={18} aria-hidden="true" />}>
              {products.map((p) => (
                <ProductCard key={`${p.tienda.slug}-${p.productoId}`} product={p} />
              ))}
            </Carousel>
          ) : null}
          <section className="wx-section" aria-labelledby="wx-found">
            <h2 id="wx-found">{rubro ?? 'Negocios'} · {stores.length}</h2>
            {stores.length === 0 ? <p className="wx-empty">No encontramos negocios con esa búsqueda.</p> : <StoreGrid stores={stores} />}
          </section>
        </>
      ) : (
        <>
          {explorer.carruseles.ofertas.length > 0 ? (
            <Carousel title="Ofertas del día" icon={<Tag size={18} aria-hidden="true" />}>
              {explorer.carruseles.ofertas.map((p) => (
                <ProductCard key={`${p.tienda.slug}-${p.productoId}`} product={p} />
              ))}
            </Carousel>
          ) : null}
          {explorer.carruseles.masPedidos.length > 0 ? (
            <Carousel title="Los más pedidos" icon={<Store size={18} aria-hidden="true" />}>
              {explorer.carruseles.masPedidos.map((s) => (
                <StoreCard key={s.slug} store={s} compact />
              ))}
            </Carousel>
          ) : null}
          {explorer.carruseles.masVendidos.length > 0 ? (
            <Carousel title="Lo que más se lleva">
              {explorer.carruseles.masVendidos.map((p) => (
                <ProductCard key={`${p.tienda.slug}-${p.productoId}`} product={p} />
              ))}
            </Carousel>
          ) : null}
          {explorer.carruseles.nuevos.length > 0 ? (
            <Carousel title="Nuevos en Wapsell">
              {explorer.carruseles.nuevos.map((s) => (
                <StoreCard key={s.slug} store={s} compact />
              ))}
            </Carousel>
          ) : null}
          <section className="wx-section" aria-labelledby="wx-all">
            <h2 id="wx-all">Todos los negocios · {explorer.negocios.length}</h2>
            {explorer.negocios.length === 0 && !failed ? (
              <p className="wx-empty">Pronto vas a encontrar acá los negocios de tu barrio.</p>
            ) : (
              <StoreGrid stores={explorer.negocios} />
            )}
          </section>
        </>
      )}

      <footer className="wx-foot">
        <Link to="/vender">¿Tenés un negocio? Vendé en Wapsell</Link>
      </footer>
    </div>
  );
}

function Carousel({ title, icon, children }: Readonly<{ title: string; icon?: React.ReactNode; children: React.ReactNode }>) {
  return (
    <section className="wx-section" aria-label={title}>
      <h2>
        {icon}
        {title}
      </h2>
      <div className="wx-rail">{children}</div>
    </section>
  );
}

function OpenNow({ open }: Readonly<{ open: boolean | null }>) {
  if (open === null) return null;
  return <span className={`wx-open${open ? ' is-open' : ''}`}>{open ? 'Abierto' : 'Cerrado'}</span>;
}

function StoreCard({ store, compact }: Readonly<{ store: ExplorerStore; compact?: boolean }>) {
  const cover = storeCover(store);
  return (
    <Link to={`/tienda/${store.slug}`} className={`wx-store${compact ? ' wx-store--compact' : ''}`}>
      <span className="wx-store__cover">
        {cover ? <img src={cover} alt="" loading="lazy" /> : <span className="wx-store__mark">{storeMark(store.nombre)}</span>}
        {store.ofertas > 0 ? <span className="wx-badge">{store.ofertas === 1 ? '1 oferta' : `${store.ofertas} ofertas`}</span> : null}
      </span>
      <span className="wx-store__body">
        <b>{store.nombre}</b>
        <small>{storeLine(store)}</small>
        <OpenNow open={store.abiertoAhora} />
      </span>
    </Link>
  );
}

function StoreGrid({ stores }: Readonly<{ stores: ExplorerStore[] }>) {
  return (
    <div className="wx-grid">
      {stores.map((s) => (
        <StoreCard key={s.slug} store={s} />
      ))}
    </div>
  );
}

function ProductCard({ product }: Readonly<{ product: ExplorerProduct }>) {
  const photo = productPhoto(product);
  return (
    <Link to={`/tienda/${product.tienda.slug}/producto/${product.productoId}`} className="wx-product">
      <span className="wx-product__photo">
        {photo ? <img src={photo} alt="" loading="lazy" /> : <span className="wx-store__mark">{product.nombre.charAt(0).toUpperCase()}</span>}
        {product.descuentoPorcentaje ? <span className="wx-badge wx-badge--off">-{Math.round(product.descuentoPorcentaje)}%</span> : null}
      </span>
      <span className="wx-product__body">
        <b>{product.nombre}</b>
        <span className="wx-price">
          {formatMoney(product.precio)}
          {product.precioSinDescuento ? <del>{formatMoney(product.precioSinDescuento)}</del> : null}
        </span>
        <small>{product.tienda.nombre}</small>
      </span>
    </Link>
  );
}
