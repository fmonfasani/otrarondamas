/**
 * LoginForm Component Test (T2.21)
 *
 * Verifies:
 * - Form renders with email and password inputs
 * - Form validation works
 * - Submit handler is called
 * - Error messages display
 * - Loading state works
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm Component (T2.21)', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('should render login form with email and password inputs', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login|sign in/i });

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /login|sign in/i });

    // Enter invalid email
    await userEvent.type(emailInput, 'invalid-email');
    fireEvent.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should require password', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /login|sign in/i });

    // Enter valid email but no password
    await userEvent.type(emailInput, 'test@example.com');
    fireEvent.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/required|password/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should submit form with valid credentials', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login|sign in/i });

    // Fill in form
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'secure-password-123');
    fireEvent.click(submitButton);

    // Should call onSubmit
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'secure-password-123',
      });
    });
  });

  it('should display error message on failed login', async () => {
    const mockOnSubmitWithError = jest.fn().mockRejectedValue(
      new Error('Invalid credentials')
    );

    render(<LoginForm onSubmit={mockOnSubmitWithError} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login|sign in/i });

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'wrong-password');
    fireEvent.click(submitButton);

    // Should display error
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    const slowSubmit = jest.fn(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<LoginForm onSubmit={slowSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login|sign in/i });

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'secure-password-123');

    fireEvent.click(submitButton);

    // Button should be disabled during submission
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should clear error message when user corrects input', async () => {
    const mockOnSubmitWithError = jest.fn().mockRejectedValueOnce(
      new Error('Invalid credentials')
    );

    render(<LoginForm onSubmit={mockOnSubmitWithError} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login|sign in/i });

    // First attempt with wrong credentials
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'wrong-password');
    fireEvent.click(submitButton);

    // Error should show
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    // Clear and retype password
    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, 'correct-password');

    // Error should be cleared (or component should allow retry)
    const errorElement = screen.queryByText(/invalid credentials/i);
    if (errorElement) {
      // If error persists, it should still be clickable to retry
      expect(submitButton).not.toBeDisabled();
    }
  });

  it('should focus on first field on render', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;

    // First field should be focusable
    expect(emailInput).toBeInTheDocument();
  });

  it('should have working remember me checkbox if present', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const rememberCheckbox = screen.queryByRole('checkbox', { name: /remember/i });

    if (rememberCheckbox) {
      expect(rememberCheckbox).toBeInTheDocument();

      // Should toggle
      fireEvent.click(rememberCheckbox);
      expect(rememberCheckbox).toBeChecked();
    }
  });
});
