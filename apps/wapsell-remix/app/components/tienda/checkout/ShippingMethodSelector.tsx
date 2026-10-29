/**
 * Shipping Method Selector - Step 2 of checkout
 * Allows customer to choose between Standard, Express, or Pickup shipping
 */

import React from 'react';
import { ShippingMethodInput, ShippingMethodSchema, SHIPPING_COSTS, ShippingMethod } from './checkout.schema';

export interface ShippingMethodSelectorProps {
  onSubmit: (data: ShippingMethodInput) => void;
  onBack?: () => void;
  isLoading?: boolean;
  initialData?: Partial<ShippingMethodInput>;
  weight?: number; // Total weight in kg for shipping calculation
  distance?: number; // Distance in km for shipping calculation
}

export const ShippingMethodSelector = React.forwardRef<
  HTMLFormElement,
  ShippingMethodSelectorProps
>(({ onSubmit, onBack, isLoading = false, initialData = {}, weight = 0, distance = 0 }, ref) => {
  const [selectedMethod, setSelectedMethod] = React.useState<ShippingMethod>(
    (initialData.shippingMethod as ShippingMethod) || 'STANDARD'
  );
  const [error, setError] = React.useState<string>('');

  const getShippingInfo = (method: ShippingMethod) => {
    const info = SHIPPING_COSTS[method];
    return {
      method,
      label: method === 'STANDARD' ? 'Standard Shipping' : method === 'EXPRESS' ? 'Express Shipping' : 'Store Pickup',
      description:
        method === 'STANDARD'
          ? 'Delivery in 5-7 business days'
          : method === 'EXPRESS'
            ? 'Delivery in 2-3 business days'
            : 'Pick up at our store today or scheduled time',
      days: info.days,
      cost: info.cost,
    };
  };

  const handleSelectMethod = (method: ShippingMethod) => {
    setSelectedMethod(method);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = ShippingMethodSchema.parse({
        shippingMethod: selectedMethod,
      });
      onSubmit(validatedData);
    } catch (error: any) {
      setError(error.errors?.[0]?.message || 'Invalid shipping method selected');
    }
  };

  const methods: ShippingMethod[] = ['STANDARD', 'EXPRESS', 'PICKUP'];

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
      {/* Shipping Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Order Summary:</strong> {weight} kg | {distance} km distance
        </p>
      </div>

      {/* Shipping Methods */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Select Shipping Method</h3>

        {methods.map((method) => {
          const info = getShippingInfo(method);
          return (
            <label key={method} className="relative flex cursor-pointer">
              <input
                type="radio"
                name="shippingMethod"
                value={method}
                checked={selectedMethod === method}
                onChange={() => handleSelectMethod(method)}
                disabled={isLoading}
                className="sr-only"
              />
              <div
                className={`w-full px-5 py-4 border-2 rounded-lg transition ${
                  selectedMethod === method
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        selectedMethod === method
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedMethod === method && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{info.label}</p>
                      <p className="text-sm text-gray-600 mt-1">{info.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {method === 'PICKUP' ? 'No shipping cost' : `Estimated: ${info.days} days`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {method === 'PICKUP' ? 'FREE' : `$${info.cost.toFixed(2)}`}
                    </p>
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Additional Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Why choose shipping?</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>✓ Secure packaging for safe delivery</li>
          <li>✓ Tracking information provided</li>
          <li>✓ Delivery to your preferred address</li>
        </ul>
      </div>

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
            'Continue to Payment'
          )}
        </button>
      </div>
    </form>
  );
});

ShippingMethodSelector.displayName = 'ShippingMethodSelector';
