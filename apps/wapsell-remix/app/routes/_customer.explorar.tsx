import { useMemo } from 'react';
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useSearchParams } from '@remix-run/react';
import { Store, Tag } from 'lucide-react';
import { getBuyer } from '~/services/buyer-session.server';
import { fetchExplorer } from '~/services/store.server';
import { EMPTY_EXPLORER, filterStores } from '~/utils/explorer';
import { ExplorerSearch } from '~/components/explorer/ExplorerSearch';
import { Carousel, ProductCard, StoreCard, StoreGrid } from '~/components/explorer/ExplorerCards';
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
 * Step 3: the search box searches every store (/buscar) and suggests while typing.
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
  const searching = Boolean(rubro);
  const stores = useMemo(() => filterStores(explorer.negocios, { rubro }), [explorer.negocios, rubro]);
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

      {/* Step 3: Enter searches every store; the suggestions come while typing. */}
      <ExplorerSearch />

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
          <section className="wx-section" aria-labelledby="wx-found">
            <h2 id="wx-found">{rubro ?? 'Negocios'} · {stores.length}</h2>
            {stores.length === 0 ? <p className="wx-empty">No encontramos negocios con esa búsqueda.</p> : <StoreGrid stores={stores} />}
          </section>
          {rubro ? (
            <p className="wx-more">
              <Link to={`/buscar?rubro=${encodeURIComponent(rubro)}`}>Ver todos los productos de {rubro}</Link>
            </p>
          ) : null}
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
