/**
 * Badge Component Tests
 *
 * Comprehensive test suite for the Badge component including:
 * - Rendering and text content
 * - All 6 variants
 * - Both sizes
 * - CSS classes and styling
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge Component', () => {
  // ========================================================================
  // Basic Rendering Tests
  // ========================================================================

  it('should render a badge element', () => {
    render(<Badge data-testid="test-badge">Test Badge</Badge>);
    const badge = screen.getByTestId('test-badge');
    expect(badge).toBeInTheDocument();
  });

  it('should render with text content', () => {
    render(<Badge>Badge Text</Badge>);
    expect(screen.getByText('Badge Text')).toBeInTheDocument();
  });

  // ========================================================================
  // Variant Tests
  // ========================================================================

  it('should render all 6 variants correctly', () => {
    const variants = ['primary', 'success', 'warning', 'danger', 'info', 'neutral'] as const;

    variants.forEach((variant) => {
      const { container } = render(
        <Badge variant={variant} data-testid={`badge-${variant}`}>
          {variant}
        </Badge>,
      );

      const badge = container.querySelector(`[data-testid="badge-${variant}"]`);
      expect(badge).toBeInTheDocument();
    });
  });

  it('should apply primary variant by default', () => {
    render(<Badge data-testid="test-badge">Primary</Badge>);
    const badge = screen.getByTestId('test-badge');
    expect(badge.className).toMatch(/bg-brand-primary/);
  });

  it('should apply primary variant styles', () => {
    render(
      <Badge variant="primary" data-testid="test-badge">
        Primary
      </Badge>,
    );
    const badge = screen.getByTestId('test-badge');
    expect(badge.className).toMatch(/bg-brand-primary/);
    expect(badge.className).toMatch(/text-brand-onPrimary/);
  });

  it('should apply success variant styles', () => {
    render(
      <Badge variant="success" data-testid="test-badge">
        Success
      </Badge>,
    );
    const badge = screen.getByTestId('test-badge');
    expect(badge.className).toMatch(/bg-status-success/);
  });

  it('should apply warning variant styles', () => {
    render(
      <Badge variant="warning" data-testid="test-badge">
        Warning
      </Badge>,
    );
    const badge = screen.getByTestId('test-badge');
    expect(badge.className).toMatch(/bg-status-warning/);
  });

  it('should apply danger variant styles', () => {
    render(
      <Badge variant="danger" data-testid="test-badge">
        Danger
      </Badge>,
    );
    const badge = screen.getByTestId('test-badge');
    expect(badge.className).toMatch(/bg-status-error/);
  });

  it('should apply info variant styles', () => {
    render(
      <Badge variant="info" data-testid="test-badge">
        Info
      </Badge>,
    );
    const badge = screen.getByTestId('test-badge');
    expect(badge.className).toMatch(/bg-status-info/);
  });

  it('should apply neutral variant styles', () => {
    render(
      <Badge variant="neutral" data-testid="test-badge">
        Neutral
      </Badge>,
    );
    const badge = screen.getByTestId('test-badge');
    expect(badge.className).toMatch(/bg-neutral-50/);
    expect(badge.className).toMatch(/border/);
  });

  // ========================================================================
  // Size Tests
  // ========================================================================

  it('should render both sizes correctly', () => {
    const sizes = ['sm', 'md'] as const;

    sizes.forEach((size) => {
      const { container } = render(
        <Badge size={size} data-testid={`badge-${size}`}>
          {size}
        </Badge>,
      );

      const badge = container.querySelector(`[data-testid="badge-${size}"]`);
      expect(badge).toBeInTheDocument();
    });
  });

  it('should apply md size by default', () => {
    render(<Badge data-testid="test-badge">Medium</Badge>);
    const badge = screen.getByTestId('test-badge');
    expect(badge.className).toMatch(/text-label/);
  });

  it('should apply sm size styles', () => {
    render(
      <Badge size="sm" data-testid="test-badge">
        Small
      </Badge>,
    );
    const badge = screen.getByTestId('test-badge');
    expect(badge.className).toMatch(/px-2/);
    expect(badge.className).toMatch(/text-tiny/);
  });

  it('should apply md size styles', () => {
    render(
      <Badge size="md" data-testid="test-badge">
        Medium
      </Badge>,
    );
    const badge = screen.getByTestId('test-badge');
    expect(badge.className).toMatch(/px-3/);
    expect(badge.className).toMatch(/text-label/);
  });

  // ========================================================================
  // CSS Class Tests
  // ========================================================================

  it('should apply custom className', () => {
    render(
      <Badge className="custom-class" data-testid="test-badge">
        Custom
      </Badge>,
    );
    const badge = screen.getByTestId('test-badge');
    expect(badge.className).toMatch(/custom-class/);
  });

  it('should have inline-flex display', () => {
    render(<Badge data-testid="test-badge">Badge</Badge>);
    const badge = screen.getByTestId('test-badge');
    expect(badge.className).toMatch(/inline-flex/);
  });

  it('should have font-medium weight', () => {
    render(<Badge data-testid="test-badge">Badge</Badge>);
    const badge = screen.getByTestId('test-badge');
    expect(badge.className).toMatch(/font-medium/);
  });

  it('should have whitespace nowrap', () => {
    render(<Badge data-testid="test-badge">Badge</Badge>);
    const badge = screen.getByTestId('test-badge');
    expect(badge.className).toMatch(/whitespace-nowrap/);
  });

  // ========================================================================
  // Combination Tests
  // ========================================================================

  it('should combine variant and size correctly', () => {
    render(
      <Badge variant="success" size="sm" data-testid="test-badge">
        Success Small
      </Badge>,
    );
    const badge = screen.getByTestId('test-badge');
    expect(badge.className).toMatch(/bg-status-success/);
    expect(badge.className).toMatch(/px-2/);
  });

  it('should work with multiple badges', () => {
    render(
      <>
        <Badge variant="success" data-testid="badge-1">
          Active
        </Badge>
        <Badge variant="warning" data-testid="badge-2">
          Pending
        </Badge>
        <Badge variant="danger" data-testid="badge-3">
          Error
        </Badge>
      </>,
    );

    expect(screen.getByTestId('badge-1')).toBeInTheDocument();
    expect(screen.getByTestId('badge-2')).toBeInTheDocument();
    expect(screen.getByTestId('badge-3')).toBeInTheDocument();
  });

  // ========================================================================
  // Ref Tests
  // ========================================================================

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(
      <Badge ref={ref} data-testid="test-badge">
        Content
      </Badge>,
    );

    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    expect(ref.current?.textContent).toContain('Content');
  });

  // ========================================================================
  // Content Tests
  // ========================================================================

  it('should render numeric content', () => {
    render(<Badge>5</Badge>);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render special characters', () => {
    render(<Badge>NEW ✓</Badge>);
    expect(screen.getByText('NEW ✓')).toBeInTheDocument();
  });
});
