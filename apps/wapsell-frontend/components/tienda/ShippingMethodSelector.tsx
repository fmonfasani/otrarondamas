'use client';

import { useTranslations } from 'next-intl';
import { ShippingMethod } from '@/lib/validation/checkout.schema';

interface ShippingMethodSelectorProps {
  selectedMethod: ShippingMethod;
  onChange: (method: ShippingMethod) => void;
  costs?: Record<ShippingMethod, number>;
}

/**
 * Shipping method selection component
 * - Standard, Express, Pickup
 * - Display delivery time and cost
 * - Cost calculation preview
 */
export default function ShippingMethodSelector({
  selectedMethod,
  onChange,
  costs = { standard: 10, express: 25, pickup: 0 },
}: ShippingMethodSelectorProps) {
  const t = useTranslations();

  const methods: {
    id: ShippingMethod;
    label: string;
    description: string;
    time: string;
  }[] = [
    {
      id: 'standard',
      label: t('tienda.standardShipping'),
      description: t('tienda.standardShippingDesc'),
      time: '5-7 days',
    },
    {
      id: 'express',
      label: t('tienda.expressShipping'),
      description: t('tienda.expressShippingDesc'),
      time: '2-3 days',
    },
    {
      id: 'pickup',
      label: t('tienda.pickupInStore'),
      description: t('tienda.pickupInStoreDesc'),
      time: 'Immediate',
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('checkout.shippingMethod')}</h2>

      <div className="space-y-3">
        {methods.map((method) => (
          <label
            key={method.id}
            className="relative flex items-start border border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition"
          >
            <input
              type="radio"
              name="shipping-method"
              value={method.id}
              checked={selectedMethod === method.id}
              onChange={(e) => onChange(e.target.value as ShippingMethod)}
              className="mt-1 w-4 h-4 text-[#D97757] border-gray-300 focus:ring-2 focus:ring-[#D97757] cursor-pointer"
              aria-label={method.label}
            />

            <div className="ml-4 flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900">{method.label}</p>
                <p className="text-lg font-bold text-[#D97757]">
                  ${costs[method.id]?.toFixed(2) || '0.00'}
                </p>
              </div>
              <p className="text-sm text-gray-600 mt-1">{method.description}</p>
              <p className="text-xs text-gray-500 mt-2">{t('common.estimatedDelivery')}: {method.time}</p>
            </div>

            {/* Radio Circle */}
            <div
              className={`absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                selectedMethod === method.id
                  ? 'border-[#D97757] bg-[#D97757]'
                  : 'border-gray-300'
              }`}
            >
              {selectedMethod === method.id && (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
            </div>
          </label>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          {t('checkout.shippingInfo')}: {
            selectedMethod === 'pickup'
              ? t('tienda.pickupAddress')
              : t('checkout.shippingDelivery')
          }
        </p>
      </div>
    </div>
  );
}
