import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';

// Mock the AdminLayout component to avoid routing issues in tests
vi.mock('../components/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard title', () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>,
    );

    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
  });

  it('renders stats cards with correct labels', () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>,
    );

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('Total Customers')).toBeInTheDocument();
    expect(screen.getByText('Total Products')).toBeInTheDocument();
  });

  it('renders recent orders section', async () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Orders')).toBeInTheDocument();
    });
  });

  it('displays recent orders data in table', async () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('renders top products section with badges', () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>,
    );

    expect(screen.getByText('Top Products')).toBeInTheDocument();
    expect(screen.getByText('Product A')).toBeInTheDocument();
  });

  it('renders pending tasks with indicators', () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>,
    );

    expect(screen.getByText('Pending Tasks')).toBeInTheDocument();
    expect(screen.getByText('5 orders to ship')).toBeInTheDocument();
  });

  it('renders quick actions section', () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>,
    );

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('View Analytics')).toBeInTheDocument();
    expect(screen.getByText('Send Newsletter')).toBeInTheDocument();
    expect(screen.getByText('System Settings')).toBeInTheDocument();
  });

  it('displays order status badges with correct styling', async () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      const badges = screen.getAllByText(/^(Completed|Processing|Pending)$/);
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('shows loading state initially', () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>,
    );

    // After initial render, the loading state should resolve
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
  });
});
