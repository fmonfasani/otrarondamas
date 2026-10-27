import { LoaderFunction } from '@remix-run/node';
import { requireAuth } from '~/services/auth.server';

export const loader: LoaderFunction = async ({ request }) => {
  await requireAuth(request);
  return {};
};

export default function OrdersPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Pedidos</h1>
      <div className="bg-white p-4 rounded-lg shadow">
        <p className="text-gray-600">Gestión de pedidos</p>
      </div>
    </div>
  );
}
