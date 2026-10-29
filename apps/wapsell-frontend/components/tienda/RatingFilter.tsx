'use client';

import { useTranslations } from 'next-intl';

interface RatingFilterProps {
  selectedRatings: number[];
  onChange: (ratings: number[]) => void;
}

/**
 * Rating filter component
 * - Filter by minimum star rating (1+, 2+, 3+, 4+, 5)
 * - Multiple selection support
 * - Visual star display
 */
export default function RatingFilter({ selectedRatings, onChange }: RatingFilterProps) {
  const t = useTranslations();

  const ratings = [
    { stars: 5, label: t('tienda.5stars') },
    { stars: 4, label: t('tienda.4starsAndUp') },
    { stars: 3, label: t('tienda.3starsAndUp') },
    { stars: 2, label: t('tienda.2starsAndUp') },
    { stars: 1, label: t('tienda.1starAndUp') },
  ];

  const handleToggle = (stars: number) => {
    if (selectedRatings.includes(stars)) {
      onChange(selectedRatings.filter((r) => r !== stars));
    } else {
      onChange([...selectedRatings, stars]);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= count ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="border-b border-gray-200 pb-6 last:border-b-0">
      <button
        onClick={handleClearAll}
        className="text-sm text-[#D97757] hover:underline mb-3 block"
        style={{ visibility: selectedRatings.length > 0 ? 'visible' : 'hidden' }}
      >
        {t('common.clearAll')}
      </button>

      <h3 className="font-semibold text-gray-900 mb-4">{t('tienda.rating')}</h3>

      <div className="space-y-3">
        {ratings.map((rating) => (
          <label key={rating.stars} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={selectedRatings.includes(rating.stars)}
              onChange={() => handleToggle(rating.stars)}
              className="w-4 h-4 text-[#D97757] border-gray-300 rounded focus:ring-2 focus:ring-[#D97757]"
              aria-label={rating.label}
            />
            <span className="flex-1">{renderStars(rating.stars)}</span>
            <span className="text-xs text-gray-500 group-hover:text-gray-700">
              {rating.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
