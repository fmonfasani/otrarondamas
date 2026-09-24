import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { useAuth } from '../features/auth/AuthContext';

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
  const { cliente } = useAuth();

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Icono de cuenta: si está logueado va a /mi-cuenta, si no a /login */}
          <Link
            to={cliente ? '/mi-cuenta' : '/login'}
            aria-label={cliente ? `Mi cuenta (${cliente.nombre})` : 'Iniciar sesión'}
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              borderRadius: 10,
              background: cliente ? 'rgba(255,209,0,0.18)' : 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={cliente ? 'var(--brand-yellow)' : 'var(--brand-white)'}
              strokeWidth="1.8"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {/* Dot verde si hay sesión activa */}
            {cliente && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 6,
                  right: 6,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#22c55e',
                  border: '1.5px solid var(--brand-black)',
                }}
              />
            )}
          </Link>
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
