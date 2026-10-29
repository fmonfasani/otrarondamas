/**
 * ProductReviews - Reviews list and write review form
 * Displays user reviews with ratings and allows adding new reviews
 */

import React, { useState } from 'react';

export interface Review {
  id: string;
  author: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  helpful?: number;
}

export interface ProductReviewsProps {
  productId: string;
  reviews?: Review[];
  averageRating?: number;
  totalReviews?: number;
  onSubmitReview?: (data: {
    rating: number;
    title: string;
    content: string;
    authorName: string;
  }) => Promise<void>;
  loading?: boolean;
}

export const ProductReviews = React.forwardRef<HTMLDivElement, ProductReviewsProps>(
  (
    {
      productId,
      reviews = [],
      averageRating = 0,
      totalReviews = 0,
      onSubmitReview,
      loading = false,
    },
    ref
  ) => {
    const [isWriting, setIsWriting] = useState(false);
    const [formData, setFormData] = useState({
      authorName: '',
      rating: 5,
      title: '',
      content: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'rating' ? parseInt(value) : value,
      }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!onSubmitReview) return;

      setSubmitting(true);
      try {
        await onSubmitReview(formData);
        setFormData({
          authorName: '',
          rating: 5,
          title: '',
          content: '',
        });
        setIsWriting(false);
      } catch (error) {
        console.error('Error submitting review:', error);
      } finally {
        setSubmitting(false);
      }
    };

    const renderStars = (value: number, interactive = false, onChange?: (rating: number) => void) => {
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onChange?.(star)}
              disabled={!interactive}
              className={`transition-colors ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
              aria-label={`Calificar ${star} estrellas`}
            >
              <svg
                className={`w-5 h-5 ${
                  star <= Math.round(value)
                    ? 'text-yellow-400 fill-yellow-400'
                    : interactive
                      ? 'text-gray-300 hover:text-yellow-300'
                      : 'text-gray-300'
                }`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            </button>
          ))}
        </div>
      );
    };

    const ratingDistribution = [
      { stars: 5, count: Math.round(totalReviews * 0.4) },
      { stars: 4, count: Math.round(totalReviews * 0.3) },
      { stars: 3, count: Math.round(totalReviews * 0.15) },
      { stars: 2, count: Math.round(totalReviews * 0.1) },
      { stars: 1, count: Math.round(totalReviews * 0.05) },
    ];

    if (loading) {
      return (
        <div ref={ref} className="py-8 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      );
    }

    return (
      <div ref={ref} className="py-8">
        <h2 className="text-2xl font-bold mb-6">Reseñas y Opiniones</h2>

        {/* Rating Summary */}
        {totalReviews > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-200">
            {/* Overall Rating */}
            <div className="flex flex-col items-center justify-center">
              <div className="text-5xl font-bold text-gray-900 mb-2">{averageRating.toFixed(1)}</div>
              {renderStars(averageRating)}
              <p className="text-sm text-gray-500 mt-2">{totalReviews} opiniones</p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-3">
              {ratingDistribution.map(({ stars, count }) => {
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 min-w-fit">{stars} ⭐</span>
                    <div className="flex-grow h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 min-w-fit">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Write Review Button */}
        {!isWriting && (
          <button
            onClick={() => setIsWriting(true)}
            className="mb-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Escribir una opinión
          </button>
        )}

        {/* Write Review Form */}
        {isWriting && (
          <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold mb-4">Comparte tu opinión</h3>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="authorName" className="block text-sm font-medium text-gray-700 mb-1">
                  Tu nombre
                </label>
                <input
                  type="text"
                  id="authorName"
                  name="authorName"
                  value={formData.authorName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tu nombre"
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Calificación</label>
                <div className="flex gap-2">
                  {renderStars(formData.rating, true, (rating) =>
                    setFormData((prev) => ({ ...prev, rating }))
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Título de la opinión
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Resumen breve de tu opinión"
                  maxLength={100}
                />
              </div>

              {/* Content */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Tu opinión
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Cuéntanos qué te pareció del producto..."
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">{formData.content.length}/500</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsWriting(false)}
                  disabled={submitting}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Enviando...' : 'Publicar opinión'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Reviews List */}
        <div className="space-y-6">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review.id} className="pb-6 border-b border-gray-200 last:border-0">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{review.title}</p>
                    <p className="text-sm text-gray-500 mt-1">por {review.author}</p>
                  </div>
                  <p className="text-xs text-gray-500">{new Date(review.date).toLocaleDateString()}</p>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  {renderStars(review.rating)}
                  <span className="text-sm text-gray-600">({review.rating}/5)</span>
                </div>

                <p className="text-gray-700 mb-4">{review.content}</p>

                {review.helpful !== undefined && (
                  <div className="flex items-center gap-4 text-sm">
                    <button className="text-gray-500 hover:text-blue-600 transition-colors">
                      👍 Útil ({review.helpful})
                    </button>
                    <button className="text-gray-500 hover:text-blue-600 transition-colors">
                      👎 No útil
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">
              {isWriting ? 'Sé el primero en escribir una opinión' : 'No hay opiniones aún'}
            </p>
          )}
        </div>
      </div>
    );
  }
);

ProductReviews.displayName = 'ProductReviews';
