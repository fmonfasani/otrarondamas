/**
 * Button Component Types
 *
 * Defines strict TypeScript interfaces for the Button component.
 * Extends HTMLButtonElement attributes for full HTML compatibility.
 */

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual variant of the button
   * @default 'primary'
   */
  variant?: ButtonVariant;

  /**
   * Size of the button
   * @default 'md'
   */
  size?: ButtonSize;

  /**
   * Whether the button is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether the button is in loading state
   * @default false
   */
  loading?: boolean;

  /**
   * Optional icon element to display before children
   */
  icon?: React.ReactNode;

  /**
   * Button content
   */
  children?: React.ReactNode;

  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Click handler
   */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;

  /**
   * Accessibility label
   */
  'aria-label'?: string;
}
