import { useEffect, useState } from 'react';
import type { Cliente } from '@otrarondamas/shared-types';
import { api } from '../../lib/api';

interface Props {
  clienteSeleccionado: Cliente | null;
  onSeleccionar: (cliente: Cliente | null) => void;
}

/**
 * Fase 2 del roadmap de Fidelización: identificar (opcionalmente) al
 * comprador en el POS presencial, para que la venta cuente en su
 * historial (Fase 3, niveles de fidelidad). Vender "al mostrador" sin
 * cliente sigue funcionando igual que hoy — este selector nunca es
 * obligatorio.
 *
 * Mismo patrón de búsqueda que BuscadorProductos.tsx (debounce simple
 * contra GET /clientes?search=...). A diferencia de agregar un
 * producto al carrito (acción repetible), acá solo puede haber un
 * cliente elegido a la vez — seleccionar uno reemplaza al anterior, y
 * hay un botón para quitarlo y volver a "sin cliente".
 */
export function BuscadorClientes({ clienteSeleccionado, onSeleccionar }: Props) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Cliente[]>([]);
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
        .listarClientes(query.trim())
        .then(setResultados)
        .catch(() => setError('No se pudo buscar clientes'))
        .finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, consultaValida]);

  // Sin esto, al borrar el texto de búsqueda quedarían visibles los
  // resultados de la búsqueda anterior con un query vacío (mismo
  // patrón que BuscadorProductos.tsx).
  const resultadosVisibles = consultaValida ? resultados : [];

  function seleccionar(cliente: Cliente) {
    onSeleccionar(cliente);
    setQuery('');
  }

  if (clienteSeleccionado) {
    return (
      <div>
        <span>
          Cliente: {clienteSeleccionado.nombre}
          {clienteSeleccionado.email ? ` (${clienteSeleccionado.email})` : ''}
        </span>
        <button type="button" onClick={() => onSeleccionar(null)}>
          Quitar cliente
        </button>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="buscador-cliente">Cliente (opcional)</label>
      <input
        id="buscador-cliente"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre o email — dejar vacío para vender al mostrador"
      />
      {buscando && <p>Buscando…</p>}
      {error && <p role="alert">{error}</p>}
      {resultadosVisibles.length > 0 && (
        <ul>
          {resultadosVisibles.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => seleccionar(c)}>
                {c.nombre}
                {c.email ? ` — ${c.email}` : ''}
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
