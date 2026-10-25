import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { CartItem } from '../components/CartItem';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface CartItemData {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  quantity: number;
  maxQuantity: number;
}

export interface CartPageProps {
  items?: CartItemData[];
  onUpdateItem?: (itemId: string, quantity: number) => void;
  onRemoveItem?: (itemId: string) => void;
  onCheckout?: () => void;
  taxRate?: number;
  shippingCost?: number;
}

/**
 * CartPage: Displays cart items with quantity controls and checkout flow
 *
 * Features:
 * - List of CartItem components with quantity controls
 * - Total price calculation with optional tax and shipping
 * - Responsive layout (mobile vs desktop)
 * - useMediaQuery hook for conditional rendering
 * - Empty state with helpful messaging
 * - Accessibility WCAG 2.1 AA compliant
 * - Design tokens from P5-1
 *
 * Layout:
 * - Mobile: Single column, sticky summary at bottom
 * - Desktop: Items on left, sticky summary on right (md+)
 */
export function CartPage({
  items = mockCartItems,
  onUpdateItem,
  onRemoveItem,
  onCheckout,
  taxRate = 0.1,
  shippingCost = 0,
}: CartPageProps): ReactNode {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  // Media queries for responsive layout
  const isMd = useMediaQuery('(max-width: 1024px)');

  // Calculate totals
  const { subtotal, discountAmount, taxAmount, total } = useMemo(() => {
    const subtotalCalc = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discountCalc = 0;

    // Simple promo logic: 10% off with code "SAVE10"
    if (appliedPromo === 'SAVE10') {
      discountCalc = subtotalCalc * 0.1;
    }

    const taxCalc = (subtotalCalc - discountCalc) * taxRate;
    const totalCalc = subtotalCalc - discountCalc + taxCalc + shippingCost;

    return {
      subtotal: subtotalCalc,
      discountAmount: discountCalc,
      taxAmount: taxCalc,
      total: totalCalc,
    };
  }, [items, appliedPromo, taxRate, shippingCost]);

  const handleApplyPromo = () => {
    if (promoCode === 'SAVE10') {
      setAppliedPromo('SAVE10');
      setPromoCode('');
    } else {
      // Invalid promo code
      setPromoCode('');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
  };

  return (
    <div
      role="main"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-default)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          background: '#fff',
          borderBottom: '1px solid var(--border-default)',
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Shopping Cart
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            margin: '4px 0 0 0',
          }}
        >
          {items.length} item{items.length !== 1 ? 's' : ''} in your cart
        </p>
      </div>

      {/* Main Content */}
      {items.length > 0 ? (
        <div
          style={{
            flex: 1,
            padding: '0 16px 20px 16px',
            display: 'grid',
            gridTemplateColumns: isMd ? '1fr' : '1fr 320px',
            gap: 20,
            maxWidth: 1400,
            margin: '0 auto',
            width: '100%',
          }}
        >
          {/* Cart Items Section */}
          <div
            role="region"
            aria-label="Cart items"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdate={(quantity) => onUpdateItem?.(item.id, quantity)}
                onRemove={() => onRemoveItem?.(item.id)}
              />
            ))}
          </div>

          {/* Summary Card (Sticky on Desktop, Bottom on Mobile) */}
          <div
            role="region"
            aria-label="Order summary"
            style={{
              background: '#fff',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              padding: 16,
              height: 'fit-content',
              position: isMd ? 'relative' : 'sticky',
              top: isMd ? 'auto' : 100,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 16px 0',
              }}
            >
              Order Summary
            </h2>

            {/* Summary Items */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginBottom: 16,
                paddingBottom: 16,
                borderBottom: '1px solid var(--border-default)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              {discountAmount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 14,
                    color: 'var(--state-success)',
                  }}
                >
                  <span>Discount ({appliedPromo})</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}

              {shippingCost > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>Shipping</span>
                  <span>${shippingCost.toFixed(2)}</span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Total */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 16,
              }}
            >
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            {/* Promo Code Section */}
            <div
              style={{
                marginBottom: 16,
                paddingBottom: 16,
                borderBottom: '1px solid var(--border-default)',
              }}
            >
              {appliedPromo ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-secondary)',
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--state-success)',
                    }}
                  >
                    {appliedPromo} Applied
                  </span>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    aria-label="Remove promo code"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                  }}
                >
                  <input
                    type="text"
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    aria-label="Promo code input"
                    style={{
                      flex: 1,
                      height: 32,
                      paddingLeft: 8,
                      paddingRight: 8,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-default)',
                      fontSize: 12,
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={!promoCode}
                    aria-label="Apply promo code"
                    style={{
                      height: 32,
                      paddingLeft: 12,
                      paddingRight: 12,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-default)',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: promoCode ? 'pointer' : 'not-allowed',
                      opacity: promoCode ? 1 : 0.5,
                      transition: 'all 0.2s ease-out',
                    }}
                  >
                    Apply
                  </button>
                </div>
              )}
              <p
                style={{
                  fontSize: 10,
                  color: 'var(--text-secondary)',
                  margin: '6px 0 0 0',
                }}
              >
                Try "SAVE10" for 10% off
              </p>
            </div>

            {/* Checkout Button */}
            <button
              type="button"
              onClick={onCheckout}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--brand-yellow)',
                color: 'var(--brand-black)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease-out',
                marginBottom: 8,
              }}
            >
              Proceed to Checkout
            </button>

            {/* Continue Shopping Link */}
            <button
              type="button"
              onClick={() => window.history.back()}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease-out',
              }}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-secondary)"
            strokeWidth="1.5"
            style={{
              marginBottom: 16,
              opacity: 0.5,
            }}
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 8px 0',
            }}
          >
            Your cart is empty
          </h2>
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              margin: '0 0 24px 0',
              textAlign: 'center',
            }}
          >
            Add some products to get started
          </p>
          <button
            type="button"
            onClick={() => window.history.back()}
            style={{
              height: 40,
              paddingLeft: 24,
              paddingRight: 24,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--brand-yellow)',
              color: 'var(--brand-black)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Continue Shopping
          </button>
        </div>
      )}
    </div>
  );
}

// Mock data for development
const mockCartItems: CartItemData[] = [
  {
    id: 'prod-001',
    name: 'Premium Wireless Headphones',
    price: 99.99,
    quantity: 1,
    maxQuantity: 5,
    image: undefined,
  },
  {
    id: 'prod-005',
    name: 'Mechanical Keyboard',
    price: 129.99,
    quantity: 1,
    maxQuantity: 3,
    image: undefined,
  },
  {
    id: 'prod-009',
    name: 'Webcam 1080p',
    price: 69.99,
    quantity: 2,
    maxQuantity: 4,
    image: undefined,
  },
];
