import React from 'react';
import clsx from 'clsx';

export type PaymentMethodType = 'CASH' | 'CARD' | 'MIXED' | 'QR';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodType | null;
  onSelectMethod: (method: PaymentMethodType) => void;
  disabled?: boolean;
}

const methodConfig = {
  CASH: {
    id: 'CASH',
    label: 'Efectivo',
    description: 'Pago en efectivo',
    icon: '💵',
  },
  CARD: {
    id: 'CARD',
    label: 'Tarjeta',
    description: 'Crédito/Débito',
    icon: '💳',
  },
  MIXED: {
    id: 'MIXED',
    label: 'Mixto',
    description: 'Efectivo + Tarjeta',
    icon: '🔀',
  },
  QR: {
    id: 'QR',
    label: 'QR',
    description: 'Mercado Pago',
    icon: '📱',
  },
};

export function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  disabled = false,
}: PaymentMethodSelectorProps) {
  const methods: PaymentMethodType[] = ['CASH', 'CARD', 'MIXED', 'QR'];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Seleccionar método de pago</h3>

      <div className="grid grid-cols-2 gap-3">
        {methods.map((method) => {
          const config = methodConfig[method];
          const isSelected = selectedMethod === method;

          return (
            <button
              key={method}
              onClick={() => onSelectMethod(method)}
              disabled={disabled}
              className={clsx(
                'p-4 rounded-lg border-2 transition-all duration-200',
                'flex flex-col items-center gap-2 text-center',
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="text-3xl">{config.icon}</span>
              <div>
                <div className="font-semibold text-gray-800">{config.label}</div>
                <div className="text-sm text-gray-600">{config.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
