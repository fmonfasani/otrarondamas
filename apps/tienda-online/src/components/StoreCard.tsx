import type { ReactNode } from 'react';

export interface StoreCardProps {
  store: {
    id: string;
    name: string;
    location: string;
    image?: string | null;
    rating?: number;
    reviewCount?: number;
    distance?: number;
  };
  onClick?: () => void;
  onMessage?: () => void;
}

/**
 * StoreCard: Renders a store card with location, rating, and action buttons.
 *
 * Features:
 * - Store logo/image
 * - Store name
 * - Location with optional distance
 * - Rating display with review count
 * - Message button
 * - View store button (click handler)
 */
export function StoreCard({ store, onClick, onMessage }: StoreCardProps): ReactNode {
  return (
    <div
      data-testid="store-card"
      style={{
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Store Image/Logo */}
      <div
        style={{
          height: 120,
          backgroundColor: 'var(--surface-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {store.image ? (
          <img
            src={store.image}
            alt={store.name}
            data-testid="store-image"
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
            data-testid="placeholder-logo"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          flex: 1,
        }}
      >
        {/* Store Name */}
        <h3
          data-testid="store-name"
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          {store.name}
        </h3>

        {/* Location and Distance */}
        <div
          data-testid="location-info"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-secondary)"
            strokeWidth="2"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            {store.location}
            {store.distance !== undefined && ` • ${store.distance.toFixed(1)}km`}
          </span>
        </div>

        {/* Rating */}
        {store.rating !== undefined && (
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
                      i < Math.floor(store.rating || 0)
                        ? 'var(--state-success)'
                        : 'var(--text-secondary)',
                    fontSize: 12,
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            {store.reviewCount !== undefined && (
              <span
                data-testid="review-count"
                style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                }}
              >
                ({store.reviewCount})
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div
          data-testid="action-buttons"
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 'auto',
            paddingTop: 8,
            borderTop: '1px solid var(--border-default)',
          }}
        >
          <button
            type="button"
            data-testid="message-button"
            onClick={onMessage}
            style={{
              flex: 1,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-default)',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
            }}
          >
            Message
          </button>
          <button
            type="button"
            data-testid="view-store-button"
            onClick={onClick}
            style={{
              flex: 1,
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
            View Store
          </button>
        </div>
      </div>
    </div>
  );
}
