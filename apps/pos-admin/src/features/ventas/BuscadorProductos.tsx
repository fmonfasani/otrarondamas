import { useEffect, useState } from 'react';
import type { Producto } from '@otrarondamas/shared-types';
import { api } from '../../lib/api';

interface Props {
  onSeleccionar: (producto: Producto) => void;
}

/**
 * Búsqueda contra GET /catalogo/productos?search=... (backend limita a
 * 50 resultados — ver catalogo.controller.ts). Con debounce simple para
 * no disparar un request por cada tecla.
 */
export function BuscadorProductos({ onSeleccionar }: Props) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        .then(setResultados)
        .catch(() => setError('No se pudo buscar productos'))
        .finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, consultaValida]);

  // Sin esto, al borrar el texto de búsqueda los resultados de la
  // búsqueda anterior quedarían visibles con un query vacío.
  const resultadosVisibles = consultaValida ? resultados : [];

  return (
    <div>
      {/* TODO: diseño visual pendiente */}
      <label htmlFor="buscador-producto">Buscar producto (nombre o código)</label>
      <input
        id="buscador-producto"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ej: coca cola, o código 012132"
      />
      {buscando && <p>Buscando…</p>}
      {error && <p role="alert">{error}</p>}
      {resultadosVisibles.length > 0 && (
        <ul>
          {resultadosVisibles.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onSeleccionar(p)}>
                {p.nombre} — ${p.precioMinorista} ({p.codigoInterno})
              </button>
            </li>
          ))}
        </ul>
      )}
      {consultaValida && !buscando && resultadosVisibles.length === 0 && !error && (
        <p>Sin resultados para &quot;{query}&quot;</p>
      )}
    </div>
  );
}
