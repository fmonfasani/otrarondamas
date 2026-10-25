import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartSummary } from './CartSummary';
import type { ItemCarrito } from '../features/carrito/useCarrito';

describe('CartSummary', () => {
  const mockItems: ItemCarrito[] = [
    {
      producto: {
        productoId: '1',
        nombre: 'Producto A',
        precio: 100,
        disponible: 10,
      } as any,
      cantidad: 2,
    },
    {
      producto: {
        productoId: '2',
        nombre: 'Producto B',
        precio: 50,
        disponible: 5,
      } as any,
      cantidad: 1,
    },
  ];

  it('renders empty state when no items', () => {
    render(<CartSummary items={[]} />);
    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument();
  });

  it('displays item count badge', () => {
    render(<CartSummary items={mockItems} />);
    expect(screen.getByTestId('item-count-badge')).toHaveTextContent('3');
  });

  it('displays total price correctly', () => {
    render(<CartSummary items={mockItems} />);
    // Total: 100*2 + 50*1 = 250
    expect(screen.getByTestId('total-price')).toHaveTextContent('$250.00');
  });

  it('shows first 3 items summary', () => {
    const manyItems: ItemCarrito[] = [
      ...mockItems,
      {
        producto: {
          productoId: '3',
          nombre: 'Producto C',
          precio: 75,
          disponible: 8,
        } as any,
        cantidad: 1,
      },
      {
        producto: {
          productoId: '4',
          nombre: 'Producto D',
          precio: 25,
          disponible: 20,
        } as any,
        cantidad: 2,
      },
    ];

    render(<CartSummary items={manyItems} />);
    expect(screen.getByText('+1 más')).toBeInTheDocument();
  });

  it('calls onCheckout when button clicked', async () => {
    const user = userEvent.setup();
    const handleCheckout = vi.fn();
    render(<CartSummary items={mockItems} onCheckout={handleCheckout} />);

    await user.click(screen.getByTestId('checkout-button'));
    expect(handleCheckout).toHaveBeenCalledOnce();
  });

  it('disables checkout button when loading', () => {
    render(<CartSummary items={mockItems} isLoading={true} />);
    expect(screen.getByTestId('checkout-button')).toBeDisabled();
  });

  it('disables checkout button when cart is empty', () => {
    render(<CartSummary items={[]} />);
    const buttons = screen.queryAllByRole('button');
    if (buttons.length > 0) {
      expect(buttons[0]).toBeDisabled();
    }
  });

  it('displays correct cart summary text', () => {
    render(<CartSummary items={mockItems} />);
    expect(screen.getByText('Carrito')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('has accessibility attributes', () => {
    render(<CartSummary items={mockItems} />);
    expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Cart summary');
  });
});
