'use client';

import { ReactNode } from 'react';

interface ProductGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Responsive product grid component
 * - 4 columns on desktop (lg)
 * - 2 columns on tablet (md)
 * - 1 column on mobile
 */
export default function ProductGrid({ children, className = '' }: ProductGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {children}
    </div>
  );
}
