import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, ShoppingCart, Package } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Badge } from '../components/Badge';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueChange: number;
  ordersChange: number;
}

interface RecentOrder {
  id: string;
  customer: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  date: string;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 45230,
    totalOrders: 128,
    totalCustomers: 342,
    totalProducts: 89,
    revenueChange: 12.5,
    ordersChange: 8.3,
  });

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([
    { id: '1', customer: 'John Doe', amount: 1250, status: 'completed', date: '2024-01-20' },
    { id: '2', customer: 'Jane Smith', amount: 890, status: 'processing', date: '2024-01-19' },
    { id: '3', customer: 'Bob Johnson', amount: 2100, status: 'completed', date: '2024-01-19' },
    { id: '4', customer: 'Alice Brown', amount: 450, status: 'pending', date: '2024-01-18' },
    { id: '5', customer: 'Charlie Davis', amount: 3200, status: 'completed', date: '2024-01-18' },
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Simulate loading
    setTimeout(() => setLoading(false), 500);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'info';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'primary';
    }
  };

  const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number | string;
    change?: number;
    format?: (val: number) => string;
  }> = ({ icon, label, value, change, format }) => (
    <Card className="hover:shadow-lg transition">
      <CardBody>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">{label}</p>
            <p className="text-h2 font-bold mt-2">
              {typeof value === 'number' && format ? format(value) : value}
            </p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-semibold">+{change.toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="p-3 bg-gray-100 rounded-lg text-gray-600">{icon}</div>
        </div>
      </CardBody>
    </Card>
  );

  return (
    <AdminLayout currentPage="/admin/dashboard">
      <div className="space-y-6">
        <h1 className="text-h1 font-bold text-brand-dark">Dashboard Overview</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<ShoppingCart className="w-6 h-6" />}
            label="Total Revenue"
            value={stats.totalRevenue}
            change={stats.revenueChange}
            format={(val) => `$${(val / 1000).toFixed(1)}K`}
          />
          <StatCard
            icon={<ShoppingCart className="w-6 h-6" />}
            label="Total Orders"
            value={stats.totalOrders}
            change={stats.ordersChange}
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Customers"
            value={stats.totalCustomers}
          />
          <StatCard
            icon={<Package className="w-6 h-6" />}
            label="Total Products"
            value={stats.totalProducts}
          />
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <h2 className="text-h2 font-bold text-brand-dark">Recent Orders</h2>
          </CardHeader>
          <CardBody>
            {loading ? (
              <p className="text-gray-500 text-center py-4">Loading orders...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-gray-600 font-semibold">Order ID</th>
                      <th className="px-4 py-3 text-left text-gray-600 font-semibold">Customer</th>
                      <th className="px-4 py-3 text-left text-gray-600 font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left text-gray-600 font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-gray-600 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-600">#{order.id}</td>
                        <td className="px-4 py-3 font-medium">{order.customer}</td>
                        <td className="px-4 py-3 font-semibold">${order.amount.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusColor(order.status) as any} size="sm">
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(order.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Bottom Row - Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <h3 className="text-h3 font-bold">Top Products</h3>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2 text-sm">
                {['Product A - 245 units', 'Product B - 189 units', 'Product C - 156 units'].map(
                  (product) => (
                    <li key={product} className="flex justify-between py-1">
                      <span>{product.split(' - ')[0]}</span>
                      <Badge variant="success" size="sm">
                        {product.split(' - ')[1]}
                      </Badge>
                    </li>
                  ),
                )}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-h3 font-bold">Pending Tasks</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>5 orders to ship</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span>12 low stock items</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>3 new messages</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-h3 font-bold">Quick Actions</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition">
                  📊 View Analytics
                </button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition">
                  🔔 Send Newsletter
                </button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition">
                  ⚙️ System Settings
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};
