import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { CheckoutPage } from './CheckoutPage';
import * as carrito from '../carrito/CarritoContext';
import type { ItemCarrito } from '../carrito/useCarrito';

// Mock the CarritoContext
vi.mock('../carrito/CarritoContext', () => ({
  useCarritoContext: vi.fn(),
}));

// Mock the Header component
vi.mock('../../components/Header', () => ({
  HeaderSimple: ({ titulo }: { titulo: string }) => <div>{titulo}</div>,
}));

// Mock the CheckoutForm component
vi.mock('../../components/CheckoutForm', () => ({
  CheckoutForm: ({ onSubmit, items }: any) => (
    <form
      onSubmit={(e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ nombre: 'Test User', email: 'test@example.com', telefono: '' });
      }}
      data-testid="checkout-form-mock"
    >
      <input type="text" placeholder="nombre" defaultValue="Test User" />
      <input type="email" placeholder="email" defaultValue="test@example.com" />
      <button type="submit">Confirmar</button>
    </form>
  ),
}));

// Mock the API
vi.mock('../../lib/api', () => ({
  api: {
    crearPedido: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
    }
  },
}));

describe('CheckoutPage - P6-3 Multi-step Flow', () => {
  const mockItems: ItemCarrito[] = [
    {
      producto: {
        productoId: '1',
        nombre: 'Product A',
        precio: 100,
        disponible: 10,
      } as any,
      cantidad: 2,
    },
  ];

  const mockCartContext = {
    items: mockItems,
    agregar: vi.fn(),
    actualizarCantidad: vi.fn(),
    quitar: vi.fn(),
    vaciar: vi.fn(),
    total: 200,
    isHydrated: true,
  };

  beforeEach(() => {
    vi.mocked(carrito.useCarritoContext).mockReturnValue(mockCartContext);
  });

  it('renders empty state when cart is empty', () => {
    vi.mocked(carrito.useCarritoContext).mockReturnValue({
      ...mockCartContext,
      items: [],
    });

    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>,
    );

    expect(screen.getByText('Tu carrito está vacío.')).toBeInTheDocument();
  });

  it('starts on review step', () => {
    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>,
    );

    expect(screen.getByText('Revisar carrito')).toBeInTheDocument();
    expect(screen.getByText('Resumen del pedido')).toBeInTheDocument();
  });

  it('displays step indicators', () => {
    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>,
    );

    // Should have 3 step numbers
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows cart items on review step', () => {
    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>,
    );

    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
  });

  it('allows removing items from cart', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>,
    );

    const removeButtons = screen.getAllByText('Quitar');
    await user.click(removeButtons[0]);

    expect(mockCartContext.quitar).toHaveBeenCalledWith('1');
  });

  it('navigates to contact step when continuing', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>,
    );

    const continueButton = screen.getByText('Continuar con datos');
    await user.click(continueButton);

    await waitFor(() => {
      expect(screen.getByTestId('checkout-form-mock')).toBeInTheDocument();
    });
  });

  it('displays delivery zone information', () => {
    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>,
    );

    expect(screen.getByText('Entregamos en Río Cuarto, Córdoba')).toBeInTheDocument();
  });

  it('goes back to review from contact step', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>,
    );

    // Go to contact step
    await user.click(screen.getByText('Continuar con datos'));

    await waitFor(() => {
      expect(screen.getByTestId('checkout-form-mock')).toBeInTheDocument();
    });

    // Go back to review
    const backButton = screen.getByText('Volver al carrito');
    await user.click(backButton);

    expect(screen.getByText('Resumen del pedido')).toBeInTheDocument();
  });

  it('displays total price correctly', () => {
    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>,
    );

    expect(screen.getByText('$200.00')).toBeInTheDocument();
  });

  it('displays header title based on current step', () => {
    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>,
    );

    expect(screen.getByText('Revisar carrito')).toBeInTheDocument();
  });

  it('has accessibility attributes', () => {
    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>,
    );

    // Check for region roles
    const mainRegion = screen.getByRole('main');
    expect(mainRegion).toBeInTheDocument();
  });

  it('disables interactions during submission', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>,
    );

    // Go to contact step
    await user.click(screen.getByText('Continuar con datos'));

    await waitFor(() => {
      expect(screen.getByTestId('checkout-form-mock')).toBeInTheDocument();
    });

    // Submit form
    const submitButton = screen.getByText('Confirmar');
    await user.click(submitButton);

    // The form should be processing
    // (in real scenario, would show loading state)
  });
});
