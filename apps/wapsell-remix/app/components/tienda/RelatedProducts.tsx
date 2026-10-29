/**
 * RelatedProducts - Recommendation carousel for similar products
 * Displays horizontally scrollable list of related items
 */

import React, { useState, useRef } from 'react';
import { ProductoTienda } from '@wapsell/types';
import { ProductCard } from './ProductCard';

export interface RelatedProductsProps {
  products: ProductoTienda[];
  onAddToCart: (product: ProductoTienda) => void;
  onViewDetails?: (product: ProductoTienda) => void;
  title?: string;
}

export const RelatedProducts = React.forwardRef<HTMLDivElement, RelatedProductsProps>(
  (
    {
      products,
      onAddToCart,
      onViewDetails,
      title = 'Productos Relacionados',
    },
    ref
  ) => {
    const scrollContainer = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(products.length > 3);

    const checkScroll = () => {
      if (scrollContainer.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainer.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    const scroll = (direction: 'left' | 'right') => {
      if (scrollContainer.current) {
        const scrollAmount = 300;
        scrollContainer.current.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth',
        });
        setTimeout(checkScroll, 300);
      }
    };

    React.useEffect(() => {
      checkScroll();
      const container = scrollContainer.current;
      if (container) {
        container.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);

        return () => {
          container.removeEventListener('scroll', checkScroll);
          window.removeEventListener('resize', checkScroll);
        };
      }
    }, [products.length]);

    if (products.length === 0) {
      return null;
    }

    return (
      <div ref={ref} className="py-8 border-t border-gray-200">
        <h2 className="text-2xl font-bold mb-6">{title}</h2>

        <div className="relative">
          {/* Left Scroll Button */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/3 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
              aria-label="Scroll izquierda"
            >
              <svg
                className="w-5 h-5 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Right Scroll Button */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/3 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
              aria-label="Scroll derecha"
            >
              <svg
                className="w-5 h-5 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Products Container */}
          <div
            ref={scrollContainer}
            className="flex gap-6 overflow-x-auto scroll-smooth pb-4 px-8"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db #f3f4f6',
            }}
          >
            {products.map((product) => (
              <div
                key={product.productoId}
                className="flex-shrink-0 w-56"
              >
                <ProductCard
                  product={product}
                  onAddToCart={onAddToCart}
                  onViewDetails={onViewDetails}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

RelatedProducts.displayName = 'RelatedProducts';
