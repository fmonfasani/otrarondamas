import type { ReactNode } from 'react';
import { storeMark } from '~/utils/store';

/** Header of a Business store: its name, catalog, messages, the account link and (optionally) the cart. */
export function StoreHeader({
  store,
  customerName,
  children,
}: Readonly<{
  store: { nombre: string; slug: string };
  customerName: string | null;
  children?: ReactNode;
}>) {
  const home = `/tienda/${store.slug}`;
  return (
    <header className="store-header">
      <a className="brand" href={home} aria-label={`${store.nombre}, inicio`}>
        <span className="brand-mark">{storeMark(store.nombre)}</span>
        <span className="store-name">{store.nombre}</span>
      </a>
      <nav className="header-actions" aria-label="Navegación principal">
        <a href={`${home}#catalogo`} className="hide-mobile">Catálogo</a>
        <a href={`${home}/chat`} className="hide-mobile">Mensajes</a>
        <a href={`${home}/cuenta`} className="account-link">
          {customerName ? `Hola, ${customerName.split(' ')[0]}` : 'Ingresar'}
        </a>
        {children}
      </nav>
    </header>
  );
}
