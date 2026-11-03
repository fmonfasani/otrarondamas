import { Outlet } from '@remix-run/react';

/**
 * Customer Experience Layout
 *
 * This layout boundaries the Customer experience area:
 * - Public storefront, catalog, cart, checkout
 * - Customer authentication (distinct from staff)
 * - Order tracking, account, wishlist
 *
 * SECURITY: This layout is NOT a security boundary. Backend authorization
 * through NestJS is required for all protected operations.
 */
export default function CustomerLayout() {
  return (
    <div data-area="customer-experience">
      <Outlet />
    </div>
  );
}
