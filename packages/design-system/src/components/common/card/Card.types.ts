/**
 * Card Component Types
 *
 * Defines strict TypeScript interfaces for the Card component.
 */

import React from 'react';

export type CardVariant = 'elevated' | 'outlined' | 'filled';

export interface CardProps {
  /**
   * Visual variant of the card
   * @default 'elevated'
   */
  variant?: CardVariant;

  /**
   * Card content
   */
  children?: React.ReactNode;

  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Click handler
   */
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;

  /**
   * Whether the card is interactive (clickable)
   * @default false
   */
  interactive?: boolean;

  /**
   * Custom test id
   */
  'data-testid'?: string;
}
