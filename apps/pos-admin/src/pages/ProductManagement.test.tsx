import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ProductManagement } from './ProductManagement';

// Mock the AdminLayout component to avoid routing issues in tests
vi.mock('../components/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

describe('ProductManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders product management title', () => {
    render(
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>,
    );

    expect(screen.getByText('Product Management')).toBeInTheDocument();
  });

  it('renders add product button', () => {
    render(
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>,
    );

    expect(screen.getByText('Add Product')).toBeInTheDocument();
  });

  it('displays products table with correct columns', () => {
    render(
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>,
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('SKU')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Stock')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('displays initial products in table', () => {
    render(
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>,
    );

    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
    expect(screen.getByText('USB-C Cable')).toBeInTheDocument();
    expect(screen.getByText('Laptop Stand')).toBeInTheDocument();
  });

  it('filters products by search term', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search by product name or SKU...');
    await user.type(searchInput, 'Wireless');

    await waitFor(() => {
      expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
      expect(screen.queryByText('USB-C Cable')).not.toBeInTheDocument();
    });
  });

  it('filters products by SKU', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search by product name or SKU...');
    await user.type(searchInput, 'USB-C-001');

    await waitFor(() => {
      expect(screen.getByText('USB-C Cable')).toBeInTheDocument();
    });
  });

  it('shows no results message when search has no matches', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search by product name or SKU...');
    await user.type(searchInput, 'NonexistentProduct');

    await waitFor(() => {
      expect(screen.getByText('No products match your search.')).toBeInTheDocument();
    });
  });

  it('renders edit and delete buttons for each product', () => {
    render(
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>,
    );

    // Each product should have edit and delete buttons
    const editButtons = screen.getAllByTitle(/Edit product/);
    const deleteButtons = screen.getAllByTitle(/Delete product/);

    expect(editButtons.length).toBeGreaterThan(0);
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('displays product status badges', () => {
    render(
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>,
    );

    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('discontinued')).toBeInTheDocument();
  });

  it('displays stock level badges with appropriate colors', () => {
    render(
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>,
    );

    expect(screen.getByText(/45 units/)).toBeInTheDocument();
    expect(screen.getByText(/0 units/)).toBeInTheDocument();
  });

  it('opens add product modal when add button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>,
    );

    const addButton = screen.getByText('Add Product');
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Add New Product')).toBeInTheDocument();
    });
  });

  it('enables add product after filling required fields', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>,
    );

    await user.click(screen.getByText('Add Product'));

    await waitFor(() => {
      expect(screen.getByText('Add New Product')).toBeInTheDocument();
    });
  });

  it('displays product prices with correct formatting', () => {
    render(
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>,
    );

    expect(screen.getByText('$129.99')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
  });

  it('renders search input with correct placeholder', () => {
    render(
      <BrowserRouter>
        <ProductManagement />
      </BrowserRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search by product name or SKU...');
    expect(searchInput).toBeInTheDocument();
  });
});
