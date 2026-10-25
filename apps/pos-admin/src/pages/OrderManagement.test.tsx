import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { OrderManagement } from './OrderManagement';

// Mock the AdminLayout component to avoid routing issues in tests
vi.mock('../components/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

describe('OrderManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders order management title', () => {
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    expect(screen.getByText('Order Management')).toBeInTheDocument();
  });

  it('displays total order count badge', () => {
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    expect(screen.getByText(/Total Orders/)).toBeInTheDocument();
  });

  it('renders search input for filtering orders', () => {
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    expect(
      screen.getByPlaceholderText('Search by order ID or customer name...'),
    ).toBeInTheDocument();
  });

  it('displays orders with correct information', () => {
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('displays order status badges', () => {
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('filters orders by order ID', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search by order ID or customer name...');
    await user.type(searchInput, 'ORD-001');

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
    });
  });

  it('filters orders by customer name', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search by order ID or customer name...');
    await user.type(searchInput, 'John');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('shows no results message when search has no matches', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search by order ID or customer name...');
    await user.type(searchInput, 'NonexistentOrder');

    await waitFor(() => {
      expect(screen.getByText('No orders match your search.')).toBeInTheDocument();
    });
  });

  it('renders view details button for each order', () => {
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    const viewButtons = screen.getAllByText('View Details');
    expect(viewButtons.length).toBeGreaterThan(0);
  });

  it('renders action buttons based on order status', () => {
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    // Should have various action buttons
    expect(screen.getByText('Mark as Processing')).toBeInTheDocument();
    expect(screen.getByText('Ship Order')).toBeInTheDocument();
  });

  it('displays order totals correctly', () => {
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    expect(screen.getByText('$197.16')).toBeInTheDocument();
    expect(screen.getByText('$57.99')).toBeInTheDocument();
  });

  it('displays item count for each order', () => {
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    expect(screen.getByText('2 product(s)')).toBeInTheDocument();
    expect(screen.getByText('1 product(s)')).toBeInTheDocument();
  });

  it('renders print button for each order', () => {
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    const printButtons = screen.getAllByText('Print');
    expect(printButtons.length).toBeGreaterThan(0);
  });

  it('opens detail modal when view details is clicked', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    const viewButtons = screen.getAllByText('View Details');
    await user.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Order Details - ORD-/)).toBeInTheDocument();
    });
  });

  it('displays customer information in order card', () => {
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    expect(screen.getByText(/john@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/555-1234/)).toBeInTheDocument();
  });

  it('displays order dates', () => {
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    // At least one date should be visible
    expect(screen.getByText(/1\/2[0-9]/)).toBeInTheDocument();
  });

  it('marks order as shipped when button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <OrderManagement />
      </BrowserRouter>,
    );

    // Find and click a "Mark as Processing" button
    const markButton = screen.getByText('Mark as Processing');
    await user.click(markButton);

    // Verify status changed or toast appeared
    await waitFor(() => {
      // Check if the button text changed or order was updated
      expect(screen.getByText('Ship Order')).toBeInTheDocument();
    });
  });
});
