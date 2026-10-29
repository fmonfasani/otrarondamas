'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { ShippingAddress, ShippingMethod, PaymentMethod } from '@/lib/validation/checkout.schema';

interface OrderReviewProps {
  shippingAddress: Partial<ShippingAddress>;
  shippingMethod: ShippingMethod;
  paymentMethod?: PaymentMethod;
  cartItems: any[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
}

/**
 * Order review/confirmation component
 * - Summary of all checkout data
 * - Item list with images
 * - Address confirmation
 * - Shipping and payment methods
 * - Final cost breakdown
 */
export default function OrderReview({
  shippingAddress,
  shippingMethod,
  paymentMethod,
  cartItems,
  subtotal,
  tax,
  shippingCost,
  total,
}: OrderReviewProps) {
  const t = useTranslations();

  const getPaymentMethodLabel = () => {
    if (!paymentMethod) return 'N/A';
    switch (paymentMethod.type) {
      case 'card':
        return t('checkout.creditDebitCard');
      case 'paypal':
        return 'PayPal';
      case 'mercadopago':
        return 'MercadoPago';
      case 'bank_transfer':
        return t('checkout.bankTransfer');
      default:
        return 'N/A';
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">{t('checkout.orderReview')}</h2>

      {/* Items */}
      <section className="border-b border-gray-200 pb-6">
        <h3 className="font-bold text-lg mb-4">{t('checkout.items')}</h3>
        <div className="space-y-4">
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-center gap-4 py-3">
              {item.imagen && (
                <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded overflow-hidden">
                  <Image
                    src={item.imagen}
                    alt={item.nombre}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{item.nombre}</p>
                <p className="text-sm text-gray-600">{item.sku}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-gray-900">
                  ${item.precio.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  {item.cantidad} x {t('common.unit')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shipping Address */}
      <section className="border-b border-gray-200 pb-6">
        <h3 className="font-bold text-lg mb-4">{t('checkout.shippingAddress')}</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <p className="font-semibold">{shippingAddress.street}</p>
          {shippingAddress.apartment && (
            <p>{shippingAddress.apartment}</p>
          )}
          <p>
            {shippingAddress.city}, {shippingAddress.state}{' '}
            {shippingAddress.postalCode}
          </p>
          <p>{shippingAddress.country}</p>
          <p className="text-gray-600">{shippingAddress.phone}</p>
        </div>
      </section>

      {/* Shipping Method */}
      <section className="border-b border-gray-200 pb-6">
        <h3 className="font-bold text-lg mb-4">{t('checkout.shippingMethod')}</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="font-semibold text-gray-900 capitalize">
            {shippingMethod === 'pickup'
              ? t('tienda.pickupInStore')
              : shippingMethod === 'express'
                ? t('tienda.expressShipping')
                : t('tienda.standardShipping')}
          </p>
        </div>
      </section>

      {/* Payment Method */}
      <section className="border-b border-gray-200 pb-6">
        <h3 className="font-bold text-lg mb-4">{t('checkout.paymentMethod')}</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="font-semibold text-gray-900">
            {getPaymentMethodLabel()}
          </p>
          {paymentMethod?.type === 'card' && (
            <p className="text-sm text-gray-600 mt-1">
              {t('common.ending')} {paymentMethod.cardNumber?.slice(-4)}
            </p>
          )}
          {paymentMethod?.type === 'paypal' && (
            <p className="text-sm text-gray-600 mt-1">
              {paymentMethod.email}
            </p>
          )}
        </div>
      </section>

      {/* Cost Breakdown */}
      <section className="border-b border-gray-200 pb-6">
        <h3 className="font-bold text-lg mb-4">{t('checkout.costBreakdown')}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{t('checkout.subtotal')}</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('checkout.tax')}</span>
            <span className="font-medium">${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('checkout.shipping')}</span>
            <span className="font-medium">${shippingCost.toFixed(2)}</span>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between text-lg font-bold">
          <span>{t('checkout.total')}</span>
          <span className="text-[#D97757]">${total.toFixed(2)}</span>
        </div>
      </section>

      {/* Terms Agreement */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
        <input
          type="checkbox"
          id="terms"
          className="mt-1 w-4 h-4 text-[#D97757] border-gray-300 rounded focus:ring-2 focus:ring-[#D97757]"
          aria-label={t('checkout.agreeTerms')}
        />
        <label htmlFor="terms" className="text-xs text-gray-700">
          {t('checkout.termsConfirm')}
        </label>
      </div>
    </div>
  );
}
