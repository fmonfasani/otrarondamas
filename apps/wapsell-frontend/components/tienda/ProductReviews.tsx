'use client';

import { useTranslations } from 'next-intl';

interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  createdAt: string;
  verified?: boolean;
}

interface ProductReviewsProps {
  reviews: Review[];
  averageRating?: number;
  totalReviews?: number;
}

/**
 * Product reviews display component
 * - Shows average rating and review count
 * - Star rating visualization
 * - Individual review cards
 * - Verified purchase badge
 */
export default function ProductReviews({
  reviews,
  averageRating = 0,
  totalReviews = 0,
}: ProductReviewsProps) {
  const t = useTranslations();

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
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
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <div>
            <p className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
            <p className="text-sm text-gray-600">{t('common.outOf')} 5</p>
          </div>
          <div className="flex-1">
            {renderStars(Math.round(averageRating))}
            <p className="text-sm text-gray-600 mt-2">
              {totalReviews} {totalReviews === 1 ? t('common.review') : t('common.reviews')}
            </p>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">{t('common.customerReviews')}</h3>
          {reviews.map((review) => (
            <div key={review.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{review.author}</p>
                  {review.verified && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded font-medium">
                      {t('common.verifiedPurchase')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>

              {renderStars(review.rating)}

              <p className="text-gray-700 mt-3 text-sm">{review.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">{t('common.noReviewsYet')}</p>
        </div>
      )}
    </div>
  );
}
