/**
 * Button Component
 *
 * A flexible, accessible button component with multiple variants and sizes.
 * Supports loading and disabled states with keyboard accessibility.
 */

import React from 'react';
import { cn } from '../../../utils/cn';
import { BUTTON_VARIANTS, BUTTON_SIZES } from '../../../lib/constants';
import { ButtonProps } from './Button.types';

/**
 * Button Component
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="outline" size="lg" disabled>Disabled</Button>
 * <Button loading icon={<Spinner />}>Loading...</Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      icon,
      children,
      className,
      onClick,
      type = 'button',
      'aria-label': ariaLabel,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    const baseClasses = cn(
      // Base button styles
      'inline-flex items-center justify-center',
      'font-sans transition-all duration-200',
      'rounded-lg border-0 cursor-pointer',
      'focus:outline-none focus:ring-2',
      'active:scale-95',
      // Variant styling
      BUTTON_VARIANTS[variant],
      // Size styling
      BUTTON_SIZES[size],
      // Disabled state
      isDisabled && 'opacity-50 cursor-not-allowed',
      // Custom className
      className,
    );

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={baseClasses}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-busy={loading}
        {...rest}
      >
        {loading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {children}
          </>
        ) : (
          <>
            {icon && <span className="mr-2">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export type { ButtonProps } from './Button.types';
