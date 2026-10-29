import React, { useState } from 'react';
import { PaymentMethodType, PaymentMethodSelector } from './PaymentMethodSelector';
import { CashPaymentForm } from './CashPaymentForm';
import { CardPaymentForm } from './CardPaymentForm';
import { MixedPaymentForm } from './MixedPaymentForm';

interface PaymentFormProps {
  totalAmount: number;
  onPaymentComplete: (payment: any) => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
}

export function PaymentForm({
  totalAmount,
  onPaymentComplete,
  disabled = false,
  isLoading = false,
}: PaymentFormProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [error, setError] = useState<string>('');

  const handleCashSubmit = async (amountReceived: number, change: number) => {
    try {
      setError('');
      await onPaymentComplete({
        method: 'CASH',
        amount: totalAmount,
        amountReceived,
        change,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing payment');
    }
  };

  const handleCardSubmit = async (cardData: any) => {
    try {
      setError('');
      await onPaymentComplete({
        method: 'CARD',
        amount: totalAmount,
        ...cardData,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing payment');
    }
  };

  const handleMixedSubmit = async (data: any) => {
    try {
      setError('');
      await onPaymentComplete({
        method: 'MIXED',
        ...data,
        totalAmount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing payment');
    }
  };

  const handleQRSubmit = async () => {
    try {
      setError('');
      // QR payment would typically integrate with Mercado Pago SDK
      // For now, this is a placeholder
      await onPaymentComplete({
        method: 'QR',
        amount: totalAmount,
        qrReference: `QR_${Date.now()}`,
        provider: 'MERCADO_PAGO',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing QR payment');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      )}

      {/* Payment Method Selector */}
      {!selectedMethod ? (
        <PaymentMethodSelector
          selectedMethod={selectedMethod}
          onSelectMethod={setSelectedMethod}
          disabled={disabled || isLoading}
        />
      ) : (
        <>
          {/* Back Button */}
          <button
            onClick={() => {
              setSelectedMethod(null);
              setError('');
            }}
            disabled={disabled || isLoading}
            className="text-blue-600 hover:text-blue-800 underline font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Cambiar método de pago
          </button>

          {/* Selected Payment Form */}
          <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
            {selectedMethod === 'CASH' && (
              <CashPaymentForm
                totalAmount={totalAmount}
                onSubmit={handleCashSubmit}
                disabled={disabled || isLoading}
              />
            )}

            {selectedMethod === 'CARD' && (
              <CardPaymentForm
                totalAmount={totalAmount}
                onSubmit={handleCardSubmit}
                disabled={disabled || isLoading}
              />
            )}

            {selectedMethod === 'MIXED' && (
              <MixedPaymentForm
                totalAmount={totalAmount}
                onSubmit={handleMixedSubmit}
                disabled={disabled || isLoading}
              />
            )}

            {selectedMethod === 'QR' && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200 text-center">
                  <div className="text-6xl mb-4">📱</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Código QR - Mercado Pago
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Total a cobrar: <span className="font-bold text-xl text-blue-600">${totalAmount.toFixed(2)}</span>
                  </p>
                  <div className="bg-white p-4 rounded-lg inline-block mb-6">
                    <div className="w-40 h-40 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-gray-500 text-sm">Código QR aquí</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    El cliente escanea con su celular para pagar
                  </p>
                </div>

                <button
                  onClick={handleQRSubmit}
                  disabled={disabled || isLoading}
                  className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Procesando...' : 'Confirmar pago QR'}
                </button>
              </div>
            )}
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-gray-700 font-semibold">Procesando pago...</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
