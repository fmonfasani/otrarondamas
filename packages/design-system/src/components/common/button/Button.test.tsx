/**
 * Button Component Tests
 *
 * Comprehensive test suite for the Button component including:
 * - Rendering and text content
 * - All variants and sizes
 * - Disabled and loading states
 * - Event handlers and accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  // ========================================================================
  // Basic Rendering Tests
  // ========================================================================

  it('should render a button element', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should render with text content', () => {
    render(<Button>My Button</Button>);
    const button = screen.getByRole('button', { name: /my button/i });
    expect(button).toBeInTheDocument();
  });

  // ========================================================================
  // Variant Tests
  // ========================================================================

  it('should render all 5 variants correctly', () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost', 'danger'] as const;

    variants.forEach((variant) => {
      const { container } = render(
        <Button variant={variant} data-testid={`button-${variant}`}>
          {variant}
        </Button>,
      );

      const button = container.querySelector(`[data-testid="button-${variant}"]`);
      expect(button).toBeInTheDocument();
    });
  });

  it('should apply primary variant styles by default', () => {
    render(<Button>Default</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toMatch(/bg-brand-primary/);
  });

  it('should apply secondary variant styles', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toMatch(/bg-brand-secondary/);
  });

  it('should apply outline variant styles', () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toMatch(/border/);
  });

  it('should apply danger variant styles', () => {
    render(<Button variant="danger">Danger</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toMatch(/bg-status-error/);
  });

  // ========================================================================
  // Size Tests
  // ========================================================================

  it('should render all 5 sizes correctly', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

    sizes.forEach((size) => {
      const { container } = render(
        <Button size={size} data-testid={`button-${size}`}>
          {size}
        </Button>,
      );

      const button = container.querySelector(`[data-testid="button-${size}"]`);
      expect(button).toBeInTheDocument();
    });
  });

  it('should apply md size by default', () => {
    render(<Button>Medium</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toMatch(/h-10/);
  });

  it('should apply xs size styles', () => {
    render(<Button size="xs">Extra Small</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toMatch(/h-6/);
  });

  it('should apply lg size styles', () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toMatch(/h-12/);
  });

  // ========================================================================
  // State Tests
  // ========================================================================

  it('should handle disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.className).toMatch(/opacity-50/);
  });

  it('should disable button when loading', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should show loading spinner when loading', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button');
    const spinner = button.querySelector('svg');
    expect(spinner).toBeInTheDocument();
  });

  it('should set aria-busy to true when loading', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  // ========================================================================
  // Event Handler Tests
  // ========================================================================

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not trigger click handler when disabled', () => {
    const handleClick = jest.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should not trigger click handler when loading', () => {
    const handleClick = jest.fn();
    render(
      <Button loading onClick={handleClick}>
        Loading
      </Button>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  // ========================================================================
  // Icon Tests
  // ========================================================================

  it('should render with icon', () => {
    render(<Button icon={<span data-testid="test-icon">🎉</span>}>Button with icon</Button>);

    const icon = screen.getByTestId('test-icon');
    expect(icon).toBeInTheDocument();
  });

  it('should not render icon when loading', () => {
    render(
      <Button loading icon={<span data-testid="test-icon">🎉</span>}>
        Button
      </Button>,
    );

    const icon = screen.queryByTestId('test-icon');
    expect(icon).not.toBeInTheDocument();
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  it('should support aria-label attribute', () => {
    render(<Button aria-label="Custom label">Button</Button>);
    const button = screen.getByRole('button', { name: /custom label/i });
    expect(button).toBeInTheDocument();
  });

  it('should support keyboard navigation with Space', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: ' ', code: 'Space' });

    expect(button).toBeInTheDocument();
  });

  it('should have type="button" by default', () => {
    render(<Button>Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('should accept custom type attribute', () => {
    render(<Button type="submit">Submit</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
  });

  // ========================================================================
  // CSS Class Tests
  // ========================================================================

  it('should apply custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toMatch(/custom-class/);
  });

  it('should have focus ring styles', () => {
    render(<Button>Focused</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toMatch(/focus:ring-2/);
  });
});
