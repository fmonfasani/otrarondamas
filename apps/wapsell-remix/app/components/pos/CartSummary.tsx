import React from 'react';
import { CartItemData } from './CartItem';

interface CartSummaryProps {
  items: CartItemData[];
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  taxRate?: number; // Tax percentage (e.g., 21 for 21% VAT)
  hideActions?: boolean;
  onApplyDiscount?: (discount: number, type: 'percentage' | 'fixed') => void;
  disabled?: boolean;
}

export function CartSummary({
  items,
  discountType = 'fixed',
  discountValue = 0,
  taxRate = 0,
  hideActions = false,
  onApplyDiscount,
  disabled = false,
}: CartSummaryProps) {
  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  // Calculate discount
  let discountAmount = 0;
  if (discountValue > 0) {
    if (discountType === 'percentage') {
      discountAmount = subtotal * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }
  }

  // Ensure discount doesn't exceed subtotal
  discountAmount = Math.min(discountAmount, subtotal);

  // Calculate taxable amount (subtotal - discount)
  const taxableAmount = subtotal - discountAmount;

  // Calculate tax
  const taxAmount = taxableAmount * (taxRate / 100);

  // Calculate total
  const total = taxableAmount + taxAmount;

  const hasDiscount = discountValue > 0;
  const hasItems = items.length > 0;

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg p-6 space-y-4">
      {/* Header */}
      <h3 className="text-lg font-bold text-gray-800 mb-4">Resumen</h3>

      {/* Empty State */}
      {!hasItems && (
        <div className="text-center py-6 text-gray-500">
          <p>No hay items en el carrito</p>
        </div>
      )}

      {/* Summary Details */}
      {hasItems && (
        <>
          {/* Subtotal */}
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-700">Subtotal ({items.length} item{items.length !== 1 ? 's' : ''}):</span>
            <span className="text-lg font-semibold text-gray-800">
              ${subtotal.toFixed(2)}
            </span>
          </div>

          {/* Discount */}
          {hasDiscount && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-700">
                Descuento {discountType === 'percentage' ? `(${discountValue}%)` : '(fijo)'}:
              </span>
              <span className="text-lg font-semibold text-green-600">
                -${discountAmount.toFixed(2)}
              </span>
            </div>
          )}

          {/* Tax */}
          {taxRate > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-700">IVA ({taxRate}%):</span>
              <span className="text-lg font-semibold text-gray-800">
                ${taxAmount.toFixed(2)}
              </span>
            </div>
          )}

          {/* Total */}
          <div className="bg-blue-50 rounded-lg p-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-gray-800">Total:</span>
              <span className="text-3xl font-bold text-blue-600">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Discount Application (Optional) */}
          {!hideActions && onApplyDiscount && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Aplicar descuento
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Monto o %"
                    min="0"
                    disabled={disabled}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      if (value >= 0) {
                        onApplyDiscount(value, discountType);
                      }
                    }}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={() => onApplyDiscount(0, discountType)}
                  disabled={disabled || !hasDiscount}
                  className="px-4 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Limpiar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
