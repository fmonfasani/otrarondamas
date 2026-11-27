import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { Heart } from 'lucide-react';
import { buyerApi, getBuyer } from '~/services/buyer-session.server';
import { loginTo, type FavoriteProduct } from '~/utils/explorer';
import { ProductCard } from '~/components/explorer/ExplorerCards';
import { FavoriteButton } from '~/components/explorer/FavoriteButton';
import explorerStyles from '../styles/explorer.css?url';

export const links = () => [{ rel: 'stylesheet', href: explorerStyles }];

export const meta: MetaFunction = () => [{ title: 'Mis favoritos · Wapsell' }];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Marketplace, step 3b (Owner, 2026-11-26) — «Mis favoritos»: the products the buyer marked with
 * ♥ in any store, at each store's price; what can no longer be bought says so. The ♥ of every
 * card posts here. Buyers only: a visitor is sent to sign in and comes back.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const buyer = await getBuyer(request);
  if (!buyer) throw redirect(loginTo('/favoritos'));
  const result = await buyerApi<{ favoritos: FavoriteProduct[] }>('/favoritos', { jwt: buyer.jwt });
  if (!result.ok && result.status === 401) throw redirect(loginTo('/favoritos'));
  return json(
    { favoritos: result.ok ? result.data.favoritos : [], failed: !result.ok, nombre: buyer.nombre },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const buyer = await getBuyer(request);
  const form = await request.formData();
  const productoId = String(form.get('productoId') ?? '');
  if (!buyer) return json({ ok: false, message: 'Ingresá para guardar favoritos.' }, { status: 401 });
  if (!UUID.test(productoId)) return json({ ok: false, message: 'Producto inválido.' }, { status: 400 });
  const on = form.get('favorito') === '1';
  const result = await buyerApi(`/favoritos/${productoId}`, { method: on ? 'PUT' : 'DELETE', jwt: buyer.jwt });
  return json(result.ok ? { ok: true } : { ok: false, message: result.message }, { status: result.ok ? 200 : result.status });
}

export default function Favoritos() {
  const { favoritos, failed, nombre } = useLoaderData<typeof loader>();
  return (
    <div className="wx">
      <header className="wx-top">
        <Link to="/explorar" className="wx-brand" aria-label="Wapsell, explorar">
          wapsell<span>.</span>
        </Link>
        <Link to="/cuenta" className="wx-account">
          Hola, {nombre.split(' ')[0]}
        </Link>
      </header>

      <section className="wx-section" aria-labelledby="wx-favs">
        <h2 id="wx-favs">
          <Heart size={18} aria-hidden="true" /> Mis favoritos{favoritos.length ? ` · ${favoritos.length}` : ''}
        </h2>
        {failed ? <p className="wx-empty">No pudimos cargar tus favoritos. Probá en un ratito.</p> : null}
        {!failed && favoritos.length === 0 ? (
          <div className="wx-empty">
            <p>Todavía no guardaste nada. Tocá el ♥ de un producto para tenerlo a mano.</p>
            <Link to="/explorar">Explorar los negocios</Link>
          </div>
        ) : (
          <div className="wx-results">
            {favoritos.map((p) =>
              p.disponible && p.precio ? (
                <ProductCard key={`${p.tienda.slug}-${p.productoId}`} product={{ ...p, precio: p.precio }} fav={{ on: true, signedIn: true }} />
              ) : (
                <div key={`${p.tienda.slug}-${p.productoId}`} className="wx-pcard is-gone">
                  <FavoriteButton productoId={p.productoId} nombre={p.nombre} on signedIn />
                  <Link to={`/tienda/${p.tienda.slug}`} className="wx-product">
                    <span className="wx-product__photo">
                      <span className="wx-store__mark">{p.nombre.charAt(0).toUpperCase()}</span>
                    </span>
                    <span className="wx-product__body">
                      <b>{p.nombre}</b>
                      <span className="wx-gone">No disponible ahora</span>
                      <small>{p.tienda.nombre}</small>
                    </span>
                  </Link>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      <footer className="wx-foot">
        <Link to="/explorar">Volver a Explorar</Link>
      </footer>
    </div>
  );
}
