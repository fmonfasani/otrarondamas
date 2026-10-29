/**
 * Order Review - Step 4 of checkout
 * Displays complete order summary before final confirmation
 */

import React from 'react';
import { SHIPPING_COSTS } from './checkout.schema';

export interface CartItem {
  id: string;
  nombre: string;
  cantidad: number;
  precioUnitario: string;
  descuentoItem?: string;
  subtotal: string;
}

export interface OrderReviewProps {
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  shippingMethod: 'STANDARD' | 'EXPRESS' | 'PICKUP';
  tax?: number;
  discount?: number;
  couponCode?: string;

  // Shipping details
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;

  // Payment method
  paymentMethod: string;
  cardLast4?: string;

  onConfirm: () => void;
  onBack?: () => void;
  isLoading?: boolean;
  onApplyCoupon?: (code: string) => void;
}

export const OrderReview = React.forwardRef<HTMLDivElement, OrderReviewProps>(
  (
    {
      items,
      subtotal,
      shippingCost,
      shippingMethod,
      tax = 0,
      discount = 0,
      couponCode,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      zipCode,
      country,
      paymentMethod,
      cardLast4,
      onConfirm,
      onBack,
      isLoading = false,
      onApplyCoupon,
    },
    ref
  ) => {
    const shippingLabel =
      shippingMethod === 'STANDARD'
        ? 'Standard Shipping'
        : shippingMethod === 'EXPRESS'
          ? 'Express Shipping'
          : 'Store Pickup';

    const shippingDays = SHIPPING_COSTS[shippingMethod].days;

    const total = subtotal + shippingCost + tax - discount;

    const getPaymentMethodLabel = () => {
      switch (paymentMethod) {
        case 'CARD':
          return `Credit Card (ending in ${cardLast4})`;
        case 'PAYPAL':
          return 'PayPal';
        case 'MERCADOPAGO':
          return 'Mercado Pago';
        case 'TRANSFER':
          return 'Bank Transfer';
        default:
          return paymentMethod;
      }
    };

    return (
      <div ref={ref} className="space-y-6">
        {/* Cart Items */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
          </div>

          <div className="divide-y divide-gray-200">
            {items.map((item) => (
              <div key={item.id} className="px-6 py-4 flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.nombre}</p>
                  <p className="text-sm text-gray-600 mt-1">Qty: {item.cantidad}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    ${parseFloat(item.subtotal).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    ${parseFloat(item.precioUnitario).toFixed(2)} each
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount {couponCode && `(${couponCode})`}</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-gray-700">
            <span>{shippingLabel} (Est. {shippingDays} days)</span>
            <span>
              {shippingMethod === 'PICKUP' ? 'FREE' : `$${shippingCost.toFixed(2)}`}
            </span>
          </div>

          {tax > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>Tax</span>
              <span>${tax.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold text-gray-900">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Shipping Address</h4>
          <div className="space-y-1 text-sm text-gray-700">
            <p className="font-medium">{firstName} {lastName}</p>
            <p>{address}</p>
            <p>{city}, {zipCode} {country}</p>
            <p className="text-gray-600">{email}</p>
            <p className="text-gray-600">{phone}</p>
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Payment Method</h4>
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {paymentMethod === 'CARD'
                ? '💳'
                : paymentMethod === 'PAYPAL'
                  ? '🅿️'
                  : paymentMethod === 'MERCADOPAGO'
                    ? '💰'
                    : '🏦'}
            </div>
            <div>
              <p className="font-medium text-gray-900">{getPaymentMethodLabel()}</p>
              {paymentMethod === 'TRANSFER' && (
                <p className="text-sm text-gray-600 mt-1">
                  Bank transfer details will be sent to your email
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <svg className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium">Your order is secure</p>
            <p>All transactions are encrypted and processed securely.</p>
          </div>
        </div>

        {/* Order Confirmation Terms */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-600">
            By clicking "Confirm Order", you agree to our Terms of Service and Privacy Policy.
            You'll receive an order confirmation email at <strong>{email}</strong>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between gap-4 pt-6 border-t border-gray-200">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing Payment...
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Confirm Order & Pay ${total.toFixed(2)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
);

OrderReview.displayName = 'OrderReview';
