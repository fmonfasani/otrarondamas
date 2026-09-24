import { useEffect, useMemo, useState } from 'react';
import type { ProductoTienda, Familia, Subfamilia } from '@otrarondamas/shared-types';
import { api, ApiError } from '../../lib/api';
import { useCarritoContext } from '../carrito/CarritoContext';
import { Header } from '../../components/Header';
import { FooterOperativo } from '../../components/FooterOperativo';
import { ProductoCard } from '../../components/ProductoCard';

// El branding de marca (logo, tagline "Bebidas y mucho más para tu
// negocio") está orientado a bebidas, aunque el catálogo real es
// polirubro completo — decisión confirmada: Bebidas se muestra
// primero entre las Familias, el resto del catálogo queda parejo
// después (spec de diseño de Tienda Online). El árbol real separa
// "Bebidas con Alcohol" y "Bebidas sin Alcohol" (no hay una única
// Familia "Bebidas") — las dos cuentan como destacadas, sin Alcohol
// primero por ser la de mayor volumen de ventas de kiosco.
const FAMILIAS_DESTACADAS = ['Bebidas sin Alcohol', 'Bebidas con Alcohol'];

function ordenarFamilias(familias: Familia[]): Familia[] {
  const destacadas = FAMILIAS_DESTACADAS.map((nombre) =>
    familias.find((f) => f.nombre === nombre),
  ).filter((f): f is Familia => !!f);
  const resto = familias.filter((f) => !FAMILIAS_DESTACADAS.includes(f.nombre));
  return [...destacadas, ...resto];
}

/**
 * Catálogo público (RF-06, Fase 2 + spec de diseño). Sin login —
 * cualquier visitante ve esto. Buscador de texto + chips de Familia/
 * Subfamilia para navegar sin saber el nombre exacto de lo que se
 * busca (antes solo existía el buscador).
 */
export function CatalogoPage() {
  const carrito = useCarritoContext();
  const [productos, setProductos] = useState<ProductoTienda[]>([]);
  const [search, setSearch] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [familias, setFamilias] = useState<Familia[]>([]);
  const [subfamilias, setSubfamilias] = useState<Subfamilia[]>([]);
  const [familiaId, setFamiliaId] = useState<string | null>(null);
  const [subfamiliaId, setSubfamiliaId] = useState<string | null>(null);

  // La jerarquía (Familias/Subfamilias) es chica y no cambia mientras
  // se navega — se trae una sola vez al entrar, no en cada filtro.
  useEffect(() => {
    api
      .jerarquia()
      .then((data) => {
        // Bebidas primero en el ORDEN de los chips (coherente con el
        // branding), pero sin preseleccionar ninguna como filtro
        // activo al entrar — hay dos Familias de bebidas (con y sin
        // alcohol), preseleccionar una sola ocultaría la otra mitad
        // del catálogo de bebidas sin que el visitante lo pidiera. El
        // catálogo abre en "Todo".
        setFamilias(ordenarFamilias(data.familias));
        setSubfamilias(data.subfamilias);
      })
      .catch(() => {
        // Sin jerarquía, el catálogo sigue funcionando solo con
        // buscador de texto — no se bloquea toda la página por esto.
      });
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setCargando(true);
      api
        .catalogo(search || undefined, familiaId ?? undefined, subfamiliaId ?? undefined)
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
  }, [search, familiaId, subfamiliaId]);

  const subfamiliasDeLaFamilia = useMemo(
    () => (familiaId ? subfamilias.filter((s) => s.familiaId === familiaId) : []),
    [subfamilias, familiaId],
  );

  function elegirFamilia(id: string | null) {
    setFamiliaId(id);
    setSubfamiliaId(null); // cambiar de Familia limpia la Subfamilia elegida
  }

  const cantidadEnCarrito = carrito.items.reduce((acc, i) => acc + i.cantidad, 0);

  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        height: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-bg)',
        position: 'relative',
      }}
    >
      <Header cantidadCarrito={cantidadEnCarrito}>
        <div style={{ position: 'relative' }}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8a8a86"
            strokeWidth="2"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            aria-label="Buscar productos"
            placeholder="Buscar gaseosa, aceite, pilas…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: 38,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: '#ffffff',
              padding: '0 14px 0 34px',
              fontSize: 13,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
      </Header>

      {/* Chips de Familia — Bebidas primero */}
      {familias.length > 0 && (
        <div style={{ flexShrink: 0, background: 'var(--brand-black)', padding: '0 16px 12px' }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            <ChipFamilia
              label="Todo"
              activo={familiaId === null}
              onClick={() => elegirFamilia(null)}
            />
            {familias.map((f) => (
              <ChipFamilia
                key={f.id}
                label={f.nombre}
                activo={familiaId === f.id}
                onClick={() => elegirFamilia(f.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 90px' }}>
        {subfamiliasDeLaFamilia.length > 0 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12 }}>
            {subfamiliasDeLaFamilia.map((s) => (
              <ChipSubfamilia
                key={s.id}
                label={s.nombre}
                activo={subfamiliaId === s.id}
                onClick={() => setSubfamiliaId(subfamiliaId === s.id ? null : s.id)}
              />
            ))}
          </div>
        )}

        {error && (
          <p role="alert" style={{ color: 'var(--state-danger)', fontSize: 13 }}>
            {error}
          </p>
        )}
        {cargando && <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Cargando…</p>}
        {!cargando && productos.length === 0 && !error && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            No se encontraron productos.
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {productos.map((producto) => (
            <ProductoCard
              key={producto.productoId}
              producto={producto}
              onAgregar={carrito.agregar}
            />
          ))}
        </div>
      </div>

      <FooterOperativo />
    </div>
  );
}

function ChipFamilia({
  label,
  activo,
  onClick,
}: {
  label: string;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '7px 14px',
        borderRadius: 999,
        border: 'none',
        background: activo ? 'var(--brand-yellow)' : 'rgba(255,255,255,0.1)',
        color: activo ? 'var(--brand-black)' : 'var(--brand-white)',
        fontSize: 12,
        fontWeight: activo ? 700 : 600,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function ChipSubfamilia({
  label,
  activo,
  onClick,
}: {
  label: string;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '5px 11px',
        borderRadius: 999,
        border: activo ? '1px solid var(--brand-black)' : '1px solid var(--border-default)',
        background: activo ? 'var(--brand-black)' : '#fff',
        fontSize: 11,
        fontWeight: 600,
        color: activo ? 'var(--brand-white)' : 'var(--text-secondary)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}
