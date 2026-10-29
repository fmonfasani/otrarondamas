'use client';

import { useTranslations } from 'next-intl';
import ProductCard from '@/components/ProductCard';

interface RelatedProduct {
  id: string;
  nombre: string;
  sku: string;
  precio: number;
  imagen?: string;
  stock: number;
}

interface RelatedProductsProps {
  products: RelatedProduct[];
  title?: string;
}

/**
 * Related products carousel section
 * - "Customers also viewed" or "Related products"
 * - Displays 4-6 related items
 * - Scrollable on mobile, grid on desktop
 */
export default function RelatedProducts({
  products,
  title,
}: RelatedProductsProps) {
  const t = useTranslations();

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="py-8 border-t border-gray-200">
      <h2 className="text-xl font-bold mb-6">
        {title || t('tienda.relatedProducts')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} producto={product} />
        ))}
      </div>
    </section>
  );
}
