/**
 * Input Component
 *
 * A flexible, accessible text input component with multiple sizes,
 * variants for error/success states, and support for icons.
 */

import React from 'react';
import { cn } from '../../../utils/cn';
import { InputProps } from './Input.types';

const INPUT_SIZE_CLASSES = {
  sm: 'px-3 py-2 text-small h-8',
  md: 'px-4 py-2 text-body h-10',
  lg: 'px-4 py-3 text-body h-12',
  xl: 'px-6 py-4 text-body h-14',
} as const;

const INPUT_VARIANT_CLASSES = {
  default: 'border border-brand-border focus:border-brand-focus',
  error: 'border border-status-error focus:border-status-error',
  success: 'border border-status-success focus:border-status-success',
} as const;

/**
 * Input Component
 *
 * @example
 * ```tsx
 * <Input type="email" placeholder="Enter email" />
 * <Input error="Email is invalid" />
 * <Input icon={<SearchIcon />} placeholder="Search..." />
 * ```
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      size = 'md',
      variant = 'default',
      placeholder,
      disabled = false,
      icon,
      error,
      helperText,
      maxLength,
      pattern,
      className,
      onChange,
      onFocus,
      onBlur,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      ...rest
    },
    ref,
  ) => {
    const errorId = error ? `${rest.id}-error` : undefined;
    const helperId = helperText ? `${rest.id}-helper` : undefined;
    const describedBy =
      ariaDescribedBy || [errorId, helperId].filter(Boolean).join(' ') || undefined;

    // Determine variant based on error state
    const displayVariant = error ? 'error' : variant;

    const inputClasses = cn(
      // Base input styles
      'w-full bg-brand-surface text-brand-onSurface',
      'rounded-lg border transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-brand-focus',
      'placeholder:text-neutral-50',
      // Size styling
      INPUT_SIZE_CLASSES[size],
      // Variant styling
      INPUT_VARIANT_CLASSES[displayVariant],
      // Icon padding if present
      icon && 'pl-10',
      // Disabled state
      disabled && 'opacity-50 cursor-not-allowed bg-brand-mutedSurface',
      // Custom className
      className,
    );

    const wrapperClasses = cn('relative w-full', 'flex items-center');

    return (
      <div className={wrapperClasses}>
        {/* Icon */}
        {icon && (
          <div className="absolute left-3 flex items-center text-brand-onSurface pointer-events-none">
            {icon}
          </div>
        )}

        {/* Input */}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          pattern={pattern}
          className={inputClasses}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          {...rest}
        />

        {/* Error Message */}
        {error && (
          <div id={errorId} className="mt-1 text-small text-status-error" role="alert">
            {error}
          </div>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <div id={helperId} className="mt-1 text-small text-neutral-900 opacity-60">
            {helperText}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export type { InputProps } from './Input.types';
