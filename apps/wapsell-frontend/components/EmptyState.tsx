'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface EmptyStateProps {
  message: string;
  action?: string;
  actionLink?: string;
}

export default function EmptyState({ message, action, actionLink }: EmptyStateProps) {
  const t = useTranslations();

  return (
    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
      <div className="mb-6">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">{message}</h3>

      {action && actionLink && <p className="text-gray-600 mb-4">{action}</p>}

      {actionLink && (
        <Link
          href={actionLink}
          className="inline-block px-6 py-2 bg-[#D97757] text-white rounded-lg hover:bg-[#C86543] transition font-medium"
        >
          {action || t('common.backHome')}
        </Link>
      )}
    </div>
  );
}
