import type { ReactNode } from 'react';

export interface CartItemProps {
  item: {
    id: string;
    name: string;
    price: number;
    image?: string | null;
    quantity: number;
    maxQuantity: number;
  };
  onUpdate?: (quantity: number) => void;
  onRemove?: () => void;
}

/**
 * CartItem: Renders a cart item with quantity controls and remove button.
 *
 * Features:
 * - Thumbnail image (64x64)
 * - Product name and unit price
 * - Quantity stepper with increment/decrement
 * - Disabled states (qty=1 for decrement, qty=maxQuantity for increment)
 * - Remove from cart button
 * - Total price calculation (quantity * price)
 */
export function CartItem({ item, onUpdate, onRemove }: CartItemProps): ReactNode {
  const canDecrement = item.quantity > 1;
  const canIncrement = item.quantity < item.maxQuantity;
  const totalPrice = item.quantity * item.price;

  const handleDecrement = () => {
    if (canDecrement && onUpdate) {
      onUpdate(item.quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (canIncrement && onUpdate) {
      onUpdate(item.quantity + 1);
    }
  };

  return (
    <div
      data-testid="cart-item"
      style={{
        display: 'flex',
        gap: 12,
        padding: 12,
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        alignItems: 'flex-start',
      }}
    >
      {/* Thumbnail Image */}
      <div
        style={{
          flexShrink: 0,
          width: 64,
          height: 64,
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          backgroundColor: 'var(--surface-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            data-testid="cart-item-image"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c7c7c1"
            strokeWidth="1.3"
            data-testid="placeholder-image"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <circle cx="8" cy="10" r="2" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Name and Unit Price */}
        <div>
          <h3
            data-testid="item-name"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {item.name}
          </h3>
          <span
            data-testid="item-price"
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            ${item.price} each
          </span>
        </div>

        {/* Quantity Stepper and Remove */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* Quantity Stepper */}
          <div
            data-testid="quantity-stepper"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 4px',
            }}
          >
            <button
              type="button"
              data-testid="decrement-button"
              onClick={handleDecrement}
              disabled={!canDecrement}
              style={{
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                color: canDecrement ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: canDecrement ? 'pointer' : 'not-allowed',
                opacity: canDecrement ? 1 : 0.5,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              −
            </button>

            <span
              data-testid="quantity-value"
              style={{
                width: 24,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {item.quantity}
            </span>

            <button
              type="button"
              data-testid="increment-button"
              onClick={handleIncrement}
              disabled={!canIncrement}
              style={{
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                color: canIncrement ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: canIncrement ? 'pointer' : 'not-allowed',
                opacity: canIncrement ? 1 : 0.5,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              +
            </button>
          </div>

          {/* Remove Button */}
          <button
            type="button"
            data-testid="remove-button"
            onClick={onRemove}
            style={{
              marginLeft: 'auto',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--state-danger)',
              background: 'transparent',
              color: 'var(--state-danger)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
            }}
          >
            Remove
          </button>
        </div>
      </div>

      {/* Total Price */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
        }}
      >
        <span
          data-testid="total-price"
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          ${totalPrice.toFixed(2)}
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-secondary)',
          }}
        >
          {item.quantity}x
        </span>
      </div>
    </div>
  );
}
