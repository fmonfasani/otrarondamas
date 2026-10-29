/**
 * ProductGrid - Responsive grid layout for products
 * Adjusts columns based on breakpoints: 1 (mobile), 2 (tablet), 3+ (desktop)
 */

import React from 'react';
import { ProductoTienda } from '@wapsell/types';
import { ProductCard } from './ProductCard';

export interface ProductGridProps {
  products: ProductoTienda[];
  onAddToCart: (product: ProductoTienda) => void;
  onViewDetails?: (product: ProductoTienda) => void;
  loading?: boolean;
  emptyMessage?: string;
  columnCount?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export const ProductGrid = React.forwardRef<HTMLDivElement, ProductGridProps>(
  (
    {
      products,
      onAddToCart,
      onViewDetails,
      loading = false,
      emptyMessage = 'No hay productos disponibles',
      columnCount = {
        mobile: 1,
        tablet: 2,
        desktop: 3,
      },
    },
    ref
  ) => {
    if (loading) {
      return (
        <div ref={ref} className="w-full py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg aspect-square animate-pulse" />
            ))}
          </div>
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div ref={ref} className="w-full py-12 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg">{emptyMessage}</p>
          </div>
        </div>
      );
    }

    const gridColsClass = {
      mobile: `grid-cols-${columnCount.mobile || 1}`,
      tablet: `sm:grid-cols-${columnCount.tablet || 2}`,
      desktop: `lg:grid-cols-${columnCount.desktop || 3}`,
    };

    return (
      <div
        ref={ref}
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full`}
      >
        {products.map((product) => (
          <ProductCard
            key={product.productoId}
            product={product}
            onAddToCart={onAddToCart}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    );
  }
);

ProductGrid.displayName = 'ProductGrid';
