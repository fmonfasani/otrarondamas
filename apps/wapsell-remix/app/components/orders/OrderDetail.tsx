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
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

const statusSteps: Record<string, number> = {
  pending: 0,
  processing: 1,
  shipped: 2,
  delivered: 3,
  cancelled: -1,
};

export function OrderDetail(order: OrderDetailProps) {
  const currentStep = statusSteps[order.status];

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

        {/* Status timeline */}
        <div className="mb-6">
          <div className="flex justify-between">
            {['pending', 'processing', 'shipped', 'delivered'].map(
              (step, index) => (
                <div
                  key={step}
                  className={`flex-1 text-center ${
                    currentStep >= index ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      currentStep >= index
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <p className="text-sm font-medium capitalize">{step}</p>
                </div>
              )
            )}
          </div>
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
