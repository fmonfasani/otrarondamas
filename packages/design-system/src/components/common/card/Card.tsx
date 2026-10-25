/**
 * Card Component
 *
 * A flexible container component for grouping related content.
 * Supports multiple visual variants and optional interactivity.
 */

import React from 'react';
import { cn } from '../../../utils/cn';
import { CARD_VARIANTS } from '../../../lib/constants';
import { CardProps } from './Card.types';

const INTERACTIVE_CLASSES = 'cursor-pointer transition-all duration-200 hover:shadow-lg';

/**
 * Card Component
 *
 * @example
 * ```tsx
 * <Card>
 *   <h3>Card Title</h3>
 *   <p>Card content goes here</p>
 * </Card>
 *
 * <Card variant="outlined" interactive onClick={handleClick}>
 *   Clickable card
 * </Card>
 * ```
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'elevated',
      children,
      className,
      onClick,
      interactive = false,
      'data-testid': dataTestId,
      ...rest
    },
    ref,
  ) => {
    const cardClasses = cn(
      // Base card styles
      'rounded-lg p-4 transition-all duration-200',
      // Variant styling
      CARD_VARIANTS[variant],
      // Interactive state
      interactive && INTERACTIVE_CLASSES,
      // Custom className
      className,
    );

    return (
      <div
        ref={ref}
        className={cardClasses}
        onClick={onClick}
        role={interactive ? 'button' : 'region'}
        tabIndex={interactive ? 0 : undefined}
        data-testid={dataTestId}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

export type { CardProps } from './Card.types';
