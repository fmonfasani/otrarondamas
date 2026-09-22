import { useEffect, useState } from 'react';
import type { Producto } from '@otrarondamas/shared-types';
import { api, ApiError } from '../../lib/api';

/**
 * Fase 6 de Tienda Online (RF-06/RF-04): edición mínima del % de
 * descuento por producto — no es un CRUD de catálogo completo (eso es
 * otro alcance), solo el campo específico de esta fase. Reusa la misma
 * búsqueda que ya existe para armar una venta (BuscadorProductos),
 * mismo patrón de debounce.
 *
 * El descuento afecta directamente lo que ve/paga un comprador en la
 * tienda pública (tienda.service.ts) — no toca precioMinorista ni
 * ningún otro campo, el backend rechaza con 403 si falta
 * productos.gestionar.
 */
export function PreciosPage() {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descuentoPorId, setDescuentoPorId] = useState<Record<string, string>>({});
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [errorPorId, setErrorPorId] = useState<Record<string, string>>({});
  const [guardadoPorId, setGuardadoPorId] = useState<Record<string, boolean>>({});

  const consultaValida = query.trim().length >= 2;

  useEffect(() => {
    if (!consultaValida) {
      return;
    }
    const timeout = setTimeout(() => {
      setBuscando(true);
      setError(null);
      api
        .buscarProductos(query.trim())
        .then((productos) => {
          setResultados(productos);
          setDescuentoPorId((prev) => {
            const siguiente = { ...prev };
            for (const p of productos) {
              if (!(p.id in siguiente)) {
                siguiente[p.id] = p.descuentoPorcentaje ?? '';
              }
            }
            return siguiente;
          });
        })
        .catch(() => setError('No se pudo buscar productos'))
        .finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, consultaValida]);

  async function guardarDescuento(producto: Producto) {
    setGuardandoId(producto.id);
    setErrorPorId((prev) => ({ ...prev, [producto.id]: '' }));
    setGuardadoPorId((prev) => ({ ...prev, [producto.id]: false }));
    try {
      const valorTexto = descuentoPorId[producto.id]?.trim() ?? '';
      // Vacío = sin descuento (equivale a mandar 0, ver
      // tienda.service.ts: descuentoPorcentaje null/0 se tratan igual).
      const descuentoPorcentaje = valorTexto === '' ? 0 : Number(valorTexto);
      const actualizado = await api.actualizarProducto(producto.id, { descuentoPorcentaje });
      setResultados((prev) => prev.map((p) => (p.id === producto.id ? actualizado : p)));
      setGuardadoPorId((prev) => ({ ...prev, [producto.id]: true }));
    } catch (err) {
      const mensaje = err instanceof ApiError ? err.message : 'No se pudo guardar el descuento';
      setErrorPorId((prev) => ({ ...prev, [producto.id]: mensaje }));
    } finally {
      setGuardandoId(null);
    }
  }

  return (
    <div>
      <h2>Precios y descuentos</h2>
      <p>
        Descuento único por producto, aplicado en la tienda online sobre el precio minorista. Sin
        descuento por cantidad ni por cliente todavía.
      </p>

      <label htmlFor="buscador-precios">Buscar producto (nombre o código)</label>
      <input
        id="buscador-precios"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ej: coca cola, o código 012132"
      />
      {buscando && <p>Buscando…</p>}
      {error && <p role="alert">{error}</p>}

      {/* Sin esto, al borrar el texto de búsqueda quedarían visibles
          los resultados de la búsqueda anterior con un query vacío
          (mismo patrón que BuscadorProductos.tsx). */}
      {consultaValida && resultados.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Precio minorista</th>
              <th>% descuento</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((producto) => (
              <tr key={producto.id}>
                <td>
                  {producto.nombre} ({producto.codigoInterno})
                </td>
                <td>${producto.precioMinorista}</td>
                <td>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={descuentoPorId[producto.id] ?? ''}
                    onChange={(e) =>
                      setDescuentoPorId((prev) => ({ ...prev, [producto.id]: e.target.value }))
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    disabled={guardandoId === producto.id}
                    onClick={() => guardarDescuento(producto)}
                  >
                    {guardandoId === producto.id ? 'Guardando…' : 'Guardar'}
                  </button>
                  {guardadoPorId[producto.id] && <span> Guardado</span>}
                  {errorPorId[producto.id] && <p role="alert">{errorPorId[producto.id]}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {consultaValida && !buscando && resultados.length === 0 && !error && (
        <p>Sin resultados para &quot;{query}&quot;</p>
      )}
    </div>
  );
}
