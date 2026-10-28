interface Order {
  id: string;
  customer: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

interface OrdersListProps {
  orders: Order[];
}

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function OrdersList({ orders }: OrdersListProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-t border-gray-200 hover:bg-gray-50"
              >
                <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                  #{order.id}
                </td>
                <td className="px-6 py-4 text-sm">{order.customer}</td>
                <td className="px-6 py-4 text-sm font-semibold">
                  ${order.total}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      statusColor[order.status]
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
