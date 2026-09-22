import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProductoTienda } from '@otrarondamas/shared-types';
import { api, ApiError } from '../../lib/api';
import { useCarritoContext } from '../carrito/CarritoContext';

/**
 * Catálogo público (RF-06, Fase 2). Sin login — cualquier visitante ve
 * esto. Búsqueda debounced, mismo patrón que InventarioPage.tsx de
 * pos-admin, adaptado a esta app.
 */
export function CatalogoPage() {
  const carrito = useCarritoContext();
  const [productos, setProductos] = useState<ProductoTienda[]>([]);
  const [search, setSearch] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setCargando(true);
      api
        .catalogo(search || undefined)
        .then((data) => {
          setProductos(data);
          setError(null);
        })
        .catch((err) =>
          setError(err instanceof ApiError ? err.message : 'No se pudo cargar el catálogo'),
        )
        .finally(() => setCargando(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  const cantidadEnCarrito = carrito.items.reduce((acc, i) => acc + i.cantidad, 0);

  return (
    <div>
      <header>
        <h1>Otra Roonda Más</h1>
        <Link to="/checkout">Carrito ({cantidadEnCarrito})</Link>
      </header>

      <input
        type="search"
        placeholder="Buscar productos…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <p role="alert">{error}</p>}
      {cargando && <p>Cargando…</p>}

      {!cargando && productos.length === 0 && !error && <p>No se encontraron productos.</p>}

      <ul>
        {productos.map((producto) => (
          <li key={producto.productoId}>
            <span>{producto.nombre}</span>
            {/* Fase 6: descuento único y global por producto — el
                precio ya viene con el descuento aplicado desde el
                backend, acá solo se muestra el precio original tachado
                cuando corresponde. */}
            {producto.precioSinDescuento ? (
              <span>
                <s>${producto.precioSinDescuento}</s> ${producto.precio} (
                {producto.descuentoPorcentaje}% off)
              </span>
            ) : (
              <span>${producto.precio}</span>
            )}
            {producto.disponible ? (
              <button type="button" onClick={() => carrito.agregar(producto)}>
                Agregar
              </button>
            ) : (
              <span>Sin stock</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
