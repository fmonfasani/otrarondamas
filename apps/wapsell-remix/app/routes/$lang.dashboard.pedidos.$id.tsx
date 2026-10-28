import { LoaderFunction, json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { getTenantFromSession, fetchTenantData } from '~/services/tenant.server';
import { OrderDetail } from '~/components/orders/OrderDetail';

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customer: string;
  email: string;
  phone: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireAuth(request);
  const tenant = await getTenantFromSession(request);

  if (!tenant) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const { id } = params;

  try {
    const response = await fetchTenantData(`/pedidos/${id}`, request);
    if (!response.ok) {
      throw new Error('Failed to fetch order');
    }
    const order = await response.json();
    return json({ order });
  } catch {
    // Return fallback mock data
    const fallbackOrder: Order = {
      id: id || 'ORD-001',
      customer: 'John Doe',
      email: 'john@example.com',
      phone: '+1 234 567 8900',
      status: 'delivered',
      total: 250,
      items: [
        {
          productId: '1',
          productName: 'Product 1',
          quantity: 2,
          price: 50,
        },
        {
          productId: '2',
          productName: 'Product 2',
          quantity: 1,
          price: 150,
        },
      ],
      createdAt: '2024-01-15',
      updatedAt: '2024-01-16',
    };
    return json({ order: fallbackOrder });
  }
};

export default function OrderDetailPage() {
  const { order } = useLoaderData<{ order: Order }>();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
      </div>

      <OrderDetail {...order} />
    </div>
  );
}
