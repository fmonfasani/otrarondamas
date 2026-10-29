'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface OrderConfirmationProps {
  orderNumber: string;
  estimatedDelivery: string;
  trackingUrl?: string;
  orderDate?: string;
  recipientEmail?: string;
}

/**
 * Order confirmation success screen
 * - Order number display
 * - Estimated delivery date
 * - Email confirmation notice
 * - Tracking information
 * - Links to continue shopping or view orders
 */
export default function OrderConfirmation({
  orderNumber,
  estimatedDelivery,
  trackingUrl,
  orderDate = new Date().toLocaleDateString(),
  recipientEmail = 'customer@example.com',
}: OrderConfirmationProps) {
  const t = useTranslations();

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {/* Success Icon */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
          <svg
            className="w-12 h-12 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      {/* Success Message */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('checkout.orderConfirmed')}
        </h1>
        <p className="text-gray-600">
          {t('checkout.thankYouForOrder')}
        </p>
      </div>

      {/* Order Details Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order Number */}
          <div>
            <p className="text-sm text-gray-600 mb-1">{t('checkout.orderNumber')}</p>
            <p className="text-2xl font-bold text-gray-900">{orderNumber}</p>
          </div>

          {/* Order Date */}
          <div>
            <p className="text-sm text-gray-600 mb-1">{t('common.orderDate')}</p>
            <p className="text-lg font-semibold text-gray-900">{orderDate}</p>
          </div>

          {/* Estimated Delivery */}
          <div className="md:col-span-2">
            <p className="text-sm text-gray-600 mb-1">
              {t('checkout.estimatedDelivery')}
            </p>
            <p className="text-lg font-semibold text-green-600">
              {estimatedDelivery}
            </p>
          </div>
        </div>
      </div>

      {/* Email Confirmation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex gap-3">
          <svg
            className="w-6 h-6 text-blue-600 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <div>
            <p className="font-semibold text-blue-900">
              {t('checkout.confirmationSent')}
            </p>
            <p className="text-sm text-blue-800 mt-1">
              {t('checkout.confirmationEmail')} <span className="font-semibold">{recipientEmail}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tracking */}
      {trackingUrl && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="font-bold text-lg mb-3">{t('checkout.trackOrder')}</h2>
          <p className="text-sm text-gray-600 mb-4">
            {t('checkout.trackingInfo')}
          </p>
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-[#D97757] text-white rounded-lg font-semibold hover:bg-[#C86543] transition"
          >
            {t('checkout.trackNow')}
            <svg
              className="inline-block w-4 h-4 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      )}

      {/* What's Next */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="font-bold text-lg mb-4">{t('checkout.whatsNext')}</h2>
        <ol className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 bg-[#D97757] text-white rounded-full flex-shrink-0 font-semibold">
              1
            </span>
            <span className="text-gray-700">{t('checkout.step1')}</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 bg-[#D97757] text-white rounded-full flex-shrink-0 font-semibold">
              2
            </span>
            <span className="text-gray-700">{t('checkout.step2')}</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 bg-[#D97757] text-white rounded-full flex-shrink-0 font-semibold">
              3
            </span>
            <span className="text-gray-700">{t('checkout.step3')}</span>
          </li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center md:justify-start">
        <Link
          href="/en/carrito"
          className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 transition"
        >
          {t('checkout.continueShopping')}
        </Link>
        <Link
          href="/en/dashboard"
          className="px-6 py-3 bg-[#D97757] text-white rounded-lg font-semibold hover:bg-[#C86543] transition"
        >
          {t('checkout.viewOrders')}
        </Link>
      </div>

      {/* Support */}
      <div className="mt-8 pt-8 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-600 mb-2">
          {t('checkout.haveQuestions')}
        </p>
        <a
          href="mailto:support@wapsell.com"
          className="text-[#D97757] font-semibold hover:underline"
        >
          {t('common.contactSupport')}
        </a>
      </div>
    </div>
  );
}
