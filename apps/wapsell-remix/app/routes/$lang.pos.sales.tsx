/**
 * POS Sales History Route
 * Track and manage sales transactions and history
 * Responsive design with detailed analytics
 */

import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { useLoaderData, useParams } from '@remix-run/react';
import { useState } from 'react';
import { createProtectedLoader } from '~/utils/route-guards.server';
import type { Locale } from '~/types/routes';

interface SalesData {
  tenantContext: any;
  locale: string;
  empresaId: string;
}

interface SaleRecord {
  id: string;
  numero: number;
  fecha: string;
  hora: string;
  cliente?: string;
  canal: 'mostrador' | 'delivery' | 'online' | 'telefonico' | 'whatsapp';
  items: number;
  subtotal: number;
  descuento: number;
  total: number;
  metodo: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MERCADOPAGO' | 'CHEQUE' | 'BILLETERA' | 'CREDITO';
  vendedor: string;
  estado: 'completada' | 'pendiente' | 'cancelada';
}

const salesLoader: LoaderFunction = async ({ request, params }) => {
  const protectedLoader = createProtectedLoader(
    async (context) => {
      return {
        empresaId: context.tenantContext?.empresaId || '',
      };
    },
    { fallbackLocale: params.lang as string }
  );

  return protectedLoader({ request, params } as any);
};

export const loader = salesLoader;

export const meta: MetaFunction<typeof loader> = () => [
  { title: 'Historial de Ventas - Wapsell POS' },
  { name: 'description', content: 'Sales history and transaction records' },
];

/**
 * Sale Status Badge Component
 */
function SaleStatusBadge({
  estado,
  locale,
}: {
  estado: 'completada' | 'pendiente' | 'cancelada';
  locale: Locale;
}) {
  const statusConfig = {
    completada: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      label: locale === 'es' ? 'Completada' : 'Completed',
    },
    pendiente: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      label: locale === 'es' ? 'Pendiente' : 'Pending',
    },
    cancelada: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      label: locale === 'es' ? 'Cancelada' : 'Cancelled',
    },
  };

  const config = statusConfig[estado];

  return (
    <span className={`px-3 py-1 ${config.bg} ${config.text} text-xs md:text-sm font-semibold rounded-full`}>
      {config.label}
    </span>
  );
}

/**
 * Channel Badge Component
 */
