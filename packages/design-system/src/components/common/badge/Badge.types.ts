/**
 * Badge Component Types
 *
 * Defines strict TypeScript interfaces for the Badge component.
 */

import React from 'react';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  /**
   * Visual variant of the badge
   * @default 'primary'
   */
  variant?: BadgeVariant;

  /**
   * Size of the badge
   * @default 'md'
   */
  size?: BadgeSize;

  /**
   * Badge content
   */
  children?: React.ReactNode;

  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Custom test id
   */
  'data-testid'?: string;
}
