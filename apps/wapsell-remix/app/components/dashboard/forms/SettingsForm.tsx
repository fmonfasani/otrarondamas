/**
 * Settings Form Component
 * Edit business profile, logo, currency, contact info, and tax ID
 * Uses Remix Form API for server action integration
 */

import { Form } from '@remix-run/react';
import { useState } from 'react';
import FormField from './FormField';
import FormButton from './FormButton';

interface SettingsFormProps {
  tenant: any;
  isLoading?: boolean;
  errors?: Record<string, string[]>;
}

const CURRENCIES = [
  { code: 'ARS', label: 'Argentine Peso (ARS)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'BRL', label: 'Brazilian Real (BRL)' },
  { code: 'CLP', label: 'Chilean Peso (CLP)' },
  { code: 'COP', label: 'Colombian Peso (COP)' },
  { code: 'MXN', label: 'Mexican Peso (MXN)' },
  { code: 'PEN', label: 'Peruvian Sol (PEN)' },
];

export default function SettingsForm({
  tenant,
  isLoading = false,
  errors = {},
}: SettingsFormProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(
    tenant?.logo || null
  );

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Form method="post" className="space-y-8">
      {/* Business Profile Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Business Profile
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Business Name */}
          <FormField
            label="Business Name"
            name="nombre"
            type="text"
            defaultValue={tenant?.nombre || ''}
            required
            error={errors.nombre?.[0]}
            placeholder="Enter your business name"
          />

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              name="currency"
              defaultValue={tenant?.currency || 'ARS'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.currency?.[0] && (
              <p className="text-red-600 text-sm mt-1">{errors.currency[0]}</p>
            )}
          </div>

          {/* Email */}
          <FormField
            label="Business Email"
            name="email"
            type="email"
            defaultValue={tenant?.contactInfo?.email || ''}
            error={errors.email?.[0]}
            placeholder="contact@business.com"
          />

          {/* Phone */}
          <FormField
            label="Phone Number"
            name="phone"
            type="tel"
            defaultValue={tenant?.contactInfo?.phone || ''}
            error={errors.phone?.[0]}
            placeholder="+54 9 11 xxxx-xxxx"
          />

          {/* Tax ID */}
          <FormField
            label="Tax ID / VAT Number"
            name="taxId"
            type="text"
            defaultValue={tenant?.taxId || ''}
            error={errors.taxId?.[0]}
            placeholder="XX-XXXXXXXX"
          />

          {/* Address */}
          <FormField
            label="Address"
            name="address"
            type="text"
            defaultValue={tenant?.contactInfo?.address || ''}
            error={errors.address?.[0]}
            placeholder="Street address"
          />
        </div>

        {/* Description (full width) */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Description
          </label>
          <textarea
            name="description"
            defaultValue={tenant?.description || ''}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="Tell customers about your business"
          />
          {errors.description?.[0] && (
            <p className="text-red-600 text-sm mt-1">{errors.description[0]}</p>
          )}
        </div>
      </div>

      {/* Logo Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Business Logo
        </h2>

        <div className="space-y-4">
          {/* Logo Preview */}
          {logoPreview && (
            <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="max-h-32 max-w-full"
              />
            </div>
          )}

          {/* Logo Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition cursor-pointer">
            <input
              type="file"
              name="logo"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
              id="logo-upload"
            />
            <label htmlFor="logo-upload" className="cursor-pointer">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-sm font-medium text-gray-700">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF up to 10MB
              </p>
            </label>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <FormButton
          type="submit"
          disabled={isLoading}
          isLoading={isLoading}
          label="Save Settings"
        />
      </div>
    </Form>
  );
}
