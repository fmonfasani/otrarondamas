/**
 * RatingFilter - Star rating filter (>= X stars)
 * Displays rating options with product counts
 */

import React from 'react';

export interface RatingDistribution {
  rating: number;
  count: number;
}

export interface RatingFilterProps {
  minRating: number;
  onMinRatingChange: (rating: number) => void;
  ratingDistribution?: RatingDistribution[];
  totalProducts?: number;
}

export const RatingFilter = React.forwardRef<HTMLDivElement, RatingFilterProps>(
  (
    {
      minRating,
      onMinRatingChange,
      ratingDistribution = [
        { rating: 5, count: 245 },
        { rating: 4, count: 189 },
        { rating: 3, count: 78 },
        { rating: 2, count: 32 },
        { rating: 1, count: 18 },
      ],
      totalProducts = 562,
    },
    ref
  ) => {
    const renderStars = (value: number, interactive = false, onClick?: () => void) => {
      return (
        <button
          onClick={onClick}
          disabled={!interactive}
          className={interactive ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
        >
          <div className="flex gap-1 items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-4 h-4 ${
                  star <= value
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            ))}
          </div>
        </button>
      );
    };

    return (
      <div ref={ref} className="space-y-4">
        <h3 className="font-semibold text-gray-900">Calificación</h3>

        <div className="space-y-3">
          {/* Show All Option */}
          <button
            onClick={() => onMinRatingChange(0)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
              minRating === 0
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'hover:bg-gray-50 border border-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Todas las calificaciones</span>
              <span className="text-xs text-gray-500">({totalProducts})</span>
            </div>
          </button>

          {/* Rating Options */}
          {ratingDistribution.map(({ rating, count }) => {
            const isSelected = minRating === rating;
            const percentage = totalProducts > 0 ? (count / totalProducts) * 100 : 0;

            return (
              <button
                key={rating}
                onClick={() => onMinRatingChange(rating)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors group ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1">
                    {renderStars(rating, true)}
                    <span className="text-xs text-gray-600 whitespace-nowrap">
                      {rating === 5 ? '5' : `${rating}+`} estrellas
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">({count})</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Reset Button */}
        {minRating > 0 && (
          <button
            onClick={() => onMinRatingChange(0)}
            className="w-full py-2 px-3 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 mt-4"
          >
            Limpiar filtro de calificación
          </button>
        )}

        {/* Info Box */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mt-4">
          <p className="text-xs text-gray-600">
            <svg
              className="w-4 h-4 inline-block mr-1 align-text-top"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2z"
                clipRule="evenodd"
              />
            </svg>
            Las calificaciones provienen de clientes verificados
          </p>
        </div>
      </div>
    );
  }
);

RatingFilter.displayName = 'RatingFilter';
