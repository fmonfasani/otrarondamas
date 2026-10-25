import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { StoreCard } from '../components/StoreCard';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface Store {
  id: string;
  name: string;
  location: string;
  image?: string | null;
  rating?: number;
  reviewCount?: number;
  distance?: number;
}

export interface StoreListPageProps {
  stores?: Store[];
  onStoreClick?: (storeId: string) => void;
  onStoreMessage?: (storeId: string) => void;
}

/**
 * StoreListPage: Grid of store cards with location and rating info
 *
 * Features:
 * - Responsive grid (xs: 1 col, sm: 2 cols, md: 3 cols, lg: 4 cols, xl: 5 cols)
 * - useMediaQuery hook for responsive layout
 * - Sort by distance functionality
 * - Click handlers for viewing store and messaging
 * - Accessibility WCAG 2.1 AA compliant
 * - Design tokens from P5-1
 *
 * Responsive Breakpoints:
 * - xs (320px): 1 column
 * - sm (640px): 2 columns
 * - md (1024px): 3 columns
 * - lg (1280px): 4 columns
 * - xl (1536px): 5 columns
 */
export function StoreListPage({
  stores = mockStores,
  onStoreClick,
  onStoreMessage,
}: StoreListPageProps): ReactNode {
  const [sortBy, setSortBy] = useState<'name' | 'distance' | 'rating'>('distance');

  // Media queries for responsive grid
  const isXs = useMediaQuery('(max-width: 320px)');
  const isSm = useMediaQuery('(max-width: 640px)');
  const isMd = useMediaQuery('(max-width: 1024px)');
  const isLg = useMediaQuery('(max-width: 1280px)');

  // Determine grid columns based on breakpoints
  const gridColumns = useMemo(() => {
    if (isXs) return 1;
    if (isSm) return 2;
    if (isMd) return 3;
    if (isLg) return 4;
    return 5;
  }, [isXs, isSm, isMd, isLg]);

  // Sort stores based on selected criteria
  const sortedStores = useMemo(() => {
    const sorted = [...stores];
    if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'distance') {
      sorted.sort((a, b) => {
        const distA = a.distance || 999;
        const distB = b.distance || 999;
        return distA - distB;
      });
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    return sorted;
  }, [stores, sortBy]);

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
          padding: '16px',
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
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 16px 0',
            }}
          >
            Our Stores
          </h1>

          {/* Filters and Sort */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              Sort by:
            </span>

            <div
              style={{
                display: 'flex',
                gap: 8,
              }}
            >
              {(['distance', 'rating', 'name'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSortBy(option)}
                  aria-pressed={sortBy === option}
                  style={{
                    height: 32,
                    paddingLeft: 12,
                    paddingRight: 12,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-default)',
                    background: sortBy === option ? 'var(--brand-yellow)' : 'transparent',
                    color: sortBy === option ? 'var(--brand-black)' : 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-out',
                    textTransform: 'capitalize',
                  }}
                >
                  {option === 'distance' && '📍 Nearest'}
                  {option === 'rating' && '⭐ Top Rated'}
                  {option === 'name' && 'A-Z Name'}
                </button>
              ))}
            </div>

            <span
              style={{
                marginLeft: 'auto',
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
            >
              {stores.length} store{stores.length !== 1 ? 's' : ''}
            </span>
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
          {/* Stores Grid */}
          {sortedStores.length > 0 ? (
            <div
              role="region"
              aria-label="Store list"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
                gap: 16,
              }}
            >
              {sortedStores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  onClick={() => onStoreClick?.(store.id)}
                  onMessage={() => onStoreMessage?.(store.id)}
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
                minHeight: 400,
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
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 8px 0',
                }}
              >
                No stores found
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  margin: 0,
                }}
              >
                Please try different filters
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div
        style={{
          padding: '16px',
          background: '#fff',
          borderTop: '1px solid var(--border-default)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            margin: 0,
          }}
        >
          Need help finding a store? Contact our support team or call 1-800-STORES
        </p>
      </div>
    </div>
  );
}

// Mock data for development
const mockStores: Store[] = [
  {
    id: 'store-001',
    name: 'Downtown Store',
    location: 'Manhattan, NY',
    distance: 2.3,
    rating: 5,
    reviewCount: 342,
  },
  {
    id: 'store-002',
    name: 'Brooklyn Branch',
    location: 'Brooklyn, NY',
    distance: 4.8,
    rating: 4,
    reviewCount: 128,
  },
  {
    id: 'store-003',
    name: 'Queens Hub',
    location: 'Queens, NY',
    distance: 6.2,
    rating: 5,
    reviewCount: 267,
  },
  {
    id: 'store-004',
    name: 'Upper West Side',
    location: 'Manhattan, NY',
    distance: 3.1,
    rating: 4,
    reviewCount: 89,
  },
  {
    id: 'store-005',
    name: 'Financial District',
    location: 'Manhattan, NY',
    distance: 1.9,
    rating: 5,
    reviewCount: 521,
  },
  {
    id: 'store-006',
    name: 'Astoria Outlet',
    location: 'Queens, NY',
    distance: 7.4,
    rating: 3,
    reviewCount: 45,
  },
  {
    id: 'store-007',
    name: 'Bay Ridge Store',
    location: 'Brooklyn, NY',
    distance: 5.9,
    rating: 4,
    reviewCount: 156,
  },
  {
    id: 'store-008',
    name: 'Park Slope Shop',
    location: 'Brooklyn, NY',
    distance: 5.2,
    rating: 5,
    reviewCount: 234,
  },
  {
    id: 'store-009',
    name: 'Roosevelt Avenue',
    location: 'Queens, NY',
    distance: 8.1,
    rating: 4,
    reviewCount: 103,
  },
  {
    id: 'store-010',
    name: 'Soho Studio',
    location: 'Manhattan, NY',
    distance: 2.7,
    rating: 5,
    reviewCount: 445,
  },
];
