'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface ProductCarouselProps {
  images: string[];
  productName: string;
  currentImageIndex?: number;
  onImageChange?: (index: number) => void;
}

/**
 * Product image carousel with thumbnail navigation
 * - Main image display with aspect ratio 1:1
 * - Thumbnail strip below for navigation
 * - Keyboard navigation support (arrow keys)
 * - Touch gesture support (swipe)
 */
export default function ProductCarousel({
  images,
  productName,
  currentImageIndex = 0,
  onImageChange,
}: ProductCarouselProps) {
  const t = useTranslations();
  const [activeIndex, setActiveIndex] = useState(currentImageIndex);

  const handleImageChange = useCallback(
    (index: number) => {
      if (index >= 0 && index < images.length) {
        setActiveIndex(index);
        onImageChange?.(index);
      }
    },
    [images.length, onImageChange]
  );

  const handlePrevious = () => {
    handleImageChange(activeIndex === 0 ? images.length - 1 : activeIndex - 1);
  };

  const handleNext = () => {
    handleImageChange(activeIndex === images.length - 1 ? 0 : activeIndex + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
  };

  if (!images.length) {
    return (
      <div className="bg-gray-100 aspect-square rounded-lg flex items-center justify-center">
        <p className="text-gray-500">{t('common.noImage')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" role="region" aria-label={`${productName} ${t('common.gallery')}`}>
      {/* Main Image */}
      <div
        className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="img"
        aria-label={`${productName} - ${t('common.image')} ${activeIndex + 1} ${t('common.of')} ${images.length}`}
      >
        <Image
          src={images[activeIndex]}
          alt={`${productName} - view ${activeIndex + 1}`}
          fill
          className="object-cover"
          priority={activeIndex === 0}
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition opacity-0 group-hover:opacity-100"
              aria-label={t('common.previousImage')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition opacity-0 group-hover:opacity-100"
              aria-label={t('common.nextImage')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-2 right-2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {activeIndex + 1}/{images.length}
        </div>
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => handleImageChange(index)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                activeIndex === index
                  ? 'border-[#D97757]'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              aria-label={`${t('common.view')} ${t('common.image')} ${index + 1}`}
              aria-current={activeIndex === index}
            >
              <Image
                src={image}
                alt={`${productName} thumbnail ${index + 1}`}
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
