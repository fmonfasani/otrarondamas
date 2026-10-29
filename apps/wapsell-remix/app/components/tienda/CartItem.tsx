/**
 * CartItem - Individual cart item with quantity and remove controls
 * Shows product info, price, quantity selector, and subtotal
 */

import React from 'react';
import { ProductoTienda } from '@wapsell/types';

export interface CartItemData extends ProductoTienda {
  quantity: number;
  cartItemId: string;
}

export interface CartItemProps {
  item: CartItemData;
  onQuantityChange: (cartItemId: string, quantity: number) => void;
  onRemove: (cartItemId: string) => void;
  imageUrl?: string;
}

export const CartItem = React.forwardRef<HTMLDivElement, CartItemProps>(
  (
    {
      item,
      onQuantityChange,
      onRemove,
      imageUrl = '/placeholder-product.png',
    },
    ref
  ) => {
    const price = parseFloat(item.precio);
    const subtotal = price * item.quantity;

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(1, parseInt(e.target.value) || 1);
      onQuantityChange(item.cartItemId, value);
    };

    const handleIncrement = () => {
      onQuantityChange(item.cartItemId, item.quantity + 1);
    };

    const handleDecrement = () => {
      if (item.quantity > 1) {
        onQuantityChange(item.cartItemId, item.quantity - 1);
      }
    };

    return (
      <div
        ref={ref}
        className="flex gap-4 py-4 border-b border-gray-200 last:border-0 hover:bg-gray-50 px-2 rounded transition-colors"
      >
        {/* Product Image */}
        <div className="w-20 h-20 flex-shrink-0">
          <img
            src={imageUrl}
            alt={item.nombre}
            className="w-full h-full object-cover rounded-lg bg-gray-100"
          />
        </div>

        {/* Product Info */}
        <div className="flex-grow min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{item.nombre}</h3>
          <p className="text-sm text-gray-500 mt-1">{item.codigoInterno}</p>

          {/* Price */}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-gray-900">
              ${price.toFixed(2)}
            </span>
            {item.descuentoPorcentaje && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                -{item.descuentoPorcentaje}%
              </span>
            )}
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="flex flex-col items-end justify-between">
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={handleDecrement}
              disabled={item.quantity === 1}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Disminuir cantidad"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              </svg>
            </button>

            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={handleQuantityChange}
              className="w-12 text-center py-1 border-0 focus:ring-0 focus:outline-none"
            />

            <button
              onClick={handleIncrement}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Aumentar cantidad"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>

          {/* Subtotal and Remove */}
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900 mb-2">
              ${subtotal.toFixed(2)}
            </div>
            <button
              onClick={() => onRemove(item.cartItemId)}
              className="text-sm text-red-600 hover:text-red-700 hover:underline transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    );
  }
);

CartItem.displayName = 'CartItem';
