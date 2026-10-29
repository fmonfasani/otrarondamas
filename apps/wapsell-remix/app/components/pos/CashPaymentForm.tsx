import React, { useEffect } from 'react';
import { useState } from 'react';

interface CashPaymentFormProps {
  totalAmount: number;
  onSubmit: (amountReceived: number, change: number) => void;
  disabled?: boolean;
}

export function CashPaymentForm({
  totalAmount,
  onSubmit,
  disabled = false,
}: CashPaymentFormProps) {
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [change, setChange] = useState<number>(0);
  const [error, setError] = useState<string>('');

  // Common cash denominations for quick input
  const commonDenominations = [100, 200, 500, 1000, 2000, 5000];

  useEffect(() => {
    const amount = parseFloat(amountReceived) || 0;
    if (amount < totalAmount) {
      setError(`Monto insuficiente. Falta: $${(totalAmount - amount).toFixed(2)}`);
      setChange(0);
    } else {
      setError('');
      setChange(amount - totalAmount);
    }
  }, [amountReceived, totalAmount]);

  const handleDenominationClick = (denomination: number) => {
    const current = parseFloat(amountReceived) || 0;
    const newAmount = current + denomination;
    setAmountReceived(newAmount.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountReceived);

    if (!amountReceived || isNaN(amount)) {
      setError('Ingrese un monto válido');
      return;
    }

    if (amount < totalAmount) {
      setError(`Monto insuficiente. Falta: $${(totalAmount - amount).toFixed(2)}`);
      return;
    }

    onSubmit(amount, change);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount Display */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="mb-4">
          <div className="text-sm text-gray-600">Total a cobrar</div>
          <div className="text-4xl font-bold text-gray-800">
            ${totalAmount.toFixed(2)}
          </div>
        </div>

        {/* Amount Received Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monto recibido
          </label>
          <div className="relative">
            <span className="absolute left-4 top-3 text-xl font-bold text-gray-700">$</span>
            <input
              type="number"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              disabled={disabled}
              className="w-full pl-10 pr-4 py-3 text-2xl font-bold text-gray-800 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-50"
              autoFocus
            />
          </div>
        </div>

        {/* Change Display */}
        {change > 0 && !error && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-600">Vuelto</div>
            <div className="text-3xl font-bold text-green-600">
              ${change.toFixed(2)}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}
      </div>

      {/* Quick Denomination Buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Denominaciones rápidas
        </label>
        <div className="grid grid-cols-3 gap-2">
          {commonDenominations.map((denomination) => (
            <button
              key={denomination}
              type="button"
              onClick={() => handleDenominationClick(denomination)}
              disabled={disabled}
              className="py-2 px-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              +${denomination}
            </button>
          ))}
        </div>
      </div>

      {/* Clear and Submit Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setAmountReceived('')}
          disabled={disabled || !amountReceived}
          className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Limpiar
        </button>
        <button
          type="submit"
          disabled={disabled || !amountReceived || amountReceived === '' || !!error}
          className="flex-1 py-3 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirmar pago
        </button>
      </div>
    </form>
  );
}
