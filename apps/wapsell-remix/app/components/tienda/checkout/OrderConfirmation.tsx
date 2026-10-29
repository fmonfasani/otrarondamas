/**
 * Order Confirmation Screen
 * Displayed after successful order submission
 */

import React from 'react';
import { Link } from '@remix-run/react';

export interface OrderConfirmationProps {
  orderNumber: string;
  email: string;
  estimatedDeliveryDate: string;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    zipCode: string;
    country: string;
  };
  total: number;
  trackingUrl?: string;
  onContinueShopping?: () => void;
}

export const OrderConfirmation = React.forwardRef<
  HTMLDivElement,
  OrderConfirmationProps
>(
  (
    {
      orderNumber,
      email,
      estimatedDeliveryDate,
      shippingAddress,
      total,
      trackingUrl,
      onContinueShopping,
    },
    ref
  ) => {
    return (
      <div ref={ref} className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            {/* Header with success icon */}
            <div className="bg-green-600 px-6 py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">Order Confirmed!</h1>
              <p className="text-green-100 mt-2">Thank you for your purchase</p>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Order Number */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Order Number</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">{orderNumber}</p>
              </div>

              {/* Email Confirmation */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Confirmation Email</p>
                <p className="text-gray-900 break-all">{email}</p>
                <p className="text-xs text-gray-600 mt-2">
                  A detailed receipt and tracking information have been sent to your email.
                </p>
              </div>

              {/* Shipping Details */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Shipping To</p>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 space-y-1">
                  <p className="font-medium">{shippingAddress.name}</p>
                  <p>{shippingAddress.address}</p>
                  <p>{shippingAddress.city}, {shippingAddress.zipCode}</p>
                  <p>{shippingAddress.country}</p>
                </div>
              </div>

              {/* Estimated Delivery */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-900">Estimated Delivery</p>
                <p className="text-lg font-bold text-amber-900 mt-1">{estimatedDeliveryDate}</p>
              </div>

              {/* Order Total */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Order Total</span>
                  <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-center block"
                  >
                    Track Order
                  </a>
                )}
                {onContinueShopping ? (
                  <button
                    onClick={onContinueShopping}
                    className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                  >
                    Continue Shopping
                  </button>
                ) : (
                  <Link
                    to="/tienda"
                    className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-center block"
                  >
                    Continue Shopping
                  </Link>
                )}
              </div>
            </div>

            {/* Footer Info */}
            <div className="bg-gray-50 border-t border-gray-200 px-8 py-4">
              <p className="text-xs text-gray-600 text-center">
                You can view your order details anytime in your account. If you have any questions, please contact our support team.
              </p>
            </div>
          </div>

          {/* FAQ Link */}
          <div className="mt-6 text-center">
            <a href="/faq" className="text-sm text-blue-600 hover:underline">
              Frequently Asked Questions
            </a>
          </div>
        </div>
      </div>
    );
  }
);

OrderConfirmation.displayName = 'OrderConfirmation';
