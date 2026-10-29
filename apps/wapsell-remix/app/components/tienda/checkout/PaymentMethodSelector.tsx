/**
 * Payment Method Selector - Step 3 of checkout
 * Allows customer to choose between Card, PayPal, Mercado Pago, or Bank Transfer
 * Conditionally displays card details form when Card is selected
 */

import React from 'react';
import { PaymentMethodInput, PaymentMethodSchema, CardDetailsInput, CardDetailsSchema } from './checkout.schema';

export interface PaymentMethodSelectorProps {
  onSubmit: (data: PaymentMethodInput & Partial<CardDetailsInput>) => void;
  onBack?: () => void;
  isLoading?: boolean;
  initialData?: Partial<PaymentMethodInput & CardDetailsInput>;
}

export const PaymentMethodSelector = React.forwardRef<
  HTMLFormElement,
  PaymentMethodSelectorProps
>(({ onSubmit, onBack, isLoading = false, initialData = {} }, ref) => {
  const [selectedMethod, setSelectedMethod] = React.useState<string>(
    initialData.paymentMethod || 'CARD'
  );
  const [cardData, setCardData] = React.useState({
    cardNumber: initialData.cardNumber || '',
    cardholderName: initialData.cardholderName || '',
    expiryMonth: initialData.expiryMonth?.toString() || '',
    expiryYear: initialData.expiryYear?.toString() || '',
    cvv: initialData.cvv || '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string>('');

  const handleMethodChange = (method: string) => {
    setSelectedMethod(method);
    setFormError('');
    setErrors({});
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Format card number to remove spaces during input
    let formattedValue = value;
    if (name === 'cardNumber') {
      formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    }

    setCardData((prev) => ({
      ...prev,
      [name]: name === 'cardNumber' ? formattedValue.replace(/\s/g, '') : formattedValue,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setErrors({});

    try {
      // First validate payment method
      const paymentData = PaymentMethodSchema.parse({
        paymentMethod: selectedMethod,
      });

      // If card, validate card details
      if (selectedMethod === 'CARD') {
        try {
          const validCardData = CardDetailsSchema.parse({
            cardNumber: cardData.cardNumber,
            cardholderName: cardData.cardholderName,
            expiryMonth: parseInt(cardData.expiryMonth),
            expiryYear: parseInt(cardData.expiryYear),
            cvv: cardData.cvv,
          });
          onSubmit({ ...paymentData, ...validCardData });
        } catch (cardError: any) {
          const newErrors: Record<string, string> = {};
          cardError.errors?.forEach((err: any) => {
            newErrors[err.path[0]] = err.message;
          });
          setErrors(newErrors);
          return;
        }
      } else {
        onSubmit(paymentData);
      }
    } catch (error: any) {
      setFormError(error.errors?.[0]?.message || 'Please select a payment method');
    }
  };

  const paymentMethods = [
    {
      id: 'CARD',
      name: 'Credit/Debit Card',
      icon: '💳',
      description: 'Visa, Mastercard, American Express',
    },
    {
      id: 'PAYPAL',
      name: 'PayPal',
      icon: '🅿️',
      description: 'Fast and secure PayPal checkout',
    },
    {
      id: 'MERCADOPAGO',
      name: 'Mercado Pago',
      icon: '💰',
      description: 'Popular payment method in Latin America',
    },
    {
      id: 'TRANSFER',
      name: 'Bank Transfer',
      icon: '🏦',
      description: 'Direct bank transfer',
    },
  ];

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Methods */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Select Payment Method</h3>

        {paymentMethods.map((method) => (
          <label key={method.id} className="relative flex cursor-pointer">
            <input
              type="radio"
              name="paymentMethod"
              value={method.id}
              checked={selectedMethod === method.id}
              onChange={() => handleMethodChange(method.id)}
              disabled={isLoading}
              className="sr-only"
            />
            <div
              className={`w-full px-5 py-4 border-2 rounded-lg transition ${
                selectedMethod === method.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      selectedMethod === method.id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedMethod === method.id && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      <span>{method.icon}</span> {method.name}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Card Details Form - Only shown when Card is selected */}
      {selectedMethod === 'CARD' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
          <h4 className="font-semibold text-gray-900">Enter Card Details</h4>

          {/* Card Number */}
          <div>
            <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Card Number *
            </label>
            <input
              type="text"
              id="cardNumber"
              name="cardNumber"
              value={cardData.cardNumber.replace(/(\d{4})/g, '$1 ').trim()}
              onChange={handleCardChange}
              disabled={isLoading}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.cardNumber ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.cardNumber && (
              <p className="mt-1 text-sm text-red-500">{errors.cardNumber}</p>
            )}
          </div>

          {/* Cardholder Name */}
          <div>
            <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700 mb-1">
              Cardholder Name *
            </label>
            <input
              type="text"
              id="cardholderName"
              name="cardholderName"
              value={cardData.cardholderName}
              onChange={handleCardChange}
              disabled={isLoading}
              placeholder="John Doe"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.cardholderName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.cardholderName && (
              <p className="mt-1 text-sm text-red-500">{errors.cardholderName}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Expiry Month */}
            <div>
              <label htmlFor="expiryMonth" className="block text-sm font-medium text-gray-700 mb-1">
                Month *
              </label>
              <select
                id="expiryMonth"
                name="expiryMonth"
                value={cardData.expiryMonth}
                onChange={handleCardChange as any}
                disabled={isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                  errors.expiryMonth ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">MM</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {String(month).padStart(2, '0')}
                  </option>
                ))}
              </select>
              {errors.expiryMonth && (
                <p className="mt-1 text-sm text-red-500">{errors.expiryMonth}</p>
              )}
            </div>

            {/* Expiry Year */}
            <div>
              <label htmlFor="expiryYear" className="block text-sm font-medium text-gray-700 mb-1">
                Year *
              </label>
              <select
                id="expiryYear"
                name="expiryYear"
                value={cardData.expiryYear}
                onChange={handleCardChange as any}
                disabled={isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                  errors.expiryYear ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">YYYY</option>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {errors.expiryYear && (
                <p className="mt-1 text-sm text-red-500">{errors.expiryYear}</p>
              )}
            </div>

            {/* CVV */}
            <div>
              <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
                CVV *
              </label>
              <input
                type="text"
                id="cvv"
                name="cvv"
                value={cardData.cvv}
                onChange={handleCardChange}
                disabled={isLoading}
                placeholder="123"
                maxLength={4}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                  errors.cvv ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.cvv && (
                <p className="mt-1 text-sm text-red-500">{errors.cvv}</p>
              )}
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <p className="text-xs text-green-700">
              🔒 Your card information is encrypted and secure. We never store your CVV.
            </p>
          </div>
        </div>
      )}

      {/* PayPal Notice */}
      {selectedMethod === 'PAYPAL' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            You'll be redirected to PayPal to complete your payment securely.
          </p>
        </div>
      )}

      {/* Mercado Pago Notice */}
      {selectedMethod === 'MERCADOPAGO' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            You'll be redirected to Mercado Pago to complete your payment. Installment options available.
          </p>
        </div>
      )}

      {/* Bank Transfer Notice */}
      {selectedMethod === 'TRANSFER' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            Bank transfer details will be provided after order confirmation. Your order will be held pending payment verification.
          </p>
        </div>
      )}

      {formError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{formError}</p>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
              Processing...
            </>
          ) : (
            'Review Order'
          )}
        </button>
      </div>
    </form>
  );
});

PaymentMethodSelector.displayName = 'PaymentMethodSelector';
