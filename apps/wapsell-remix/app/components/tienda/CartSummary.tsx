/**
 * CartSummary - Order summary with subtotal, tax, and total
 * Includes promo code input and checkout button
 */

import React, { useState } from 'react';

export interface CartSummaryProps {
  subtotal: number;
  taxRate?: number; // 0-100
  discount?: number;
  promoCode?: string;
  itemCount: number;
  onPromoCodeChange?: (code: string) => Promise<boolean>;
  onCheckout?: () => void;
  onContinueShopping?: () => void;
  checkoutText?: string;
  loading?: boolean;
}

export const CartSummary = React.forwardRef<HTMLDivElement, CartSummaryProps>(
  (
    {
      subtotal,
      taxRate = 21,
      discount = 0,
      promoCode = '',
      itemCount,
      onPromoCodeChange,
      onCheckout,
      onContinueShopping,
      checkoutText = 'Ir al Carrito',
      loading = false,
    },
    ref
  ) => {
    const [promoInput, setPromoInput] = useState(promoCode);
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoError, setPromoError] = useState('');
    const [promoSuccess, setPromoSuccess] = useState('');

    const subtotalAfterDiscount = subtotal - discount;
    const tax = (subtotalAfterDiscount * taxRate) / 100;
    const total = subtotalAfterDiscount + tax;

    const handleApplyPromo = async () => {
      if (!promoInput.trim() || !onPromoCodeChange) return;

      setPromoLoading(true);
      setPromoError('');
      setPromoSuccess('');

      try {
        const result = await onPromoCodeChange(promoInput);
        if (result) {
          setPromoSuccess(`Código "${promoInput}" aplicado correctamente`);
        } else {
          setPromoError('Código de promoción inválido o expirado');
        }
      } catch {
        setPromoError('Error al aplicar el código de promoción');
      } finally {
        setPromoLoading(false);
      }
    };

    const handlePromoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPromoInput(e.target.value.toUpperCase());
      setPromoError('');
      setPromoSuccess('');
    };

    return (
      <div
        ref={ref}
        className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6 space-y-6"
      >
        <h2 className="text-xl font-bold text-gray-900">Resumen del Pedido</h2>

        {/* Item Count */}
        <div className="text-sm text-gray-600">
          <span className="font-medium">{itemCount}</span>{' '}
          {itemCount === 1 ? 'artículo' : 'artículos'} en el carrito
        </div>

        {/* Promo Code */}
        <div className="space-y-2">
          <label htmlFor="promo" className="text-sm font-medium text-gray-700">
            Código de promoción
          </label>
          <div className="flex gap-2">
            <input
              id="promo"
              type="text"
              value={promoInput}
              onChange={handlePromoInputChange}
              placeholder="Ingresa código"
              className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={promoLoading}
            />
            <button
              onClick={handleApplyPromo}
              disabled={!promoInput || promoLoading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {promoLoading ? 'Aplicando...' : 'Aplicar'}
            </button>
          </div>
          {promoError && (
            <p className="text-xs text-red-600">{promoError}</p>
          )}
          {promoSuccess && (
            <p className="text-xs text-green-600">{promoSuccess}</p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Price Breakdown */}
        <div className="space-y-3">
          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
          </div>

          {/* Discount */}
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Descuento</span>
              <span className="font-medium text-green-600">-${discount.toFixed(2)}</span>
            </div>
          )}

          {/* Tax */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Impuestos ({taxRate}%)
            </span>
            <span className="font-medium text-gray-900">${tax.toFixed(2)}</span>
          </div>

          {/* Shipping (Placeholder) */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Envío</span>
            <span className="font-medium text-green-600">GRATIS</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
        </div>

        {/* Checkout Button */}
        <button
          onClick={onCheckout}
          disabled={itemCount === 0 || loading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors text-white ${
            itemCount === 0 || loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {loading ? 'Procesando...' : checkoutText}
        </button>

        {/* Continue Shopping */}
        <button
          onClick={onContinueShopping}
          className="w-full py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Seguir Comprando
        </button>

        {/* Info Box */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
          <p className="text-xs font-medium text-blue-900">
            Garantía de mejor precio
          </p>
          <p className="text-xs text-blue-800">
            Si encuentras un precio menor, te damos 10% de descuento adicional
          </p>
        </div>

        {/* Security Info */}
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <svg
            className="w-4 h-4 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 111.414 1.414L7.414 8l3.293 3.293a1 1 0 01-1.414 1.414l-4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>Tu información está protegida con encriptación SSL</span>
        </div>
      </div>
    );
  }
);

CartSummary.displayName = 'CartSummary';
