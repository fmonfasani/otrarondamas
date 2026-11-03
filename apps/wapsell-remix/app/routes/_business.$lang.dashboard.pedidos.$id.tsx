import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { fetchTenantData } from '~/services/tenant.server';
import { OrderDetail } from '~/components/orders/OrderDetail';

interface OrderItem { productId: string; productName: string; quantity: number; price: number; }
interface Order {
  id: string; customer: string; email: string; phone: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number; items: OrderItem[]; createdAt: string; updatedAt: string;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireAuth(request);
  if (!params.id) throw new Response('Order id is required.', { status: 400 });
  const response = await fetchTenantData(`/pedidos/${encodeURIComponent(params.id)}`, request);
  if (!response.ok) throw new Response('Could not fetch order.', { status: response.status });
  return json({ order: (await response.json()) as Order });
}

export default function OrderDetailPage() {
  const { order } = useLoaderData<typeof loader>();
  return <div className="p-8">
    <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900">Detalle del pedido</h1></div>
    <OrderDetail {...order} />
  </div>;
}
