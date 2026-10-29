/**
 * Order History
 * Displays list of user orders - requires authentication
 * Shows order status, dates, and totals with ability to view details
 */

import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { useLoaderData, useParams } from '@remix-run/react';
import { json, redirect } from '@remix-run/node';
import { requireAuth, getAuthenticatedUser } from '~/services/auth.server';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  shippingAddress: string;
}

interface OrdersLoaderData {
  orders: Order[];
  user: {
    id: string;
    email: string;
    nombre: string;
  };
  locale: string;
}

export const loader: LoaderFunction = async ({ request, params }) => {
  // Require authentication
  await requireAuth(request);
  const user = await getAuthenticatedUser(request);

  if (!user) {
    const locale = params.lang || 'es';
    return redirect(`/${locale}/auth/login`);
  }

  // In a real app, fetch from API
  const mockOrders: Order[] = [
    {
      id: 'ORD-2024-001',
      date: '2024-10-28',
      status: 'delivered',
      total: 251.88,
      itemCount: 3,
      shippingAddress: '123 Main St, New York, NY 10001',
    },
    {
      id: 'ORD-2024-002',
      date: '2024-10-25',
      status: 'shipped',
      total: 99.99,
      itemCount: 1,
      shippingAddress: '123 Main St, New York, NY 10001',
    },
    {
      id: 'ORD-2024-003',
      date: '2024-10-20',
      status: 'processing',
      total: 175.50,
      itemCount: 2,
      shippingAddress: '456 Oak Ave, Brooklyn, NY 11201',
    },
  ];

  return json({
    orders: mockOrders,
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
    },
    locale: params.lang || 'es',
  });
};

export const meta: MetaFunction = ({ params }) => [
  {
    title: params.lang === 'es' ? 'Mis Órdenes - Tienda' : 'My Orders - Store',
  },
];

const getStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    case 'processing':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'shipped':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'delivered':
      return 'bg-green-50 text-green-800 border-green-200';
    case 'cancelled':
      return 'bg-red-50 text-red-800 border-red-200';
    default:
      return 'bg-gray-50 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: OrderStatus): string => {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'processing':
      return '⚙️';
    case 'shipped':
      return '📦';
    case 'delivered':
      return '✅';
    case 'cancelled':
      return '❌';
    default:
      return '❓';
  }
};

export default function OrdersPage() {
  const { orders, user, locale } = useLoaderData<OrdersLoaderData>();
  const { lang } = useParams();

  const t = locale === 'es' ? {
    orders: 'Mis Órdenes',
    welcome: `Bienvenido, ${user.nombre}`,
    noOrders: 'No tienes órdenes',
    noOrdersDesc: 'Comienza a comprar para ver tus órdenes aquí',
    continueShopping: 'Continuar comprando',
    orderNumber: 'Número de Orden',
    date: 'Fecha',
    status: 'Estado',
    total: 'Total',
    items: 'Artículos',
    viewDetails: 'Ver Detalles',
    reorder: 'Reordenar',
    accountDetails: 'Detalles de la Cuenta',
    email: 'Correo Electrónico',
    settings: 'Configuración',
    logout: 'Cerrar Sesión',
    statuses: {
      pending: 'Pendiente',
      processing: 'Procesando',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    },
  } : {
    orders: 'My Orders',
    welcome: `Welcome, ${user.nombre}`,
    noOrders: 'You have no orders',
    noOrdersDesc: 'Start shopping to see your orders here',
    continueShopping: 'Continue Shopping',
    orderNumber: 'Order Number',
    date: 'Date',
    status: 'Status',
    total: 'Total',
    items: 'Items',
    viewDetails: 'View Details',
    reorder: 'Reorder',
    accountDetails: 'Account Details',
    email: 'Email',
    settings: 'Settings',
    logout: 'Log Out',
    statuses: {
      pending: 'Pending',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t.orders}</h1>
              <p className="text-gray-600 mt-1">{t.welcome}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{t.email}</p>
              <p className="font-medium text-gray-900">{user.email}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {orders.length === 0 ? (
          // Empty Orders State
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.noOrders}</h2>
            <p className="text-gray-600 mb-8">{t.noOrdersDesc}</p>
            <a
              href={`/${lang}/tienda`}
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {t.continueShopping}
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Orders List */}
            <div className="lg:col-span-2 space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden">
                  <div className="p-6">
                    {/* Order Header */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-200">
                      <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-1">{t.orderNumber}</h3>
                        <p className="text-lg font-bold text-gray-900">{order.id}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-1">{t.date}</h3>
                        <p className="text-lg font-bold text-gray-900">
                          {new Date(order.date).toLocaleDateString(
                            locale === 'es' ? 'es-CO' : 'en-US',
                            {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            }
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <h4 className="text-xs font-medium text-gray-600 uppercase mb-1">{t.status}</h4>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(order.status)}`}>
                          <span className="mr-2">{getStatusIcon(order.status)}</span>
                          {t.statuses[order.status]}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-gray-600 uppercase mb-1">{t.items}</h4>
                        <p className="text-lg font-semibold text-gray-900">{order.itemCount}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-gray-600 uppercase mb-1">{t.total}</h4>
                        <p className="text-lg font-semibold text-gray-900">${order.total.toFixed(2)}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-gray-600 uppercase mb-1">Shipping</h4>
                        <p className="text-sm text-gray-600 truncate">{order.shippingAddress}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <a
                        href={`/${lang}/tienda/orders/${order.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm"
                      >
                        {t.viewDetails}
                      </a>
                      <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition text-sm">
                        {t.reorder}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Account Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">{t.accountDetails}</h3>

                <div className="space-y-4 pb-6 border-b border-gray-200">
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase mb-1">{t.email}</p>
                    <p className="text-sm text-gray-900">{user.email}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <a
                    href={`/${lang}/dashboard/settings`}
                    className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-center text-sm"
                  >
                    {t.settings}
                  </a>
                  <a
                    href={`/${lang}/logout`}
                    className="block w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition text-center text-sm"
                  >
                    {t.logout}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
