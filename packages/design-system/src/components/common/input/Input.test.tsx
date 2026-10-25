/**
 * Input Component Tests
 *
 * Comprehensive test suite for the Input component including:
 * - Rendering and attributes
 * - All variants and sizes
 * - Disabled and error states
 * - Event handlers and accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input Component', () => {
  // ========================================================================
  // Basic Rendering Tests
  // ========================================================================

  it('should render an input element', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('should render with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText(/enter text/i);
    expect(input).toBeInTheDocument();
  });

  it('should render with default type="text"', () => {
    render(<Input data-testid="test-input" />);
    const input = screen.getByTestId('test-input') as HTMLInputElement;
    expect(input.type).toBe('text');
  });

  // ========================================================================
  // Type Attribute Tests
  // ========================================================================

  it('should accept email type', () => {
    render(<Input type="email" data-testid="test-input" />);
    const input = screen.getByTestId('test-input') as HTMLInputElement;
    expect(input.type).toBe('email');
  });

  it('should accept password type', () => {
    render(<Input type="password" data-testid="test-input" />);
    const input = screen.getByTestId('test-input') as HTMLInputElement;
    expect(input.type).toBe('password');
  });

  it('should accept number type', () => {
    render(<Input type="number" data-testid="test-input" />);
    const input = screen.getByTestId('test-input') as HTMLInputElement;
    expect(input.type).toBe('number');
  });

  // ========================================================================
  // Size Tests
  // ========================================================================

  it('should render all 4 sizes correctly', () => {
    const sizes = ['sm', 'md', 'lg', 'xl'] as const;

    sizes.forEach((size) => {
      const { container } = render(<Input size={size} data-testid={`input-${size}`} />);

      const input = container.querySelector(`[data-testid="input-${size}"]`);
      expect(input).toBeInTheDocument();
    });
  });

  it('should apply sm size styles', () => {
    render(<Input size="sm" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/h-8/);
  });

  it('should apply lg size styles', () => {
    render(<Input size="lg" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/h-12/);
  });

  // ========================================================================
  // Variant Tests
  // ========================================================================

  it('should have default variant styles', () => {
    render(<Input variant="default" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/border/);
  });

  it('should apply error variant when error prop is set', () => {
    render(<Input error="This is an error" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/border-status-error/);
  });

  it('should apply success variant', () => {
    render(<Input variant="success" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/border-status-success/);
  });

  // ========================================================================
  // Error State Tests
  // ========================================================================

  it('should display error message', () => {
    render(<Input error="Email is invalid" />);
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent(/email is invalid/i);
  });

  it('should have error styling when error is present', () => {
    render(<Input error="Error message" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/border-status-error/);
  });

  it('should not display error message when not provided', () => {
    render(<Input />);
    const alert = screen.queryByRole('alert');
    expect(alert).not.toBeInTheDocument();
  });

  // ========================================================================
  // Helper Text Tests
  // ========================================================================

  it('should display helper text', () => {
    render(<Input helperText="This is a hint" />);
    const helper = screen.getByText(/this is a hint/i);
    expect(helper).toBeInTheDocument();
  });

  it('should not display helper text when error is present', () => {
    render(<Input helperText="Helper" error="Error" />);
    const helper = screen.queryByText(/helper/i);
    expect(helper).not.toBeInTheDocument();
  });

  // ========================================================================
  // Disabled State Tests
  // ========================================================================

  it('should handle disabled state', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('should apply disabled styling', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/opacity-50/);
  });

  // ========================================================================
  // Icon Tests
  // ========================================================================

  it('should render with icon', () => {
    render(<Input icon={<span data-testid="test-icon">🔍</span>} />);

    const icon = screen.getByTestId('test-icon');
    expect(icon).toBeInTheDocument();
  });

  it('should apply icon padding to input', () => {
    render(<Input icon={<span>🔍</span>} />);

    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/pl-10/);
  });

  // ========================================================================
  // Event Handler Tests
  // ========================================================================

  it('should handle onChange events', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('should handle onFocus events', () => {
    const handleFocus = jest.fn();
    render(<Input onFocus={handleFocus} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    expect(handleFocus).toHaveBeenCalledTimes(1);
  });

  it('should handle onBlur events', () => {
    const handleBlur = jest.fn();
    render(<Input onBlur={handleBlur} />);

    const input = screen.getByRole('textbox');
    fireEvent.blur(input);

    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  // ========================================================================
  // Input Constraint Tests
  // ========================================================================

  it('should respect maxLength constraint', () => {
    render(<Input maxLength={5} data-testid="test-input" />);
    const input = screen.getByTestId('test-input') as HTMLInputElement;
    expect(input.maxLength).toBe(5);
  });

  it('should accept pattern attribute', () => {
    const pattern = '^[0-9]*$';
    render(<Input pattern={pattern} data-testid="test-input" />);
    const input = screen.getByTestId('test-input');
    expect(input).toHaveAttribute('pattern', pattern);
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  it('should support aria-label attribute', () => {
    render(<Input aria-label="Email input" />);
    const input = screen.getByRole('textbox', { name: /email input/i });
    expect(input).toBeInTheDocument();
  });

  it('should support aria-describedby attribute', () => {
    render(<Input aria-describedby="description" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'description');
  });

  it('should set aria-describedby to include error id', () => {
    render(<Input id="email" error="Invalid email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('email-error'));
  });

  it('should set aria-describedby to include helper id', () => {
    render(<Input id="email" helperText="Enter your email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('email-helper'));
  });

  // ========================================================================
  // CSS Class Tests
  // ========================================================================

  it('should apply custom className', () => {
    render(<Input className="custom-class" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/custom-class/);
  });

  it('should have focus ring styles', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/focus:ring-2/);
  });
});
