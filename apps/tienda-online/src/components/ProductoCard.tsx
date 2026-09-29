import type { ProductoTienda } from '@otrarondamas/shared-types';

/**
 * Placeholder de foto — el catálogo real (4342 productos) no tiene
 * fotos cargadas todavía (el campo no existe en el modelo). El layout
 * reserva el espacio (aspect-ratio 1/1) para que agregar fotos reales
 * más adelante no obligue a rehacer la tarjeta, ver spec de diseño.
 */
function FotoPlaceholder() {
  return (
    <div
      style={{
        aspectRatio: '1 / 1',
        background: 'var(--surface-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width="34"
        height="34"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#c7c7c1"
        strokeWidth="1.3"
      >
        <path d="M5 3h14l-1.5 15.5a2 2 0 0 1-2 1.5H8.5a2 2 0 0 1-2-1.5L5 3z" />
        <path d="M9 3v4a3 3 0 0 0 6 0V3" />
      </svg>
    </div>
  );
}

export function ProductoCard({
  producto,
  onAgregar,
}: {
  producto: ProductoTienda;
  onAgregar: (producto: ProductoTienda) => void;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity: producto.disponible ? 1 : 0.55,
      }}
    >
      <div style={{ position: 'relative' }}>
        <FotoPlaceholder />
        {producto.descuentoPorcentaje ? (
          <div
            style={{
              position: 'absolute',
              top: 7,
              left: 7,
              background: 'var(--state-danger)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 5,
            }}
          >
            -{producto.descuentoPorcentaje}%
          </div>
        ) : null}
      </div>
      <div
        style={{
          padding: '9px 10px 11px',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          flex: 1,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            minHeight: 31,
          }}
        >
          {producto.nombre}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            ${producto.precio}
          </span>
          {producto.precioSinDescuento ? (
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-secondary)',
                textDecoration: 'line-through',
              }}
            >
              ${producto.precioSinDescuento}
            </span>
          ) : null}
        </div>
        {producto.disponible ? (
          <button
            type="button"
            onClick={() => onAgregar(producto)}
            style={{
              marginTop: 2,
              height: 30,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--brand-yellow)',
              color: 'var(--brand-black)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Agregar
          </button>
        ) : (
          <div
            style={{
              marginTop: 2,
              height: 30,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-secondary)',
              color: 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Sin stock
          </div>
        )}
      </div>
    </div>
  );
}
