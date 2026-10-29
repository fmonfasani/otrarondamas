/**
 * ProductCarousel - Image slider for product detail view
 * Supports keyboard/touch navigation and thumbnail selection
 */

import React, { useState } from 'react';

export interface ProductCarouselProps {
  images: string[];
  productName: string;
  onImageChange?: (index: number) => void;
}

export const ProductCarousel = React.forwardRef<HTMLDivElement, ProductCarouselProps>(
  ({ images, productName, onImageChange }, ref) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const imageList = images.length > 0 ? images : ['/placeholder-product.png'];

    const goToPrevious = () => {
      const newIndex = currentIndex === 0 ? imageList.length - 1 : currentIndex - 1;
      setCurrentIndex(newIndex);
      onImageChange?.(newIndex);
    };

    const goToNext = () => {
      const newIndex = currentIndex === imageList.length - 1 ? 0 : currentIndex + 1;
      setCurrentIndex(newIndex);
      onImageChange?.(newIndex);
    };

    const goToSlide = (index: number) => {
      setCurrentIndex(index);
      onImageChange?.(index);
    };

    // Handle keyboard navigation
    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') goToPrevious();
        if (e.key === 'ArrowRight') goToNext();
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex]);

    return (
      <div ref={ref} className="w-full">
        {/* Main Image */}
        <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden aspect-square mb-4">
          <img
            src={imageList[currentIndex]}
            alt={`${productName} - Imagen ${currentIndex + 1}`}
            className="w-full h-full object-cover"
          />

          {/* Navigation Arrows */}
          {imageList.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors z-10"
                aria-label="Imagen anterior"
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

              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors z-10"
                aria-label="Imagen siguiente"
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

              {/* Image Counter */}
              <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
                {currentIndex + 1} / {imageList.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnail Navigation */}
        {imageList.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {imageList.map((image, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                  currentIndex === index
                    ? 'border-blue-600'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                aria-label={`Ir a imagen ${index + 1}`}
              >
                <img src={image} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

ProductCarousel.displayName = 'ProductCarousel';
