import React from 'react';
import { Produto } from '@otrarondamas/shared-types';

export interface CartItemData {
  id: string;
  productId: string;
  product: Produto | { id: string; nombre: string; precioMinorista: string };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface CartItemProps {
  item: CartItemData;
  maxStock?: number;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemove: (itemId: string) => void;
  disabled?: boolean;
}

export function CartItem({
  item,
  maxStock = 999,
  onUpdateQuantity,
  onRemove,
  disabled = false,
}: CartItemProps) {
  const isMinQuantity = item.quantity <= 1;
  const isMaxQuantity = item.quantity >= maxStock;

  const handleQuantityDecrease = () => {
    if (item.quantity > 1 && !disabled) {
      onUpdateQuantity(item.id, item.quantity - 1);
    }
  };

  const handleQuantityIncrease = () => {
    if (item.quantity < maxStock && !disabled) {
      onUpdateQuantity(item.id, item.quantity + 1);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    if (value >= 1 && value <= maxStock && !disabled) {
      onUpdateQuantity(item.id, value);
    }
  };

  const handleRemove = () => {
    if (!disabled) {
      onRemove(item.id);
    }
  };

  const productName = 'nombre' in item.product ? item.product.nombre : item.product.name;

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 flex items-center gap-4 hover:border-blue-300 transition-colors">
      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-800 text-base truncate">
          {productName}
        </h4>
        <p className="text-sm text-gray-600">
          ${item.unitPrice.toFixed(2)} c/u
        </p>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
        <button
          onClick={handleQuantityDecrease}
          disabled={disabled || isMinQuantity}
          className="px-3 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <input
          type="number"
          value={item.quantity}
          onChange={handleQuantityChange}
          disabled={disabled}
          min="1"
          max={maxStock}
          className="w-12 text-center font-semibold text-gray-800 border-0 bg-gray-100 disabled:opacity-50"
        />
        <button
          onClick={handleQuantityIncrease}
          disabled={disabled || isMaxQuantity}
          className="px-3 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      {/* Line Total */}
      <div className="text-right w-24">
        <p className="text-lg font-bold text-gray-800">
          ${item.lineTotal.toFixed(2)}
        </p>
      </div>

      {/* Remove Button */}
      <button
        onClick={handleRemove}
        disabled={disabled}
        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Remove item from cart"
        title="Eliminar del carrito"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
