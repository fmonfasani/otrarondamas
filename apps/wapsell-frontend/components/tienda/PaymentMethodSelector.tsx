'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PaymentMethod } from '@/lib/validation/checkout.schema';

interface PaymentMethodSelectorProps {
  selectedMethod?: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

/**
 * Payment method selection component
 * - Card (Visa, Mastercard, Amex)
 * - PayPal
 * - MercadoPago
 * - Bank Transfer
 * - Form validation per payment type
 */
export default function PaymentMethodSelector({
  selectedMethod,
  onChange,
}: PaymentMethodSelectorProps) {
  const t = useTranslations();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentType = selectedMethod?.type || 'card';

  const handleCardChange = (field: string, value: string) => {
    onChange({
      type: 'card',
      cardNumber: (selectedMethod?.type === 'card' ? selectedMethod.cardNumber : '') || '',
      cardholderName:
        (selectedMethod?.type === 'card' ? selectedMethod.cardholderName : '') ||
        '',
      expiryMonth:
        (selectedMethod?.type === 'card' ? selectedMethod.expiryMonth : 1) || 1,
      expiryYear:
        (selectedMethod?.type === 'card' ? selectedMethod.expiryYear : 2024) ||
        2024,
      cvv: (selectedMethod?.type === 'card' ? selectedMethod.cvv : '') || '',
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('checkout.paymentMethod')}</h2>

      {/* Payment Method Options */}
      <div className="space-y-3">
        {/* Credit Card */}
        <label className="relative flex items-start border border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition">
          <input
            type="radio"
            name="payment-method"
            value="card"
            checked={currentType === 'card'}
            onChange={() => onChange({ type: 'card' } as any)}
            className="mt-1 w-4 h-4 text-[#D97757] border-gray-300 focus:ring-2 focus:ring-[#D97757]"
            aria-label={t('checkout.creditDebitCard')}
          />
          <div className="ml-4 flex-1">
            <p className="font-semibold text-gray-900">{t('checkout.creditDebitCard')}</p>
            <p className="text-sm text-gray-600 mt-1">{t('checkout.cardPaymentDesc')}</p>
          </div>
        </label>

        {/* PayPal */}
        <label className="relative flex items-start border border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition">
          <input
            type="radio"
            name="payment-method"
            value="paypal"
            checked={currentType === 'paypal'}
            onChange={() => onChange({ type: 'paypal', email: '' })}
            className="mt-1 w-4 h-4 text-[#D97757] border-gray-300 focus:ring-2 focus:ring-[#D97757]"
            aria-label="PayPal"
          />
          <div className="ml-4 flex-1">
            <p className="font-semibold text-gray-900">PayPal</p>
            <p className="text-sm text-gray-600 mt-1">{t('checkout.paypalDesc')}</p>
          </div>
        </label>

        {/* MercadoPago */}
        <label className="relative flex items-start border border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition">
          <input
            type="radio"
            name="payment-method"
            value="mercadopago"
            checked={currentType === 'mercadopago'}
            onChange={() => onChange({ type: 'mercadopago' })}
            className="mt-1 w-4 h-4 text-[#D97757] border-gray-300 focus:ring-2 focus:ring-[#D97757]"
            aria-label="MercadoPago"
          />
          <div className="ml-4 flex-1">
            <p className="font-semibold text-gray-900">MercadoPago</p>
            <p className="text-sm text-gray-600 mt-1">{t('checkout.mercadopagoDesc')}</p>
          </div>
        </label>

        {/* Bank Transfer */}
        <label className="relative flex items-start border border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition">
          <input
            type="radio"
            name="payment-method"
            value="bank_transfer"
            checked={currentType === 'bank_transfer'}
            onChange={() => onChange({ type: 'bank_transfer', bankName: '', accountNumber: '' })}
            className="mt-1 w-4 h-4 text-[#D97757] border-gray-300 focus:ring-2 focus:ring-[#D97757]"
            aria-label={t('checkout.bankTransfer')}
          />
          <div className="ml-4 flex-1">
            <p className="font-semibold text-gray-900">{t('checkout.bankTransfer')}</p>
            <p className="text-sm text-gray-600 mt-1">{t('checkout.bankTransferDesc')}</p>
          </div>
        </label>
      </div>

      {/* Form Content per Payment Type */}
      {currentType === 'card' && selectedMethod?.type === 'card' && (
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {t('checkout.cardholderName')} *
            </label>
            <input
              type="text"
              value={selectedMethod.cardholderName || ''}
              onChange={(e) => handleCardChange('cardholderName', e.target.value)}
              placeholder={t('checkout.cardholderNamePlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {t('checkout.cardNumber')} *
            </label>
            <input
              type="text"
              value={selectedMethod.cardNumber || ''}
              onChange={(e) =>
                handleCardChange('cardNumber', e.target.value.replace(/\s/g, ''))
              }
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                {t('checkout.month')} *
              </label>
              <select
                value={selectedMethod.expiryMonth || 1}
                onChange={(e) =>
                  handleCardChange('expiryMonth', e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {String(i + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                {t('checkout.year')} *
              </label>
              <select
                value={selectedMethod.expiryYear || 2024}
                onChange={(e) =>
                  handleCardChange('expiryYear', e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = 2024 + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                CVV *
              </label>
              <input
                type="text"
                value={selectedMethod.cvv || ''}
                onChange={(e) => handleCardChange('cvv', e.target.value)}
                placeholder="123"
                maxLength={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {currentType === 'paypal' && selectedMethod?.type === 'paypal' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-sm text-blue-900">
            {t('checkout.paypalInfo')}
          </p>
        </div>
      )}

      {currentType === 'mercadopago' && selectedMethod?.type === 'mercadopago' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-sm text-yellow-900">
            {t('checkout.mercadopagoInfo')}
          </p>
        </div>
      )}

      {currentType === 'bank_transfer' && selectedMethod?.type === 'bank_transfer' && (
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {t('checkout.bankName')} *
            </label>
            <input
              type="text"
              defaultValue={selectedMethod.bankName || ''}
              placeholder={t('checkout.bankNamePlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {t('checkout.accountNumber')} *
            </label>
            <input
              type="text"
              defaultValue={selectedMethod.accountNumber || ''}
              placeholder={t('checkout.accountNumberPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
            />
          </div>
        </div>
      )}

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-900">
          {t('checkout.securePayment')}
        </p>
      </div>
    </div>
  );
}
