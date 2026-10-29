/**
 * Shipping Address Form - Step 1 of checkout
 * Collects customer name, email, phone, and delivery address
 */

import React from 'react';
import { ShippingAddressInput, ShippingAddressSchema } from './checkout.schema';

export interface ShippingAddressFormProps {
  onSubmit: (data: ShippingAddressInput) => void;
  onBack?: () => void;
  isLoading?: boolean;
  initialData?: Partial<ShippingAddressInput>;
}

export const ShippingAddressForm = React.forwardRef<
  HTMLFormElement,
  ShippingAddressFormProps
>(({ onSubmit, onBack, isLoading = false, initialData = {} }, ref) => {
  const [formData, setFormData] = React.useState<Partial<ShippingAddressInput>>(
    initialData
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = ShippingAddressSchema.parse(formData);
      onSubmit(validatedData);
    } catch (error: any) {
      const newErrors: Record<string, string> = {};
      error.errors?.forEach((err: any) => {
        newErrors[err.path[0]] = err.message;
      });
      setErrors(newErrors);
    }
  };

  const countries = [
    'Argentina',
    'Bolivia',
    'Brazil',
    'Chile',
    'Colombia',
    'Costa Rica',
    'Cuba',
    'Dominican Republic',
    'Ecuador',
    'El Salvador',
    'Guatemala',
    'Haiti',
    'Honduras',
    'Mexico',
    'Nicaragua',
    'Panama',
    'Paraguay',
    'Peru',
    'Uruguay',
    'Venezuela',
  ];

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* First Name */}
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName || ''}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
              errors.firstName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="John"
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName || ''}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
              errors.lastName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email || ''}
          onChange={handleChange}
          disabled={isLoading}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="john@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-500">{errors.email}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number *
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone || ''}
          onChange={handleChange}
          disabled={isLoading}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
            errors.phone ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="+1 (555) 123-4567"
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
        )}
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
          Street Address *
        </label>
        <input
          type="text"
          id="address"
          name="address"
          value={formData.address || ''}
          onChange={handleChange}
          disabled={isLoading}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
            errors.address ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="123 Main Street"
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-500">{errors.address}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* City */}
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            City *
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city || ''}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
              errors.city ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="New York"
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-500">{errors.city}</p>
          )}
        </div>

        {/* ZIP Code */}
        <div>
          <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
            ZIP Code *
          </label>
          <input
            type="text"
            id="zipCode"
            name="zipCode"
            value={formData.zipCode || ''}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
              errors.zipCode ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="10001"
          />
          {errors.zipCode && (
            <p className="mt-1 text-sm text-red-500">{errors.zipCode}</p>
          )}
        </div>
      </div>

      {/* Country */}
      <div>
        <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
          Country *
        </label>
        <select
          id="country"
          name="country"
          value={formData.country || ''}
          onChange={handleChange}
          disabled={isLoading}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
            errors.country ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select a country</option>
          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
        {errors.country && (
          <p className="mt-1 text-sm text-red-500">{errors.country}</p>
        )}
      </div>

      {/* Save as default address */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="saveAsDefault"
          name="saveAsDefault"
          checked={formData.saveAsDefault || false}
          onChange={handleChange}
          disabled={isLoading}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="saveAsDefault" className="ml-2 block text-sm text-gray-700">
          Save this address as my default shipping address
        </label>
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
            'Continue to Shipping'
          )}
        </button>
      </div>
    </form>
  );
});

ShippingAddressForm.displayName = 'ShippingAddressForm';
