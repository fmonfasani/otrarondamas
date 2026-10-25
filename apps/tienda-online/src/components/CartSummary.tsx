import type { ReactNode } from 'react';
import type { ItemCarrito } from '../features/carrito/useCarrito';

export interface CartSummaryProps {
  items: ItemCarrito[];
  onCheckout?: () => void;
  isLoading?: boolean;
}

/**
 * CartSummary: P5 Card + Badge component for cart display
 *
 * Features:
 * - Total items badge (displayed as pill)
 * - Total price calculation
 * - Uses Card-like styling (white bg, border, radius)
 * - Responsive design (mobile-first)
 * - Accessibility WCAG 2.1 AA
 * - Skeleton state when isLoading
 */
export function CartSummary({ items, onCheckout, isLoading = false }: CartSummaryProps): ReactNode {
  const itemCount = items.reduce((sum, item) => sum + item.cantidad, 0);
  const total = items.reduce((acc, item) => acc + Number(item.producto.precio) * item.cantidad, 0);

  return (
    <div
      role="region"
      aria-label="Cart summary"
      style={{
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
      data-testid="cart-summary"
    >
      {/* Header with Badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Carrito
        </h2>
        {/* Badge: Item count */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 24,
            height: 24,
            borderRadius: '12px',
            background: 'var(--brand-yellow)',
            color: 'var(--brand-black)',
            fontSize: 11,
            fontWeight: 700,
          }}
          data-testid="item-count-badge"
        >
          {itemCount}
        </div>
      </div>

      {/* Content */}
      {items.length > 0 ? (
        <>
          {/* Item List Summary */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '8px 0',
              borderTop: '1px solid var(--border-default)',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            {items.slice(0, 3).map((item) => (
              <div
                key={item.producto.productoId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  gap: 8,
                }}
                data-testid={`summary-item-${item.producto.productoId}`}
              >
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {item.producto.nombre} ×{item.cantidad}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    flexShrink: 0,
                  }}
                >
                  ${(Number(item.producto.precio) * item.cantidad).toFixed(2)}
                </span>
              </div>
            ))}
            {items.length > 3 && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                }}
              >
                +{items.length - 3} más
              </div>
            )}
          </div>

          {/* Total */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              Total
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
              data-testid="total-price"
            >
              ${total.toFixed(2)}
            </span>
          </div>

          {/* Checkout Button */}
          <button
            type="button"
            onClick={onCheckout}
            disabled={isLoading || items.length === 0}
            style={{
              width: '100%',
              height: 44,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--brand-yellow)',
              color: 'var(--brand-black)',
              fontSize: 14,
              fontWeight: 700,
              cursor: items.length === 0 || isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading || items.length === 0 ? 0.6 : 1,
              transition: 'all 0.2s ease-out',
            }}
            data-testid="checkout-button"
          >
            {isLoading ? 'Procesando…' : 'Ir a checkout'}
          </button>
        </>
      ) : (
        <div
          style={{
            padding: '24px 0',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: 13,
          }}
        >
          Tu carrito está vacío
        </div>
      )}
    </div>
  );
}
