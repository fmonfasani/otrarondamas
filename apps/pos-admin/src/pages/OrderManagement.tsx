import React, { useState } from 'react';
import { Eye, Truck, Printer } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { useToast, ToastContainer } from '../components/Toast';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderId: string;
  customer: string;
  email: string;
  phone: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: string;
  date: string;
}

export const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([
    {
      id: '1',
      orderId: 'ORD-001',
      customer: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      items: [
        { id: '1', name: 'Wireless Headphones', quantity: 1, price: 129.99 },
        { id: '2', name: 'USB-C Cable', quantity: 2, price: 19.99 },
      ],
      subtotal: 169.97,
      tax: 27.19,
      total: 197.16,
      status: 'pending',
      shippingAddress: '123 Main St, City, State 12345',
      date: '2024-01-20',
    },
    {
      id: '2',
      orderId: 'ORD-002',
      customer: 'Jane Smith',
      email: 'jane@example.com',
      phone: '555-5678',
      items: [{ id: '1', name: 'Laptop Stand', quantity: 1, price: 49.99 }],
      subtotal: 49.99,
      tax: 8.0,
      total: 57.99,
      status: 'shipped',
      shippingAddress: '456 Oak Ave, Town, State 67890',
      date: '2024-01-19',
    },
    {
      id: '3',
      orderId: 'ORD-003',
      customer: 'Bob Johnson',
      email: 'bob@example.com',
      phone: '555-9012',
      items: [{ id: '1', name: 'Wireless Headphones', quantity: 2, price: 129.99 }],
      subtotal: 259.98,
      tax: 41.6,
      total: 301.58,
      status: 'processing',
      shippingAddress: '789 Pine Rd, Village, State 34567',
      date: '2024-01-18',
    },
  ]);

  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const { toasts, removeToast, success } = useToast();

  const filteredOrders = orders.filter(
    (o) =>
      o.orderId.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase()),
  );

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const handleShipOrder = (orderId: string) => {
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: 'shipped' } : o)));
    success('Order marked as shipped');
  };

  const handleDeliverOrder = (orderId: string) => {
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: 'delivered' } : o)));
    success('Order marked as delivered');
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'processing':
        return 'info';
      case 'shipped':
        return 'primary';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'primary';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <AdminLayout currentPage="/admin/orders">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-h1 font-bold text-brand-dark">Order Management</h1>
          <Badge variant="info">{orders.length} Total Orders</Badge>
        </div>

        {/* Search */}
        <Card>
          <CardBody className="pb-4">
            <Input
              placeholder="Search by order ID or customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardBody>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-center text-gray-500 py-8">
                  {search ? 'No orders match your search.' : 'No orders found.'}
                </p>
              </CardBody>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-h3 font-bold">{order.orderId}</h3>
                        <Badge variant={getStatusVariant(order.status) as any} size="md">
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {order.customer} • {order.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-h2 font-bold text-brand-dark">${order.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(order.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardBody className="py-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">Items</p>
                      <p className="text-sm font-medium">{order.items.length} product(s)</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">Subtotal</p>
                      <p className="text-sm font-medium">${order.subtotal.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">Tax</p>
                      <p className="text-sm font-medium">${order.tax.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">Phone</p>
                      <p className="text-sm font-medium">{order.phone}</p>
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="bg-gray-50 rounded p-3 mb-4">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Items:</p>
                    <ul className="space-y-1 text-xs">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between">
                          <span>
                            {item.name} <span className="text-gray-500">x{item.quantity}</span>
                          </span>
                          <span className="font-semibold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardBody>

                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-between gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleViewDetails(order)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>

                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleShipOrder(order.id)}
                        className="flex items-center gap-1"
                      >
                        <Truck className="w-4 h-4" />
                        Mark as Processing
                      </Button>
                    )}

                    {order.status === 'processing' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleShipOrder(order.id)}
                        className="flex items-center gap-1"
                      >
                        <Truck className="w-4 h-4" />
                        Ship Order
                      </Button>
                    )}

                    {order.status === 'shipped' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleDeliverOrder(order.id)}
                        className="flex items-center gap-1"
                      >
                        ✓ Mark Delivered
                      </Button>
                    )}

                    <Button variant="secondary" size="sm" className="flex items-center gap-1">
                      <Printer className="w-4 h-4" />
                      Print
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedOrder(null);
          }}
          title={`Order Details - ${selectedOrder.orderId}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-semibold">Customer Name</p>
                <p className="text-sm font-medium">{selectedOrder.customer}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold">Order Date</p>
                <p className="text-sm font-medium">
                  {new Date(selectedOrder.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold">Email</p>
                <p className="text-sm font-medium">{selectedOrder.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold">Phone</p>
                <p className="text-sm font-medium">{selectedOrder.phone}</p>
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1">Shipping Address</p>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                {selectedOrder.shippingAddress}
              </p>
            </div>

            {/* Order Items */}
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-2">Order Items</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2">Product</th>
                    <th className="text-right py-2 px-2">Qty</th>
                    <th className="text-right py-2 px-2">Price</th>
                    <th className="text-right py-2 px-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-2 px-2">{item.name}</td>
                      <td className="text-right py-2 px-2">{item.quantity}</td>
                      <td className="text-right py-2 px-2">${item.price.toFixed(2)}</td>
                      <td className="text-right py-2 px-2 font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded p-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">${selectedOrder.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span className="font-medium">${selectedOrder.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
                <span>Total:</span>
                <span>${selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Status */}
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1">Status</p>
              <Badge variant={getStatusVariant(selectedOrder.status) as any} size="md">
                {getStatusLabel(selectedOrder.status)}
              </Badge>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
};
