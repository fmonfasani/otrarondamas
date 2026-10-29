'use client';

import { useTranslations } from 'next-intl';

interface AvailabilityFilterProps {
  showOutOfStock: boolean;
  onChange: (show: boolean) => void;
}

/**
 * Availability filter component
 * - Toggle to show/hide out of stock items
 * - Simple checkbox with label
 */
export default function AvailabilityFilter({
  showOutOfStock,
  onChange,
}: AvailabilityFilterProps) {
  const t = useTranslations();

  return (
    <div className="border-b border-gray-200 pb-6 last:border-b-0">
      <h3 className="font-semibold text-gray-900 mb-4">{t('tienda.availability')}</h3>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!showOutOfStock}
            onChange={(e) => onChange(!e.target.checked)}
            className="w-4 h-4 text-[#D97757] border-gray-300 rounded focus:ring-2 focus:ring-[#D97757]"
            aria-label={t('tienda.inStockOnly')}
          />
          <span className="text-sm text-gray-700">{t('tienda.inStock')}</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showOutOfStock}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 text-[#D97757] border-gray-300 rounded focus:ring-2 focus:ring-[#D97757]"
            aria-label={t('tienda.showOutOfStock')}
          />
          <span className="text-sm text-gray-700">{t('tienda.outOfStock')}</span>
        </label>
      </div>
    </div>
  );
}
