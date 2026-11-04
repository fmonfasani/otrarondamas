import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { OrdersList } from '~/components/orders/OrdersList';

/**
 * Business Orders List
 *
 * ROUTE: /_business/$lang/dashboard/pedidos
 * AREA: Business Operations
 *
 * Shows staff view of orders for the current Business.
 * Requires: Authenticated staff + pedidos.gestionar permission + ACTIVE Membership + Business Context
 */

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const apiUrl = process.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Response('Service unavailable', { status: 503 });
  }

  try {
    const response = await fetch(`${apiUrl}/pedidos`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Response('Could not fetch orders', { status: response.status });
    }

    const orders = await response.json();
    return json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}

export default function OrdersPage() {
  const { orders } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Pedidos</h1>
        <p className="text-gray-600 mt-2">Gestión de pedidos de tu negocio</p>
      </div>

      <OrdersList orders={orders} />
    </div>
  );
}
