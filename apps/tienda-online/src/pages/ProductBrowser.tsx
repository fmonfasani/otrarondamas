import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ProductCard } from '../components/ProductCard';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useToast } from '../hooks/useToast';

interface Product {
  id: string;
  name: string;
  image?: string | null;
  price: number;
  discountPrice?: number;
  rating?: number;
  reviewCount?: number;
  stock: number;
}

export interface ProductBrowserProps {
  products?: Product[];
  onAddToCart?: (product: Product) => void;
}

/**
 * ProductBrowser Page: Responsive grid of product cards with search and filters
 *
 * Features:
 * - Responsive grid (xs: 2 cols, sm: 2 cols, md: 3 cols, lg: 4 cols, xl: 5 cols)
 * - Search input with product filtering
 * - useMediaQuery hook for responsive layout
 * - useToast hook for "Added to cart" notifications
 * - Accessibility WCAG 2.1 AA compliant
 * - Design tokens from P5-1
 *
 * Responsive Breakpoints:
 * - xs (320px): 2 columns
 * - sm (640px): 2 columns
 * - md (1024px): 3 columns
 * - lg (1280px): 4 columns
 * - xl (1536px): 5 columns
 */
export function ProductBrowser({
  products = mockProducts,
  onAddToCart,
}: ProductBrowserProps): ReactNode {
  const [searchQuery, setSearchQuery] = useState('');
  const { toasts, addToast } = useToast();

  // Media queries for responsive grid
  const isXs = useMediaQuery('(max-width: 320px)');
  const isSm = useMediaQuery('(max-width: 640px)');
  const isMd = useMediaQuery('(max-width: 1024px)');
  const isLg = useMediaQuery('(max-width: 1280px)');

  // Determine grid columns based on breakpoints
  const gridColumns = useMemo(() => {
    if (isXs) return 2;
    if (isSm) return 2;
    if (isMd) return 3;
    if (isLg) return 4;
    return 5;
  }, [isXs, isSm, isMd, isLg]);

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) || product.id.toLowerCase().includes(query),
    );
  }, [products, searchQuery]);

  const handleAddToCart = (product: Product) => {
    onAddToCart?.(product);
    addToast({
      message: `Added "${product.name}" to cart`,
      type: 'success',
      duration: 2000,
    });
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
      {/* Header Section */}
      <div
        style={{
          padding: '16px 16px',
          background: '#fff',
          borderBottom: '1px solid var(--border-default)',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 16px 0',
            }}
          >
            Our Products
          </h1>

          {/* Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search products"
                style={{
                  width: '100%',
                  height: 40,
                  paddingLeft: 12,
                  paddingRight: 12,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  backgroundColor: '#fff',
                }}
              />
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-secondary)"
                strokeWidth="2"
                style={{
                  position: 'absolute',
                  right: 12,
                  pointerEvents: 'none',
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>

            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              style={{
                height: 40,
                paddingLeft: 12,
                paddingRight: 12,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease-out',
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div
        style={{
          flex: 1,
          padding: '0 16px 20px 16px',
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
          }}
        >
          {/* Results Info */}
          <div
            style={{
              marginBottom: 20,
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                margin: 0,
              }}
            >
              Showing {filteredProducts.length} of {products.length} products
            </p>
          </div>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div
              role="region"
              aria-label="Product grid"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
                gap: 12,
              }}
            >
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={() => handleAddToCart(product)}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 300,
                padding: 20,
              }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-secondary)"
                strokeWidth="1.5"
                style={{
                  marginBottom: 12,
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 8px 0',
                }}
              >
                No products found
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  margin: 0,
                }}
              >
                Try a different search term
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Toast Container */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 1000,
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontWeight: 500,
              color: '#fff',
              background:
                toast.type === 'success'
                  ? 'var(--state-success)'
                  : toast.type === 'error'
                    ? 'var(--state-danger)'
                    : toast.type === 'warning'
                      ? 'var(--state-warning)'
                      : 'var(--text-primary)',
              animation: 'slideIn 0.3s ease-out',
              minWidth: 200,
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// Mock data for development
const mockProducts: Product[] = [
  {
    id: 'prod-001',
    name: 'Premium Wireless Headphones',
    price: 149.99,
    discountPrice: 99.99,
    rating: 4,
    reviewCount: 284,
    stock: 15,
  },
  {
    id: 'prod-002',
    name: 'Portable Phone Charger',
    price: 39.99,
    rating: 5,
    reviewCount: 512,
    stock: 45,
  },
  {
    id: 'prod-003',
    name: 'USB-C Cable (3 Pack)',
    price: 19.99,
    discountPrice: 12.99,
    rating: 4,
    reviewCount: 1204,
    stock: 0,
  },
  {
    id: 'prod-004',
    name: 'Laptop Stand',
    price: 59.99,
    rating: 4,
    reviewCount: 89,
    stock: 8,
  },
  {
    id: 'prod-005',
    name: 'Mechanical Keyboard',
    price: 129.99,
    rating: 5,
    reviewCount: 342,
    stock: 12,
  },
  {
    id: 'prod-006',
    name: 'Wireless Mouse',
    price: 49.99,
    discountPrice: 34.99,
    rating: 4,
    reviewCount: 651,
    stock: 32,
  },
  {
    id: 'prod-007',
    name: 'Monitor Arm Mount',
    price: 79.99,
    rating: 3,
    reviewCount: 145,
    stock: 20,
  },
  {
    id: 'prod-008',
    name: 'Desk Lamp LED',
    price: 44.99,
    rating: 4,
    reviewCount: 267,
    stock: 25,
  },
  {
    id: 'prod-009',
    name: 'Webcam 1080p',
    price: 89.99,
    discountPrice: 69.99,
    rating: 5,
    reviewCount: 428,
    stock: 18,
  },
  {
    id: 'prod-010',
    name: 'Microphone USB',
    price: 99.99,
    rating: 5,
    reviewCount: 334,
    stock: 10,
  },
];
