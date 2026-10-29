'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShippingAddressSchema, type ShippingAddress } from '@/lib/validation/checkout.schema';

interface ShippingAddressFormProps {
  data: Partial<ShippingAddress>;
  onChange: (data: ShippingAddress) => void;
}

/**
 * Shipping address form component
 * - Street, city, postal code, phone, country
 * - Real-time validation with Zod
 * - Optional fields: state, apartment
 * - ARIA labels for accessibility
 */
export default function ShippingAddressForm({
  data,
  onChange,
}: ShippingAddressFormProps) {
  const t = useTranslations();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof ShippingAddress, value: string) => {
    const newData = {
      ...data,
      [field]: value,
    } as Partial<ShippingAddress>;

    // Validate the field
    const fieldSchema = ShippingAddressSchema.pick({ [field]: true });
    const result = fieldSchema.safeParse({ [field]: value });

    if (result.success) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    } else {
      setErrors((prev) => ({
        ...prev,
        [field]: result.error.errors[0]?.message || 'Invalid input',
      }));
    }

    // Try to validate complete form
    const completeResult = ShippingAddressSchema.safeParse(newData);
    if (completeResult.success) {
      onChange(completeResult.data);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('checkout.shippingAddress')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Street */}
        <div className="md:col-span-2">
          <label
            htmlFor="street"
            className="block text-sm font-medium text-gray-900 mb-2"
          >
            {t('checkout.street')} *
          </label>
          <input
            id="street"
            type="text"
            value={data.street || ''}
            onChange={(e) => handleChange('street', e.target.value)}
            placeholder={t('checkout.streetPlaceholder')}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent transition ${
              errors.street ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-label={t('checkout.street')}
            aria-invalid={!!errors.street}
            aria-describedby={errors.street ? 'street-error' : undefined}
          />
          {errors.street && (
            <p id="street-error" className="mt-1 text-sm text-red-600">
              {errors.street}
            </p>
          )}
        </div>

        {/* Apartment (Optional) */}
        <div className="md:col-span-2">
          <label
            htmlFor="apartment"
            className="block text-sm font-medium text-gray-900 mb-2"
          >
            {t('checkout.apartment')} ({t('common.optional')})
          </label>
          <input
            id="apartment"
            type="text"
            value={data.apartment || ''}
            onChange={(e) => handleChange('apartment', e.target.value)}
            placeholder={t('checkout.apartmentPlaceholder')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent transition"
            aria-label={t('checkout.apartment')}
          />
        </div>

        {/* City */}
        <div>
          <label
            htmlFor="city"
            className="block text-sm font-medium text-gray-900 mb-2"
          >
            {t('checkout.city')} *
          </label>
          <input
            id="city"
            type="text"
            value={data.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder={t('checkout.cityPlaceholder')}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent transition ${
              errors.city ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-label={t('checkout.city')}
            aria-invalid={!!errors.city}
            aria-describedby={errors.city ? 'city-error' : undefined}
          />
          {errors.city && (
            <p id="city-error" className="mt-1 text-sm text-red-600">
              {errors.city}
            </p>
          )}
        </div>

        {/* Postal Code */}
        <div>
          <label
            htmlFor="postalCode"
            className="block text-sm font-medium text-gray-900 mb-2"
          >
            {t('checkout.postalCode')} *
          </label>
          <input
            id="postalCode"
            type="text"
            value={data.postalCode || ''}
            onChange={(e) => handleChange('postalCode', e.target.value)}
            placeholder={t('checkout.postalCodePlaceholder')}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent transition ${
              errors.postalCode ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-label={t('checkout.postalCode')}
            aria-invalid={!!errors.postalCode}
            aria-describedby={errors.postalCode ? 'postalCode-error' : undefined}
          />
          {errors.postalCode && (
            <p id="postalCode-error" className="mt-1 text-sm text-red-600">
              {errors.postalCode}
            </p>
          )}
        </div>

        {/* State (Optional) */}
        <div>
          <label
            htmlFor="state"
            className="block text-sm font-medium text-gray-900 mb-2"
          >
            {t('checkout.state')} ({t('common.optional')})
          </label>
          <input
            id="state"
            type="text"
            value={data.state || ''}
            onChange={(e) => handleChange('state', e.target.value)}
            placeholder={t('checkout.statePlaceholder')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent transition"
            aria-label={t('checkout.state')}
          />
        </div>

        {/* Country */}
        <div>
          <label
            htmlFor="country"
            className="block text-sm font-medium text-gray-900 mb-2"
          >
            {t('checkout.country')} *
          </label>
          <select
            id="country"
            value={data.country || 'AR'}
            onChange={(e) => handleChange('country', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent transition ${
              errors.country ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-label={t('checkout.country')}
            aria-invalid={!!errors.country}
            aria-describedby={errors.country ? 'country-error' : undefined}
          >
            <option value="AR">Argentina</option>
            <option value="BR">Brazil</option>
            <option value="CL">Chile</option>
            <option value="CO">Colombia</option>
            <option value="MX">Mexico</option>
            <option value="US">United States</option>
          </select>
          {errors.country && (
            <p id="country-error" className="mt-1 text-sm text-red-600">
              {errors.country}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-900 mb-2"
          >
            {t('checkout.phone')} *
          </label>
          <input
            id="phone"
            type="tel"
            value={data.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder={t('checkout.phonePlaceholder')}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#D97757] focus:border-transparent transition ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-label={t('checkout.phone')}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
          />
          {errors.phone && (
            <p id="phone-error" className="mt-1 text-sm text-red-600">
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-600">{t('common.requiredFields')}</p>
    </div>
  );
}
