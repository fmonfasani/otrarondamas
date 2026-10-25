/**
 * Input Component Types
 *
 * Defines strict TypeScript interfaces for the Input component.
 * Extends HTMLInputElement attributes for full HTML compatibility.
 */

import React from 'react';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'time';

export type InputSize = 'sm' | 'md' | 'lg' | 'xl';

export type InputVariant = 'default' | 'error' | 'success';

export interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type' | 'ref'
> {
  /**
   * Input field type
   * @default 'text'
   */
  type?: InputType;

  /**
   * Size of the input field
   * @default 'md'
   */
  size?: InputSize;

  /**
   * Visual variant (default, error, success)
   * @default 'default'
   */
  variant?: InputVariant;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Whether the input is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Optional icon element to display inside the input
   */
  icon?: React.ReactNode;

  /**
   * Error message to display
   */
  error?: string;

  /**
   * Helper text to display below the input
   */
  helperText?: string;

  /**
   * Maximum length of input
   */
  maxLength?: number;

  /**
   * Regular expression pattern for validation
   */
  pattern?: string;

  /**
   * Change handler
   */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;

  /**
   * Focus handler
   */
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;

  /**
   * Blur handler
   */
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;

  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Accessibility label
   */
  'aria-label'?: string;

  /**
   * Accessibility described by
   */
  'aria-describedby'?: string;
}
