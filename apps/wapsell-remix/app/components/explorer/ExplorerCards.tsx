import { Link } from '@remix-run/react';
import { formatMoney } from '~/utils/format';
import { productPhoto, storeCover, storeLine, type ExplorerProduct, type ExplorerStore } from '~/utils/explorer';
import { storeMark } from '~/utils/store';

/** Marketplace — the explorer's cards (Explorar and /buscar). */

export function Carousel({ title, icon, children }: Readonly<{ title: string; icon?: React.ReactNode; children: React.ReactNode }>) {
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

export function OpenNow({ open }: Readonly<{ open: boolean | null }>) {
  if (open === null) return null;
  return <span className={`wx-open${open ? ' is-open' : ''}`}>{open ? 'Abierto' : 'Cerrado'}</span>;
}

export function StoreCard({ store, compact }: Readonly<{ store: ExplorerStore; compact?: boolean }>) {
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

export function StoreGrid({ stores }: Readonly<{ stores: ExplorerStore[] }>) {
  return (
    <div className="wx-grid">
      {stores.map((s) => (
        <StoreCard key={s.slug} store={s} />
      ))}
    </div>
  );
}

export function ProductCard({ product }: Readonly<{ product: ExplorerProduct }>) {
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
