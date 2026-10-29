'use client';

import { useTranslations } from 'next-intl';

interface Spec {
  key: string;
  label: string;
  value: string | number;
}

interface ProductSpecsProps {
  specs: Spec[];
  className?: string;
}

/**
 * Product specifications display component
 * - Table layout with key-value pairs
 * - Responsive on mobile (stacked)
 * - Alternating row colors for readability
 */
export default function ProductSpecs({ specs, className = '' }: ProductSpecsProps) {
  const t = useTranslations();

  if (!specs || specs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t('common.noSpecifications')}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-gray-200 ${className}`}>
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-1/3">
              {t('common.specification')}
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              {t('common.value')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {specs.map((spec, index) => (
            <tr key={spec.key} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-6 py-3 text-sm font-medium text-gray-900">{spec.label}</td>
              <td className="px-6 py-3 text-sm text-gray-700">{spec.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
