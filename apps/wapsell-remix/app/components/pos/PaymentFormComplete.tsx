/**
 * Complete POS Payment Form Component
 * Comprehensive payment handling with all methods
 * - Real-time validation
 * - Receipt generation
 * - Error handling
 * - Accessibility features
 */

import React, { useState, useRef } from 'react';
import { usePOSPayment, useCompleteSale } from '~/hooks/usePOSPayment';
import { generateTextReceipt, generateHTMLReceipt } from '~/utils/receipt.generator';
import type { SaleItem } from '~/services/pos.server';

interface CompletePaymentFormProps {
  items: SaleItem[];
  total: number;
  subtotal: number;
  tax?: number;
  discount?: number;
  locale: 'en' | 'es';
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  businessInfo?: {
    name: string;
    address?: string;
    taxId?: string;
  };
  customerId?: string;
}

const translations = {
  en: {
    paymentForm: 'Payment Information',
    selectPaymentMethod: 'Select Payment Method',
    cash: 'Cash',
    card: 'Card',
    qr: 'QR Code',
    mixed: 'Mixed Payment',
    total: 'Total Amount',
    subtotal: 'Subtotal',
    tax: 'Tax',
    discount: 'Discount',
    amountReceived: 'Amount Received',
    change: 'Change',
    cardNumber: 'Card Number',
    cardholderName: 'Cardholder Name',
    expiryMonth: 'Month',
    expiryYear: 'Year',
    cvv: 'CVV',
    installments: 'Installments',
    qrCode: 'QR Code',
    qrReference: 'QR Reference',
    cashAmount: 'Cash Amount',
    cardAmount: 'Card Amount',
    completeSale: 'Complete Sale',
    processing: 'Processing...',
    validating: 'Validating...',
    errorTitle: 'Error',
    successTitle: 'Sale Complete',
    printReceipt: 'Print Receipt',
    newSale: 'New Sale',
    closeReceipt: 'Close',
    requiredField: 'Required field',
    invalidCard: 'Invalid card number',
    expiredCard: 'Card has expired',
    insufficientPayment: 'Insufficient payment amount',
    receiptNumber: 'Receipt #',
  },
  es: {
    paymentForm: 'Información de Pago',
    selectPaymentMethod: 'Seleccionar Método de Pago',
    cash: 'Efectivo',
    card: 'Tarjeta',
    qr: 'Código QR',
    mixed: 'Pago Mixto',
    total: 'Monto Total',
    subtotal: 'Subtotal',
    tax: 'Impuesto',
    discount: 'Descuento',
    amountReceived: 'Monto Recibido',
    change: 'Vuelto',
    cardNumber: 'Número de Tarjeta',
    cardholderName: 'Nombre del Titular',
    expiryMonth: 'Mes',
    expiryYear: 'Año',
    cvv: 'CVV',
    installments: 'Cuotas',
    qrCode: 'Código QR',
    qrReference: 'Referencia QR',
    cashAmount: 'Monto en Efectivo',
    cardAmount: 'Monto en Tarjeta',
    completeSale: 'Completar Venta',
    processing: 'Procesando...',
    validating: 'Validando...',
    errorTitle: 'Error',
    successTitle: 'Venta Completada',
    printReceipt: 'Imprimir Recibo',
    newSale: 'Nueva Venta',
    closeReceipt: 'Cerrar',
    requiredField: 'Campo requerido',
    invalidCard: 'Número de tarjeta inválido',
    expiredCard: 'La tarjeta ha vencido',
    insufficientPayment: 'Monto insuficiente',
    receiptNumber: 'Recibo #',
  },
};

const t = translations;

