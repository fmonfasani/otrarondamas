/**
 * ProductCard - Individual product display card
 * Shows image, name, price, rating, and add-to-cart button
 * Responsive with hover effects
 */

import React from 'react';
import { ProductoTienda } from '@wapsell/types';

export interface ProductCardProps {
  product: ProductoTienda;
  onAddToCart: (product: ProductoTienda) => void;
  onViewDetails?: (product: ProductoTienda) => void;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
}

export const ProductCard = React.forwardRef<HTMLDivElement, ProductCardProps>(
  (
    {
      product,
      onAddToCart,
      onViewDetails,
      rating = 0,
      reviewCount = 0,
      imageUrl = '/placeholder-product.png',
    },
    ref
  ) => {
    const hasDiscount = product.descuentoPorcentaje && product.precioSinDescuento;
    const price = parseFloat(product.precio);
    const originalPrice = product.precioSinDescuento ? parseFloat(product.precioSinDescuento) : null;

    const handleCardClick = () => {
      if (onViewDetails) {
        onViewDetails(product);
      }
    };

    const handleAddToCart = (e: React.MouseEvent) => {
      e.stopPropagation();
      onAddToCart(product);
    };

    const renderStars = (value: number) => {
      return (
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={`w-4 h-4 ${star <= Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
          ))}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full group"
        onClick={handleCardClick}
      >
        {/* Image Container */}
        <div className="relative w-full bg-gray-100 aspect-square overflow-hidden">
          <img
            src={imageUrl}
            alt={product.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {hasDiscount && (
            <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              -{product.descuentoPorcentaje}%
            </div>
          )}
          {!product.disponible && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold">Sin Stock</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Category */}
          <p className="text-xs text-gray-500 mb-2 truncate">{product.familiaId}</p>

          {/* Name */}
          <h3 className="text-sm font-semibold text-gray-900 mb-3 line-clamp-2 min-h-[2.5rem]">
            {product.nombre}
          </h3>

          {/* Rating */}
          {rating > 0 && (
            <div className="flex items-center gap-2 mb-3">
              {renderStars(rating)}
              {reviewCount > 0 && <span className="text-xs text-gray-500">({reviewCount})</span>}
            </div>
          )}

          {/* Price */}
          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-900">
                ${price.toFixed(2)}
              </span>
              {originalPrice && (
                <span className="text-sm text-gray-500 line-through">
                  ${originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {product.unidadBase.toLowerCase()}
            </p>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!product.disponible}
            className={`w-full mt-auto py-2 px-4 rounded-md font-medium transition-colors duration-200 text-sm ${
              product.disponible
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {product.disponible ? 'Agregar al carrito' : 'Agotado'}
          </button>

          {/* Stock Info */}
          {product.disponible && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              {product.stockTotal} disponibles
            </p>
          )}
        </div>
      </div>
    );
  }
);

ProductCard.displayName = 'ProductCard';
