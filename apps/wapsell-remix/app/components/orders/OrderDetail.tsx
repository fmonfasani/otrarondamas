interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface OrderDetailProps {
  id: string;
  customer: string;
  email: string;
  phone: string;
  /** Real EstadoPedido from the API (e.g. RECIBIDO, EN_CAMINO, CANCELADO). */
  estado: string;
  total: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

// The order lifecycle has no approved definition yet, so the UI shows the real
// state as-is instead of mapping it onto invented steps.
function estadoLabel(estado: string): string {
  const text = estado.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function OrderDetail(order: OrderDetailProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Order #{order.id}
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-gray-600 text-sm">Customer</p>
            <p className="text-lg font-semibold">{order.customer}</p>
            <p className="text-sm text-gray-600">{order.email}</p>
            <p className="text-sm text-gray-600">{order.phone}</p>
          </div>

          <div>
            <p className="text-gray-600 text-sm">Order Date</p>
            <p className="text-lg font-semibold">
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
            <p className="text-gray-600 text-sm">
              Total: ${order.total.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 text-sm">Estado</p>
          <span
            className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${
              order.estado === 'CANCELADO' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            }`}
          >
            {estadoLabel(order.estado)}
          </span>
        </div>
      </div>

      {/* Order items */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Order Items</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">
                Qty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.productId} className="border-t border-gray-200">
                <td className="px-6 py-4 text-sm">{item.productName}</td>
                <td className="px-6 py-4 text-sm">{item.quantity}</td>
                <td className="px-6 py-4 text-sm">${item.price.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm font-semibold">
                  ${(item.quantity * item.price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-right text-lg font-bold">
            Total: ${order.total.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
