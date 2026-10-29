/**
 * Order Detail Page
 * Shows full details of a specific order - requires authentication
 * Displays timeline, items, shipping info, payment details
 */

import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { useLoaderData, useParams } from '@remix-run/react';
import { json, redirect } from '@remix-run/node';
import { requireAuth, getAuthenticatedUser } from '~/services/auth.server';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  image: string;
}

interface OrderTimeline {
  timestamp: string;
  status: OrderStatus;
  description: string;
}

interface Order {
  id: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    street: string;
    city: string;
    postalCode: string;
    phone: string;
  };
  paymentMethod: string;
  trackingNumber?: string;
  timeline: OrderTimeline[];
}

interface OrderDetailLoaderData {
  order: Order;
  user: {
    id: string;
    email: string;
    nombre: string;
  };
  locale: string;
}

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireAuth(request);
  const user = await getAuthenticatedUser(request);

  if (!user) {
    const locale = params.lang || 'es';
    return redirect(`/${locale}/auth/login`);
  }

  const { id, lang } = params;

  // In a real app, fetch from API and verify ownership
  const mockOrder: Order = {
    id: id || 'ORD-2024-001',
    createdAt: '2024-10-28',
    status: 'delivered',
    items: [
      {
        id: '1',
        nombre: 'Premium Headphones',
        precio: 199.99,
        cantidad: 1,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      },
      {
        id: '2',
        nombre: 'Phone Case',
        precio: 29.99,
        cantidad: 2,
        image: 'https://images.unsplash.com/photo-1522869635100-ce306b08738d?w=400',
      },
    ],
    subtotal: 259.97,
    shipping: 5.99,
    tax: 20.79,
    total: 286.75,
    shippingAddress: {
      street: '123 Main Street',
      city: 'New York, NY 10001',
      postalCode: '10001',
      phone: '+1 (555) 123-4567',
    },
    paymentMethod: 'Credit Card',
    trackingNumber: 'TRK-2024-001-ABC123',
    timeline: [
      {
        timestamp: '2024-10-28T10:00:00Z',
        status: 'pending',
        description: 'Order placed',
      },
      {
        timestamp: '2024-10-28T14:30:00Z',
        status: 'processing',
        description: 'Order processing has started',
      },
      {
        timestamp: '2024-10-29T08:00:00Z',
        status: 'shipped',
        description: 'Package has been shipped',
      },
      {
        timestamp: '2024-10-31T16:45:00Z',
        status: 'delivered',
        description: 'Package delivered',
      },
    ],
  };

  return json({
    order: mockOrder,
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
    },
    locale: lang || 'es',
  });
};

export const meta: MetaFunction = ({ params }) => [
  {
    title: params.lang === 'es' ? `Orden ${params.id} - Tienda` : `Order ${params.id} - Store`,
  },
];

const getStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-50 text-yellow-800';
    case 'processing':
      return 'bg-blue-50 text-blue-800';
    case 'shipped':
      return 'bg-purple-50 text-purple-800';
    case 'delivered':
      return 'bg-green-50 text-green-800';
    case 'cancelled':
      return 'bg-red-50 text-red-800';
    default:
      return 'bg-gray-50 text-gray-800';
  }
};

export default function OrderDetailPage() {
  const { order, user, locale } = useLoaderData<OrderDetailLoaderData>();
  const { lang } = useParams();

  const t = locale === 'es' ? {
    orderDetails: 'Detalles de la Orden',
    orderNumber: 'Número de Orden',
    orderDate: 'Fecha de Orden',
    status: 'Estado',
    trackingNumber: 'Número de Seguimiento',
    items: 'Artículos',
    quantity: 'Cantidad',
    price: 'Precio',
    subtotal: 'Subtotal',
    shipping: 'Envío',
    tax: 'Impuestos',
    total: 'Total',
    shippingAddress: 'Dirección de Envío',
    paymentMethod: 'Método de Pago',
    timeline: 'Historial de Estado',
    back: 'Volver a Órdenes',
    printInvoice: 'Descargar Recibo',
    trackShipment: 'Rastrear Envío',
    contactSupport: 'Contactar Soporte',
    statuses: {
      pending: 'Pendiente',
      processing: 'Procesando',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    },
  } : {
    orderDetails: 'Order Details',
    orderNumber: 'Order Number',
    orderDate: 'Order Date',
    status: 'Status',
    trackingNumber: 'Tracking Number',
    items: 'Items',
    quantity: 'Quantity',
    price: 'Price',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    tax: 'Tax',
    total: 'Total',
    shippingAddress: 'Shipping Address',
    paymentMethod: 'Payment Method',
    timeline: 'Status Timeline',
    back: 'Back to Orders',
    printInvoice: 'Download Invoice',
    trackShipment: 'Track Shipment',
    contactSupport: 'Contact Support',
    statuses: {
      pending: 'Pending',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    },
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      locale === 'es' ? 'es-CO' : 'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <a
            href={`/${lang}/tienda/orders`}
            className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block"
          >
            ← {t.back}
          </a>
          <h1 className="text-3xl font-bold text-gray-900">{t.orderDetails}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Order Info Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{t.orderNumber}</p>
                  <p className="text-lg font-bold text-gray-900">{order.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{t.orderDate}</p>
                  <p className="text-lg font-bold text-gray-900">
                    {new Date(order.createdAt).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US')}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">{t.status}</p>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                  {t.statuses[order.status]}
                </div>
              </div>

              {order.trackingNumber && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-2">{t.trackingNumber}</p>
                  <p className="font-mono text-gray-900 bg-gray-50 p-2 rounded">{order.trackingNumber}</p>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">{t.items}</h2>

              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                    <img
                      src={item.image}
                      alt={item.nombre}
                      className="w-24 h-24 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.nombre}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {t.quantity}: {item.cantidad}
                      </p>
                      <p className="font-medium text-gray-900 mt-2">
                        ${(item.precio * item.cantidad).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">{t.timeline}</h2>

              <div className="relative">
                {order.timeline.map((event, index) => (
                  <div key={index} className="flex gap-4 pb-8 last:pb-0">
                    {/* Timeline Dot */}
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full ${getStatusColor(event.status)}`}></div>
                      {index < order.timeline.length - 1 && (
                        <div className="w-0.5 h-16 bg-gray-200 mt-2"></div>
                      )}
                    </div>

                    {/* Event Content */}
                    <div className="pt-1 flex-1">
                      <p className="font-semibold text-gray-900">{t.statuses[event.status]}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(event.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-gray-900 mb-4">Summary</h3>

              <div className="space-y-3 pb-4 border-b border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.subtotal}</span>
                  <span className="text-gray-900 font-medium">${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.shipping}</span>
                  <span className="text-gray-900 font-medium">${order.shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.tax}</span>
                  <span className="text-gray-900 font-medium">${order.tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-bold text-gray-900 mt-4">
                <span>{t.total}</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-gray-900 mb-4">{t.shippingAddress}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.city}</p>
                <p>{order.shippingAddress.postalCode}</p>
                <p className="mt-3 text-gray-900 font-medium">{order.shippingAddress.phone}</p>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-gray-900 mb-4">{t.paymentMethod}</h3>
              <p className="text-sm text-gray-600">{order.paymentMethod}</p>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">
                {t.printInvoice}
              </button>
              <button className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition text-sm">
                {t.trackShipment}
              </button>
              <button className="w-full px-4 py-2 border-2 border-gray-300 text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition text-sm">
                {t.contactSupport}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
