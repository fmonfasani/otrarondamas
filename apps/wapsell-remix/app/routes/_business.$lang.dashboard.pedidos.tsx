import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { fetchTenantData } from '~/services/tenant.server';
import { OrdersList } from '~/components/orders/OrdersList';

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth(request);
  const response = await fetchTenantData('/pedidos', request);
  if (!response.ok) throw new Response('Could not fetch orders.', { status: response.status });
  return json({ orders: await response.json() });
}

export default function OrdersPage() {
  const { orders } = useLoaderData<typeof loader>();
  return <div className="space-y-6 p-8">
    <div><h1 className="text-3xl font-bold">Pedidos</h1><p className="mt-2 text-gray-600">Gestión de pedidos de tu negocio</p></div>
    <OrdersList orders={orders} />
  </div>;
}
