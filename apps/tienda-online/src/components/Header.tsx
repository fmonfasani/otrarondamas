import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';

const HEADER_STYLE = {
  flexShrink: 0,
  background: 'var(--brand-black)',
  padding: '14px 16px 12px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 10,
};

/**
 * Header del catálogo (spec de diseño): logo + wordmark a la izquierda,
 * acceso al carrito a la derecha, buscador debajo. `children` es el
 * buscador (o cualquier control) — se pasa como children en vez de
 * fijarlo acá porque CatalogoPage necesita controlar su propio estado
 * de búsqueda.
 */
export function Header({
  cantidadCarrito,
  children,
}: {
  cantidadCarrito: number;
  children?: ReactNode;
}) {
  return (
    <div style={HEADER_STYLE}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo size={34} />
          <div style={{ lineHeight: 1.05 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--brand-yellow)',
                letterSpacing: 0.2,
              }}
            >
              OTRA RONDA
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--brand-white)',
                letterSpacing: 0.2,
                marginTop: -2,
              }}
            >
              MAS
            </div>
          </div>
        </div>
        <Link
          to="/checkout"
          aria-label="Ver carrito"
          style={{
            position: 'relative',
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--brand-white)"
            strokeWidth="1.8"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
          </svg>
          {cantidadCarrito > 0 && (
            <div
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: 'var(--brand-yellow)',
                color: 'var(--brand-black)',
                fontSize: 10,
                fontWeight: 700,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
              }}
            >
              {cantidadCarrito}
            </div>
          )}
        </Link>
      </div>
      {children}
    </div>
  );
}

/**
 * Header simple para Producto/Checkout/Seguimiento: solo botón "volver"
 * + título, sin buscador ni carrito (mismo fondo/altura que el header
 * del catálogo para que la transición entre pantallas no salte).
 */
export function HeaderSimple({ volverA, titulo }: { volverA: string; titulo: string }) {
  return (
    <div
      style={{
        flexShrink: 0,
        background: 'var(--brand-black)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Link
        to={volverA}
        aria-label="Volver"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--brand-white)"
          strokeWidth="2"
        >
          <path d="M15 19l-7-7 7-7" />
        </svg>
      </Link>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-white)' }}>{titulo}</div>
    </div>
  );
}
