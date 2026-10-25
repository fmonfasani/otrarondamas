/**
 * Badge Component
 *
 * A small component for displaying status, labels, or categories.
 * Supports 6 variants and 2 sizes.
 */

import React from 'react';
import { cn } from '../../../utils/cn';
import { BadgeProps } from './Badge.types';

const BADGE_VARIANT_CLASSES: Record<string, string> = {
  primary: 'bg-brand-primary text-brand-onPrimary',
  secondary: 'bg-brand-secondary text-brand-onSecondary',
  success: 'bg-status-success text-white',
  warning: 'bg-status-warning text-neutral-900',
  danger: 'bg-status-error text-white',
  info: 'bg-status-info text-white',
  neutral: 'bg-neutral-50 text-neutral-900 border border-brand-border',
};

const BADGE_SIZE_CLASSES: Record<string, string> = {
  sm: 'px-2 py-1 text-tiny font-medium rounded',
  md: 'px-3 py-1.5 text-label font-medium rounded-md',
};

/**
 * Badge Component
 *
 * @example
 * ```tsx
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning" size="sm">Pending</Badge>
 * <Badge variant="danger">Error</Badge>
 * ```
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { variant = 'primary', size = 'md', children, className, 'data-testid': dataTestId, ...rest },
    ref,
  ) => {
    const badgeClasses = cn(
      // Base badge styles
      'inline-flex items-center justify-center',
      'whitespace-nowrap font-sans transition-colors duration-200',
      // Variant styling
      BADGE_VARIANT_CLASSES[variant],
      // Size styling
      BADGE_SIZE_CLASSES[size],
      // Custom className
      className,
    );

    return (
      <span ref={ref} className={badgeClasses} data-testid={dataTestId} {...rest}>
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';

export type { BadgeProps } from './Badge.types';