export function CompletePaymentForm({
  items,
  total,
  subtotal,
  tax = 0,
  discount = 0,
  locale,
  onSuccess,
  onError,
  businessInfo,
  customerId,
}: CompletePaymentFormProps) {
  const lang = t[locale];
  const { state, errors, updatePayment, validatePayment, buildPaymentData, resetPayment } =
    usePOSPayment();
  const { submit, isLoading, error } = useCompleteSale({
    onSuccess: (response) => {
      setReceipt(response.receiptData);
      onSuccess?.(response);
    },
    onError,
  });

  const [receipt, setReceipt] = useState<any | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validatePayment()) {
      return;
    }

    const paymentData = buildPaymentData();
    if (!paymentData) {
      return;
    }

    // Submit sale
    const result = await submit({
      items,
      payment: paymentData,
      canal: 'presencial',
      clienteId: customerId,
      idempotencyKey: crypto.randomUUID(),
    });

    // Receipt display is handled in onSuccess callback
  };

  if (receipt) {
    return (
      <ReceiptModal
        receipt={receipt}
        locale={locale}
        businessInfo={businessInfo}
        onClose={() => {
          setReceipt(null);
          resetPayment();
          formRef.current?.reset();
        }}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        {/* Totals Summary */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="space-y-2 mb-4">
            {subtotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">{lang.subtotal}</span>
                <span className="text-gray-900 font-medium">${subtotal.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">{lang.discount}</span>
                <span className="text-red-600 font-medium">-${discount.toFixed(2)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">{lang.tax}</span>
                <span className="text-gray-900 font-medium">${tax.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center pt-4 border-t-2 border-blue-200">
            <span className="text-lg font-semibold text-gray-800">{lang.total}</span>
            <span className="text-3xl font-bold text-blue-600">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            {lang.selectPaymentMethod}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['CASH', 'CARD', 'QR', 'MIXED'].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => updatePayment({ method: method as any })}
                className={`p-3 rounded-lg font-medium transition-all ${
                  state.method === method
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {lang[method.toLowerCase() as keyof typeof lang] || method}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method Fields */}
        {state.method && (
          <PaymentMethodFields
            method={state.method}
            state={state}
            errors={errors}
            total={total}
            locale={locale}
            onUpdate={updatePayment}
          />
        )}

        {/* Error Display */}
        {(error || errors.general) && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="font-semibold text-red-900 mb-1">{lang.errorTitle}</p>
            <p className="text-red-700">{error || errors.general}</p>
          </div>
        )}

        {/* Submit Button */}
        {state.method && (
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors text-lg"
          >
            {isLoading ? lang.processing : lang.completeSale}
          </button>
        )}
      </form>
    </div>
  );
}

/**
 * Dynamic payment method fields
 */
function PaymentMethodFields({
  method,
  state,
  errors,
  total,
  locale,
  onUpdate,
}: {
  method: string;
  state: any;
  errors: any;
  total: number;
  locale: 'en' | 'es';
  onUpdate: (updates: any) => void;
}) {
  const lang = t[locale];

  switch (method) {
    case 'CASH':
      return (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {lang.amountReceived}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={state.amountReceived || ''}
              onChange={(e) => onUpdate({ amountReceived: e.target.value ? parseFloat(e.target.value) : undefined })}
              className={`w-full px-4 py-3 border rounded-lg text-lg ${
                errors.amountReceived ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="0.00"
              autoFocus
            />
            {errors.amountReceived && (
              <p className="mt-1 text-sm text-red-600">{errors.amountReceived}</p>
            )}
          </div>

          {state.amountReceived && state.amountReceived >= total && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-gray-600">{lang.change}</p>
              <p className="text-2xl font-bold text-green-600">
                ${(state.amountReceived - total).toFixed(2)}
              </p>
            </div>
          )}
        </div>
      );

    case 'CARD':
      return (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 space-y-4">
          <CardInputFields state={state} errors={errors} locale={locale} onUpdate={onUpdate} />
        </div>
      );

    case 'QR':
      return (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {lang.qrReference}
            </label>
            <input
              type="text"
              value={state.qrReference || ''}
              onChange={(e) => onUpdate({ qrReference: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg ${
                errors.qrReference ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Scan QR code..."
              autoFocus
            />
            {errors.qrReference && (
              <p className="mt-1 text-sm text-red-600">{errors.qrReference}</p>
            )}
          </div>
        </div>
      );

    case 'MIXED':
      return (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang.cashAmount}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={state.cashAmount || ''}
                onChange={(e) => onUpdate({ cashAmount: e.target.value ? parseFloat(e.target.value) : 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang.cardAmount}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={state.cardAmount || ''}
                onChange={(e) => onUpdate({ cardAmount: e.target.value ? parseFloat(e.target.value) : 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="0.00"
              />
            </div>
          </div>

          {state.cashAmount > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang.amountReceived} ({lang.cash})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={state.amountReceived || ''}
                onChange={(e) => onUpdate({ amountReceived: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="0.00"
              />
            </div>
          )}

          {state.cardAmount > 0 && <CardInputFields state={state} errors={errors} locale={locale} onUpdate={onUpdate} />}
        </div>
      );

    default:
      return null;
  }
}

/**
 * Card input fields component
 */
function CardInputFields({
  state,
  errors,
  locale,
  onUpdate,
}: {
  state: any;
  errors: any;
  locale: 'en' | 'es';
  onUpdate: (updates: any) => void;
}) {
  const lang = t[locale];

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {lang.cardNumber}
        </label>
        <input
          type="text"
          value={state.cardNumber || ''}
          onChange={(e) => onUpdate({ cardNumber: e.target.value.replace(/\s/g, '') })}
          className={`w-full px-4 py-3 border rounded-lg ${
            errors.cardNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
          }`}
          placeholder="1234 5678 9012 3456"
          maxLength="19"
        />
        {errors.cardNumber && <p className="mt-1 text-sm text-red-600">{errors.cardNumber}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {lang.cardholderName}
        </label>
        <input
          type="text"
          value={state.cardholderName || ''}
          onChange={(e) => onUpdate({ cardholderName: e.target.value })}
          className={`w-full px-4 py-3 border rounded-lg ${
            errors.cardholderName ? 'border-red-500 bg-red-50' : 'border-gray-300'
          }`}
          placeholder="JOHN DOE"
        />
        {errors.cardholderName && <p className="mt-1 text-sm text-red-600">{errors.cardholderName}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {lang.expiryMonth}
          </label>
          <select
            value={state.expiryMonth || ''}
            onChange={(e) => onUpdate({ expiryMonth: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
          >
            <option value="">MM</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {String(i + 1).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {lang.expiryYear}
          </label>
          <select
            value={state.expiryYear || ''}
            onChange={(e) => onUpdate({ expiryYear: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
          >
            <option value="">YYYY</option>
            {Array.from({ length: 20 }, (_, i) => {
              const year = new Date().getFullYear() + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {lang.cvv}
          </label>
          <input
            type="password"
            value={state.cvv || ''}
            onChange={(e) => onUpdate({ cvv: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg ${
              errors.cvv ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="123"
            maxLength="4"
          />
          {errors.cvv && <p className="mt-1 text-sm text-red-600">{errors.cvv}</p>}
        </div>
      </div>
    </>
  );
}

/**
 * Receipt modal display
 */
function ReceiptModal({
  receipt,
  locale,
  businessInfo,
  onClose,
}: {
  receipt: any;
  locale: 'en' | 'es';
  businessInfo?: any;
  onClose: () => void;
}) {
  const lang = t[locale];
  const [showHTML, setShowHTML] = React.useState(false);

  const textReceipt = generateTextReceipt(receipt, {
    businessName: businessInfo?.name || 'Store',
    businessAddress: businessInfo?.address,
    businessTaxId: businessInfo?.taxId,
    receiptNumber: receipt.receiptNumber,
    locale,
  });

  const htmlReceipt = generateHTMLReceipt(receipt, {
    businessName: businessInfo?.name || 'Store',
    businessAddress: businessInfo?.address,
    businessTaxId: businessInfo?.taxId,
    receiptNumber: receipt.receiptNumber,
    locale,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-green-600">{lang.successTitle}</h2>
            <p className="text-sm text-gray-600">
              {lang.receiptNumber}
              {receipt.receiptNumber}
            </p>
          </div>
          <button
            onClick={() => setShowHTML(!showHTML)}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {showHTML ? 'Text' : 'HTML'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!showHTML ? (
            <pre className="font-mono text-xs whitespace-pre-wrap">{textReceipt}</pre>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: htmlReceipt }} />
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            {lang.printReceipt}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            {lang.newSale}
          </button>
        </div>
      </div>
    </div>
  );
}
