/**
 * Button Component Test (T2.20)
 *
 * Verifies:
 * - Button renders with different variants
 * - Props are applied correctly
 * - Click handlers work
 * - Disabled state works
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component (T2.20)', () => {
  it('should render button with default variant', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn');
  });

  it('should render with primary variant', () => {
    render(<Button variant="primary">Primary Button</Button>);
    const button = screen.getByRole('button', { name: /primary button/i });

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn-primary');
  });

  it('should render with secondary variant', () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    const button = screen.getByRole('button', { name: /secondary button/i });

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn-secondary');
  });

  it('should render with danger variant', () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole('button', { name: /delete/i });

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn-danger');
  });

  it('should render disabled button', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button', { name: /disabled button/i });

    expect(button).toBeDisabled();
  });

  it('should call onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });

    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    );
    const button = screen.getByRole('button', { name: /disabled/i });

    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should render with custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button', { name: /custom/i });

    expect(button).toHaveClass('custom-class');
  });

  it('should render with loading state', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button', { name: /loading/i });

    expect(button).toBeDisabled();
    expect(button).toHaveClass('btn-loading');
  });

  it('should support different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let button = screen.getByRole('button', { name: /small/i });
    expect(button).toHaveClass('btn-sm');

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button', { name: /large/i });
    expect(button).toHaveClass('btn-lg');
  });

  it('should render full width button', () => {
    render(<Button fullWidth>Full Width</Button>);
    const button = screen.getByRole('button', { name: /full width/i });

    expect(button).toHaveClass('btn-full-width');
  });
});