function ChannelBadge({
  canal,
  locale,
}: {
  canal: 'mostrador' | 'delivery' | 'online' | 'telefonico' | 'whatsapp';
  locale: Locale;
}) {
  const channelLabels: Record<'mostrador' | 'delivery' | 'online' | 'telefonico' | 'whatsapp', { label: string; icon: string }> = {
    mostrador: {
      label: locale === 'es' ? 'Mostrador' : 'Counter',
      icon: '🏪',
    },
    delivery: {
      label: locale === 'es' ? 'Delivery' : 'Delivery',
      icon: '🚚',
    },
    online: {
      label: locale === 'es' ? 'Online' : 'Online',
      icon: '💻',
    },
    telefonico: {
      label: locale === 'es' ? 'Telefónico' : 'Phone',
      icon: '☎️',
    },
    whatsapp: {
      label: locale === 'es' ? 'WhatsApp' : 'WhatsApp',
      icon: '💬',
    },
  };

  const config = channelLabels[canal];

  return (
    <span className="flex items-center gap-1 text-xs md:text-sm text-gray-700">
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

/**
 * Payment Method Badge Component
 */
function PaymentMethodBadge({
  metodo,
  locale,
}: {
  metodo: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MERCADOPAGO' | 'CHEQUE' | 'BILLETERA' | 'CREDITO';
  locale: Locale;
}) {
  const methodLabels: Record<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MERCADOPAGO' | 'CHEQUE' | 'BILLETERA' | 'CREDITO', string> = {
    EFECTIVO: locale === 'es' ? 'Efectivo' : 'Cash',
    TARJETA: locale === 'es' ? 'Tarjeta' : 'Card',
    CHEQUE: locale === 'es' ? 'Cheque' : 'Check',
    TRANSFERENCIA: locale === 'es' ? 'Transferencia' : 'Transfer',
    BILLETERA: locale === 'es' ? 'Billetera' : 'Wallet',
    MERCADOPAGO: 'Mercado Pago',
    CREDITO: locale === 'es' ? 'Crédito' : 'Credit',
  };

  return (
    <span className="text-xs md:text-sm text-gray-700 font-medium">
      {methodLabels[metodo]}
    </span>
  );
}

/**
 * Desktop Table View Component
 */
function SalesTable({
  sales,
  locale,
  onViewDetail,
}: {
  sales: SaleRecord[];
  locale: Locale;
  onViewDetail: (sale: SaleRecord) => void;
}) {
  return (
    <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-100 border-b-2 border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'Comprobante' : 'Receipt'}
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'Fecha/Hora' : 'Date/Time'}
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'Canal' : 'Channel'}
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'Items' : 'Items'}
            </th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'Total' : 'Total'}
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'Pago' : 'Payment'}
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'Estado' : 'Status'}
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
              {locale === 'es' ? 'Acciones' : 'Actions'}
            </th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale, idx) => (
            <tr
              key={sale.id}
              className={`border-b transition ${
                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              } hover:bg-blue-50`}
            >
              <td className="px-6 py-4 text-sm font-bold text-gray-900">
                #{sale.numero.toString().padStart(6, '0')}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                <div>{sale.fecha}</div>
                <div className="text-xs text-gray-500">{sale.hora}</div>
              </td>
              <td className="px-6 py-4 text-sm">
                <ChannelBadge canal={sale.canal} locale={locale} />
              </td>
              <td className="px-6 py-4 text-center text-sm font-medium text-gray-700">
                {sale.items}
              </td>
              <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                ${sale.total.toFixed(2)}
              </td>
              <td className="px-6 py-4 text-sm">
                <PaymentMethodBadge metodo={sale.metodo} locale={locale} />
              </td>
              <td className="px-6 py-4 text-center">
                <SaleStatusBadge estado={sale.estado} locale={locale} />
              </td>
              <td className="px-6 py-4 text-center">
                <button
                  onClick={() => onViewDetail(sale)}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  {locale === 'es' ? 'Ver' : 'View'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Mobile Card View Component
 */
function SalesCardGrid({
  sales,
  locale,
  onViewDetail,
}: {
  sales: SaleRecord[];
  locale: Locale;
  onViewDetail: (sale: SaleRecord) => void;
}) {
  return (
    <div className="md:hidden grid grid-cols-1 gap-4">
      {sales.map((sale) => (
        <div
          key={sale.id}
          className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-gray-500 font-mono">
                {locale === 'es' ? 'Comprobante' : 'Receipt'} #{sale.numero.toString().padStart(6, '0')}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {sale.fecha} {sale.hora}
              </p>
            </div>
            <SaleStatusBadge estado={sale.estado} locale={locale} />
          </div>

          {/* Channel and Payment */}
          <div className="grid grid-cols-2 gap-2 py-3 border-y border-gray-200 mb-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">
                {locale === 'es' ? 'Canal' : 'Channel'}
              </p>
              <ChannelBadge canal={sale.canal} locale={locale} />
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">
                {locale === 'es' ? 'Pago' : 'Payment'}
              </p>
              <PaymentMethodBadge metodo={sale.metodo} locale={locale} />
            </div>
          </div>

          {/* Amount Info */}
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-xs text-gray-600">
                {locale === 'es' ? 'Items' : 'Items'}
              </p>
              <p className="text-lg font-bold text-gray-900">{sale.items}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">
                {locale === 'es' ? 'Total' : 'Total'}
              </p>
              <p className="text-2xl font-bold text-green-600">
                ${sale.total.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Action */}
          <button
            onClick={() => onViewDetail(sale)}
            className="w-full py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition"
          >
            {locale === 'es' ? 'Ver Detalles' : 'View Details'}
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Sale Detail Modal Component
 */
function SaleDetailModal({
  sale,
  locale,
  onClose,
}: {
  sale: SaleRecord | null;
  locale: Locale;
  onClose: () => void;
}) {
  if (!sale) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-100 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            {locale === 'es' ? 'Detalles de Venta' : 'Sale Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Receipt Number and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">
                {locale === 'es' ? 'Comprobante' : 'Receipt'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                #{sale.numero.toString().padStart(6, '0')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                {locale === 'es' ? 'Estado' : 'Status'}
              </p>
              <div className="mt-1">
                <SaleStatusBadge estado={sale.estado} locale={locale} />
              </div>
            </div>
          </div>

          {/* Date, Time, and Seller */}
          <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-xs text-gray-600">
                {locale === 'es' ? 'Fecha' : 'Date'}
              </p>
              <p className="font-semibold text-gray-900">{sale.fecha}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">
                {locale === 'es' ? 'Hora' : 'Time'}
              </p>
              <p className="font-semibold text-gray-900">{sale.hora}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">
                {locale === 'es' ? 'Vendedor' : 'Seller'}
              </p>
              <p className="font-semibold text-gray-900">{sale.vendedor}</p>
            </div>
          </div>

          {/* Channel and Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-2">
                {locale === 'es' ? 'Canal de Venta' : 'Sales Channel'}
              </p>
              <ChannelBadge canal={sale.canal} locale={locale} />
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-2">
                {locale === 'es' ? 'Método de Pago' : 'Payment Method'}
              </p>
              <PaymentMethodBadge metodo={sale.metodo} locale={locale} />
            </div>
          </div>

          {/* Amounts Summary */}
          <div className="border-t-2 border-gray-200 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {locale === 'es' ? 'Subtotal' : 'Subtotal'}
                </span>
                <span className="font-semibold text-gray-900">
                  ${(sale.subtotal).toFixed(2)}
                </span>
              </div>
              {sale.descuento > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {locale === 'es' ? 'Descuento' : 'Discount'}
                  </span>
                  <span className="font-semibold text-red-600">
                    -${(sale.descuento).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg pt-2 border-t border-gray-200">
                <span className="font-bold text-gray-900">
                  {locale === 'es' ? 'Total' : 'Total'}
                </span>
                <span className="text-2xl font-bold text-green-600">
                  ${(sale.total).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Items Count */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              {locale === 'es' ? 'Total de Items' : 'Total Items'}
            </p>
            <p className="text-3xl font-bold text-blue-600">{sale.items}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 transition"
            >
              {locale === 'es' ? 'Cerrar' : 'Close'}
            </button>
            <button
              className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              {locale === 'es' ? '🖨️ Imprimir' : '🖨️ Print'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sales Analytics Component
 */
function SalesAnalytics({
  sales,
  locale,
}: {
  sales: SaleRecord[];
  locale: Locale;
}) {
  const totalSales = sales.length;
  const totalAmount = sales.reduce((sum, s) => sum + s.total, 0);
  const avgSale = totalAmount / totalSales;
  const totalDiscount = sales.reduce((sum, s) => sum + s.descuento, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <p className="text-xs md:text-sm text-gray-600">
          {locale === 'es' ? 'Total Ventas' : 'Total Sales'}
        </p>
        <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
          {totalSales}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-green-500">
        <p className="text-xs md:text-sm text-gray-600">
          {locale === 'es' ? 'Monto Total' : 'Total Amount'}
        </p>
        <p className="text-2xl md:text-3xl font-bold text-green-600 mt-2">
          ${totalAmount.toFixed(0)}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-blue-500">
        <p className="text-xs md:text-sm text-gray-600">
          {locale === 'es' ? 'Promedio/Venta' : 'Avg Sale'}
        </p>
        <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-2">
          ${avgSale.toFixed(2)}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 border-orange-500">
        <p className="text-xs md:text-sm text-gray-600">
          {locale === 'es' ? 'Total Descuentos' : 'Total Discounts'}
        </p>
        <p className="text-2xl md:text-3xl font-bold text-orange-600 mt-2">
          ${totalDiscount.toFixed(0)}
        </p>
      </div>
    </div>
  );
}

/**
 * Main Sales History Component
 */
export default function SalesHistoryPage() {
  const { locale: loaderLocale } = useLoaderData<SalesData>();
  const { lang } = useParams();
  const locale = (lang || 'es') as Locale;

  // State
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'mostrador' | 'delivery' | 'online' | 'telefonico' | 'whatsapp' | 'todos'>('todos');

  // Mock sales data - replace with API call
  const mockSales: SaleRecord[] = [
    {
      id: '1',
      numero: 1001,
      fecha: '2024-10-29',
      hora: '14:30',
      cliente: 'Cliente A',
      canal: 'mostrador',
      items: 3,
      subtotal: 89.97,
      descuento: 10,
      total: 79.97,
      metodo: 'EFECTIVO',
      vendedor: 'Juan',
      estado: 'completada',
    },
    {
      id: '2',
      numero: 1002,
      fecha: '2024-10-29',
      hora: '15:15',
      cliente: 'Cliente B',
      canal: 'online',
      items: 2,
      subtotal: 59.98,
      descuento: 0,
      total: 59.98,
      metodo: 'MERCADOPAGO',
      vendedor: 'María',
      estado: 'completada',
    },
    {
      id: '3',
      numero: 1003,
      fecha: '2024-10-29',
      hora: '16:45',
      canal: 'delivery',
      items: 5,
      subtotal: 149.95,
      descuento: 15,
      total: 134.95,
      metodo: 'TRANSFERENCIA',
      vendedor: 'Carlos',
      estado: 'completada',
    },
    {
      id: '4',
      numero: 1004,
      fecha: '2024-10-28',
      hora: '11:20',
      cliente: 'Cliente C',
      canal: 'mostrador',
      items: 1,
      subtotal: 99.99,
      descuento: 0,
      total: 99.99,
      metodo: 'TARJETA',
      vendedor: 'Juan',
      estado: 'completada',
    },
  ];

  const filteredSales = mockSales.filter((sale) => {
    const matchesSearch =
      sale.numero.toString().includes(searchQuery) ||
      sale.cliente?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.vendedor.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesChannel = selectedChannel === 'todos' || sale.canal === selectedChannel;

    return matchesSearch && matchesChannel;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {locale === 'es' ? 'Historial de Ventas' : 'Sales History'}
        </h1>
        <p className="text-sm md:text-base text-gray-600 mt-2">
          {locale === 'es'
            ? 'Revisa el historial de tus transacciones'
            : 'Review your transaction history'}
        </p>
      </div>

      {/* Analytics */}
      <SalesAnalytics sales={mockSales} locale={locale} />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 space-y-4">
        <input
          type="text"
          placeholder={
            locale === 'es'
              ? 'Buscar por comprobante, cliente o vendedor...'
              : 'Search by receipt, customer or seller...'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
        />

        {/* Channel Filter - Mobile and Desktop */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            {locale === 'es' ? 'Canal' : 'Channel'}
          </p>
          <div className="flex flex-wrap gap-2">
            {(['todos', 'mostrador', 'delivery', 'online', 'telefonico', 'whatsapp'] as const).map(
              (channel) => (
                <button
                  key={channel}
                  onClick={() => setSelectedChannel(channel)}
                  className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedChannel === channel
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {channel === 'todos'
                    ? locale === 'es'
                      ? 'Todos'
                      : 'All'
                    : channel === 'mostrador'
                      ? locale === 'es'
                        ? 'Mostrador'
                        : 'Counter'
                      : channel === 'delivery'
                        ? locale === 'es'
                          ? 'Delivery'
                          : 'Delivery'
                        : channel === 'online'
                          ? locale === 'es'
                            ? 'Online'
                            : 'Online'
                          : channel === 'telefonico'
                            ? locale === 'es'
                              ? 'Telefónico'
                              : 'Phone'
                            : 'WhatsApp'}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <SalesTable
        sales={filteredSales}
        locale={locale}
        onViewDetail={setSelectedSale}
      />

      {/* Mobile Cards */}
      <SalesCardGrid
        sales={filteredSales}
        locale={locale}
        onViewDetail={setSelectedSale}
      />

      {/* Empty State */}
      {filteredSales.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 md:p-12 text-center">
          <p className="text-gray-500 text-base md:text-lg">
            {locale === 'es'
              ? 'No se encontraron ventas'
              : 'No sales found'}
          </p>
        </div>
      )}

      {/* Detail Modal */}
      <SaleDetailModal
        sale={selectedSale}
        locale={locale}
        onClose={() => setSelectedSale(null)}
      />
    </div>
  );
}
