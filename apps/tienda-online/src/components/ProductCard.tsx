import type { ReactNode } from 'react';

export interface ProductCardProps {
  product: {
    id: string;
    name: string;
    image?: string | null;
    price: number;
    discountPrice?: number;
    rating?: number;
    reviewCount?: number;
    stock: number;
  };
  onClick?: () => void;
  onAddToCart?: () => void;
}

/**
 * ProductCard: Renders a product card with image, price, rating, and cart button.
 *
 * Features:
 * - Responsive image with 1:1 aspect ratio
 * - Price with optional discount display
 * - Stock badge (visible when stock < 5)
 * - Rating with review count
 * - Add to cart button with loading/disabled states
 * - Hover effects on image (scale and shadow)
 */
export function ProductCard({
  product,
  onClick,
  onAddToCart,
}: ProductCardProps): ReactNode {
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const lowStock = product.stock < 5 && product.stock > 0;
  const outOfStock = product.stock === 0;

  return (
    <div
      data-testid="product-card"
      style={{
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity: outOfStock ? 0.6 : 1,
      }}
    >
      {/* Image Container with Hover Effect */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--surface-secondary)',
          cursor: onClick ? 'pointer' : 'default',
        }}
        onClick={onClick}
      >
        <div
          style={{
            aspectRatio: '1 / 1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--surface-secondary)',
            transition: 'transform 0.3s ease-out',
          }}
          className="product-image-container"
        >
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <svg
              width="48"
              height="48"
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

        {/* Discount Badge */}
        {hasDiscount && (
          <div
            data-testid="discount-badge"
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: 'var(--state-danger)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: 6,
              zIndex: 1,
            }}
          >
            Sale
          </div>
        )}

        {/* Stock Badge */}
        {lowStock && !outOfStock && (
          <div
            data-testid="stock-badge"
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              background: 'var(--state-warning)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: 6,
              zIndex: 1,
            }}
          >
            Low Stock
          </div>
        )}
      </div>

      {/* Content Container */}
      <div
        style={{
          padding: '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flex: 1,
        }}
      >
        {/* Product Name */}
        <h3
          data-testid="product-name"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.4,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: 28,
          }}
        >
          {product.name}
        </h3>

        {/* Rating */}
        {product.rating !== undefined && (
          <div
            data-testid="rating"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', gap: 2 }}>
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  style={{
                    color:
                      i < Math.floor(product.rating || 0)
                        ? 'var(--state-success)'
                        : 'var(--text-secondary)',
                    fontSize: 14,
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            {product.reviewCount !== undefined && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                }}
              >
                ({product.reviewCount})
              </span>
            )}
          </div>
        )}

        {/* Price Section */}
        <div
          data-testid="price-section"
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          <span
            data-testid="current-price"
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            ${hasDiscount ? product.discountPrice : product.price}
          </span>
          {hasDiscount && (
            <span
              data-testid="original-price"
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                textDecoration: 'line-through',
              }}
            >
              ${product.price}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        {!outOfStock ? (
          <button
            data-testid="add-to-cart-button"
            type="button"
            onClick={onAddToCart}
            style={{
              marginTop: 'auto',
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--brand-yellow)',
              color: 'var(--brand-black)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
            }}
          >
            Add to Cart
          </button>
        ) : (
          <div
            data-testid="out-of-stock"
            style={{
              marginTop: 'auto',
              height: 32,
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
            Out of Stock
          </div>
        )}
      </div>
    </div>
  );
}
