import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { StoreHeader } from '~/components/store/StoreHeader';
import { ApiError } from '~/services/api.server';
import { getStoreCustomer } from '~/services/customer-session.server';
import { addToServerCart, fetchStore, fetchStoreProduct } from '~/services/store.server';
import { formatMoney } from '~/utils/format';
import { addToCart, readStoredCart, writeStoredCart } from '~/utils/store';

/**
 * OR-B4-047 — the product page of the store: /tienda/:slug/producto/:id. Its price (with the
 * discount), whether there is stock, its description and «Agregar a mi pedido». Only a product
 * the Business published is found. A visitor's pick goes to the cart in the browser; a signed-in
 * customer's, to the cart of their account (OR-B4-029). Photos come with stage A3, reviews with F.
 */

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  data
    ? [
        { title: `${data.product.nombre} | ${data.store.nombre}` },
        { name: 'description', content: (data.product.descripcion ?? `${data.product.nombre} en ${data.store.nombre}.`).slice(0, 155) },
      ]
    : [{ title: 'Producto no encontrado' }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug ?? '';
  const unavailable = () => {
    throw new Response('No pudimos cargar el producto.', { status: 503 });
  };
  const [store, product] = await Promise.all([fetchStore(slug).catch(unavailable), fetchStoreProduct(slug, params.id ?? '').catch(unavailable)]);
  if (!store) throw new Response('Tienda no encontrada', { status: 404 });
  if (!product) throw new Response('Producto no encontrado', { status: 404 });
  const customer = await getStoreCustomer(request, slug);
  return json({ store, product, customer: customer ? { nombre: customer.nombre } : null });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const slug = params.slug ?? '';
  const customer = await getStoreCustomer(request, slug);
  if (!customer) return json({ ok: false, message: 'Ingresá a tu cuenta para guardar tu pedido.' }, { status: 401 });
  const form = await request.formData();
  const cantidad = Math.min(Math.max(Math.trunc(Number(form.get('cantidad')) || 1), 1), 99);
  try {
    await addToServerCart(customer.jwt, params.id ?? '', cantidad);
    return json({ ok: true, message: '' });
  } catch (error) {
    if (error instanceof ApiError) return json({ ok: false, message: error.message }, { status: error.status });
    throw error;
  }
}

export default function ProductPage() {
  const { store, product, customer } = useLoaderData<typeof loader>();
  const add = useFetcher<typeof action>();
  const [addedHere, setAddedHere] = useState(false);
  const base = `/tienda/${store.slug}`;
  const added = addedHere || Boolean(add.data?.ok);
  const addAsVisitor = () => {
    writeStoredCart(store.slug, addToCart(readStoredCart(store.slug), product));
    setAddedHere(true);
  };
  const categoryHref = `${base}?cat=${product.categoria.id}`;

  return (
    <main className="store-shell">
      <StoreHeader store={store} customerName={customer?.nombre ?? null}>
        <a className="cart-trigger" href={`${base}?carrito=1`}>
          Mi pedido
        </a>
      </StoreHeader>

      <article className="product-page">
        <nav className="product-page__crumbs" aria-label="Estás en">
          <Link to={base}>Tienda</Link>
          <span aria-hidden="true">›</span>
          <Link to={categoryHref}>{product.categoria.nombre}</Link>
          {product.subcategoria ? (
            <>
              <span aria-hidden="true">›</span>
              <Link to={`${categoryHref}&sub=${product.subcategoria.id}`}>{product.subcategoria.nombre}</Link>
            </>
          ) : null}
        </nav>

        <div className="product-page__body">
          <div className="product-visual product-page__visual">
            <span className="product-initial">{product.nombre.trim().charAt(0).toUpperCase()}</span>
            {product.descuentoPorcentaje ? <span className="discount-tag">-{product.descuentoPorcentaje}%</span> : null}
            {product.disponible ? null : <span className="unavailable-tag">Sin stock</span>}
            {product.destacado ? <span className="featured-tag">Destacado</span> : null}
          </div>

          <div className="product-page__info">
            <span className="product-code">{product.codigoInterno}</span>
            <h1>{product.nombre}</h1>
            {product.marca ? <p className="product-page__brand">{product.marca}</p> : null}
            <div className="product-page__price">
              <strong>{formatMoney(product.precio)}</strong>
              {product.precioSinDescuento ? <del>{formatMoney(product.precioSinDescuento)}</del> : null}
              <small>{product.unidadBase || 'Unidad'}</small>
            </div>
            <p className={`product-page__stock ${product.disponible ? 'is-in' : 'is-out'}`}>
              {product.disponible ? 'Disponible' : 'Sin stock por ahora'}
            </p>

            {customer ? (
              <add.Form method="post">
                <input type="hidden" name="cantidad" value="1" />
                <button className="submit-order" type="submit" disabled={!product.disponible || add.state !== 'idle'}>
                  {add.state === 'idle' ? 'Agregar a mi pedido' : 'Agregando…'}
                </button>
              </add.Form>
            ) : (
              <button className="submit-order" type="button" disabled={!product.disponible} onClick={addAsVisitor}>
                Agregar a mi pedido
              </button>
            )}
            {added ? (
              <p className="product-page__added" role="status">
                Lo agregamos a tu pedido. <Link to={`${base}?carrito=1`}>Ver mi pedido</Link>
              </p>
            ) : null}
            {add.data && !add.data.ok ? <output className="form-error">{add.data.message}</output> : null}

            {product.descripcion ? (
              <section className="product-page__description" aria-labelledby="descripcion">
                <h2 id="descripcion">Descripción</h2>
                <p>{product.descripcion}</p>
              </section>
            ) : null}
          </div>
        </div>

        <Link className="product-page__back" to={base}>
          ← Volver a la tienda
        </Link>
      </article>

      <a className="chat-fab" href={`${base}/chat`}>
        <span aria-hidden="true">💬</span> Escribinos
      </a>
    </main>
  );
}
