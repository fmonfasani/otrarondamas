import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { fetchAuthenticatedData } from '~/services/tenant.server';
import { OrderDetail } from '~/components/orders/OrderDetail';

// GET /pedidos/:id (owner decision 2026-11-09): the real EstadoPedido, the
// customer and the items; amounts arrive as Decimal strings.
interface ApiOrder {
  id: string;
  estado: string;
  total: string;
  createdAt: string;
  updatedAt: string;
  cliente: { nombre: string; email: string | null; telefono: string | null };
  items: { productId: string; productName: string; quantity: string; price: string }[];
}

function toOrderDetail(order: ApiOrder) {
  return {
    id: order.id,
    customer: order.cliente.nombre,
    email: order.cliente.email ?? '',
    phone: order.cliente.telefono ?? '',
    estado: order.estado,
    total: Number(order.total),
    items: order.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: Number(item.quantity),
      price: Number(item.price),
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (!params.id) throw new Response('Order id is required.', { status: 400 });
  const response = await fetchAuthenticatedData(
    `/pedidos/${encodeURIComponent(params.id)}`,
    request,
  );
  if (!response.ok) throw new Response('Could not fetch order.', { status: response.status });
  return json({ order: toOrderDetail((await response.json()) as ApiOrder) });
}

export default function OrderDetailPage() {
  const { order } = useLoaderData<typeof loader>();
  return <div className="p-8">
    <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900">Detalle del pedido</h1></div>
    <OrderDetail {...order} />
  </div>;
}
