import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutForm } from './CheckoutForm';
import type { ItemCarrito } from '../features/carrito/useCarrito';

describe('CheckoutForm', () => {
  const mockItems: ItemCarrito[] = [
    {
      producto: {
        productoId: '1',
        nombre: 'Test Product',
        precio: 100,
        disponible: 10,
      } as any,
      cantidad: 2,
    },
  ];

  it('renders all form fields', () => {
    const handleSubmit = vi.fn();
    render(<CheckoutForm items={mockItems} onSubmit={handleSubmit} />);

    expect(screen.getByTestId('input-nombre')).toBeInTheDocument();
    expect(screen.getByTestId('input-email')).toBeInTheDocument();
    expect(screen.getByTestId('input-telefono')).toBeInTheDocument();
  });

  it('displays order summary', () => {
    const handleSubmit = vi.fn();
    render(<CheckoutForm items={mockItems} onSubmit={handleSubmit} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
  });

  it('validates nombre field', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<CheckoutForm items={mockItems} onSubmit={handleSubmit} />);

    const nombreInput = screen.getByTestId('input-nombre');
    await user.click(nombreInput);
    await user.type(nombreInput, 'ab');
    await user.click(screen.getByTestId('submit-button'));

    expect(screen.getByText('Ingresa un nombre válido')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('validates email field', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<CheckoutForm items={mockItems} onSubmit={handleSubmit} />);

    const emailInput = screen.getByTestId('input-email');
    await user.click(emailInput);
    await user.type(emailInput, 'invalid-email');
    await user.click(screen.getByTestId('submit-button'));

    expect(screen.getByText('Email inválido')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CheckoutForm items={mockItems} onSubmit={handleSubmit} />);

    await user.type(screen.getByTestId('input-nombre'), 'Juan Pérez');
    await user.type(screen.getByTestId('input-email'), 'juan@example.com');
    await user.type(screen.getByTestId('input-telefono'), '+54 123 456 7890');

    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        telefono: '+54 123 456 7890',
      });
    });
  });

  it('makes telefono optional', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CheckoutForm items={mockItems} onSubmit={handleSubmit} />);

    await user.type(screen.getByTestId('input-nombre'), 'Juan Pérez');
    await user.type(screen.getByTestId('input-email'), 'juan@example.com');

    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        telefono: '',
      });
    });
  });

  it('disables form when loading', async () => {
    const handleSubmit = vi.fn();
    render(<CheckoutForm items={mockItems} onSubmit={handleSubmit} isLoading={true} />);

    expect(screen.getByTestId('input-nombre')).toBeDisabled();
    expect(screen.getByTestId('input-email')).toBeDisabled();
    expect(screen.getByTestId('input-telefono')).toBeDisabled();
    expect(screen.getByTestId('submit-button')).toBeDisabled();
  });

  it('calls onError callback on submission error', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockRejectedValue(new Error('API Error'));
    const handleError = vi.fn();

    render(<CheckoutForm items={mockItems} onSubmit={handleSubmit} onError={handleError} />);

    await user.type(screen.getByTestId('input-nombre'), 'Juan Pérez');
    await user.type(screen.getByTestId('input-email'), 'juan@example.com');

    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(handleError).toHaveBeenCalledWith('API Error');
    });
  });

  it('calls onSuccess callback on successful submission', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const handleSuccess = vi.fn();

    render(<CheckoutForm items={mockItems} onSubmit={handleSubmit} onSuccess={handleSuccess} />);

    await user.type(screen.getByTestId('input-nombre'), 'Juan Pérez');
    await user.type(screen.getByTestId('input-email'), 'juan@example.com');

    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledWith('Pedido confirmado exitosamente');
    });
  });

  it('validates telefono format', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<CheckoutForm items={mockItems} onSubmit={handleSubmit} />);

    const telefonoInput = screen.getByTestId('input-telefono');
    await user.click(telefonoInput);
    await user.type(telefonoInput, 'invalid@@telefono');
    await user.click(screen.getByTestId('submit-button'));

    expect(screen.getByText('Teléfono inválido')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('has accessibility attributes', () => {
    const handleSubmit = vi.fn();
    render(<CheckoutForm items={mockItems} onSubmit={handleSubmit} />);

    expect(screen.getByTestId('checkout-form')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre y apellido/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
  });
});
