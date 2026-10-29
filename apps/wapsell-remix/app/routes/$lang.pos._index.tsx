/**
 * POS Terminal Route
 * Main point of sale interface for taking orders
 * Responsive design: Product search on desktop, fullscreen cart on mobile
 */

import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { useLoaderData, useParams, Form } from '@remix-run/react';
import { useState } from 'react';
import { createProtectedLoader } from '~/utils/route-guards.server';
import { getTenantContext } from '~/utils/tenant-context.server';
import type { Locale } from '~/types/routes';
import type { PaymentMethod } from '@wapsell/types';

interface POSTerminalData {
  tenantContext: any;
  locale: string;
  empresaId: string;
}

interface CartItem {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  descuento: number;
}

const posTerminalLoader: LoaderFunction = async ({ request, params }) => {
  const protectedLoader = createProtectedLoader(
    async (context) => {
      const tenantContext = await getTenantContext(request);
      return {
        empresaId: tenantContext?.empresaId || '',
      };
    },
    { fallbackLocale: params.lang as string }
  );

  return protectedLoader({ request, params } as any);
};

export const loader = posTerminalLoader;

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: 'POS Terminal - Wapsell' },
  {
    name: 'description',
    content: 'Point of Sale Terminal - Take orders and process payments',
  },
];

/**
 * Product Search Bar Component
 */
function ProductSearchBar({
  locale,
  onSearch,
  onAddToCart,
}: {
  locale: Locale;
  onSearch: (query: string) => void;
  onAddToCart: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6 sticky top-0 z-20">
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        {locale === 'es' ? 'Buscar Productos' : 'Search Products'}
      </label>
      <div className="flex gap-2 md:gap-3 flex-col md:flex-row">
        <input
          type="text"
          placeholder={locale === 'es' ? 'Código, nombre o descripción...' : 'Code, name or description...'}
          value={searchQuery}
          onChange={handleSearch}
          className="flex-1 px-4 py-3 md:py-4 border border-gray-300 rounded-lg text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={onAddToCart}
          className="w-full md:w-auto px-6 py-3 md:py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition text-base md:text-lg"
        >
          {locale === 'es' ? 'Agregar' : 'Add'}
        </button>
      </div>
    </div>
  );
}

/**
 * Product Grid Component
 */
function ProductGrid({
  locale,
  products,
  onSelectProduct,
}: {
  locale: Locale;
  products: any[];
  onSelectProduct: (product: any) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
        {locale === 'es' ? 'Productos Disponibles' : 'Available Products'}
      </h2>
      {products.length === 0 ? (
        <div className="text-center py-8 md:py-12">
          <p className="text-gray-500 text-base md:text-lg">
            {locale === 'es'
              ? 'No hay productos disponibles'
              : 'No products available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => onSelectProduct(product)}
              className="p-3 md:p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
            >
              <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                <span className="text-2xl md:text-3xl">📦</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                {product.nombre}
              </h3>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                {locale === 'es' ? 'Stock' : 'Stock'}: {product.stock}
              </p>
              <p className="text-lg md:text-xl font-bold text-blue-600 mt-2">
                ${product.precio.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{product.sku}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Cart Item Component
 */
function CartItemComponent({
  item,
  locale,
  onQuantityChange,
  onDiscountChange,
  onRemove,
}: {
  item: CartItem;
  locale: Locale;
  onQuantityChange: (productId: string, cantidad: number) => void;
  onDiscountChange: (productId: string, descuento: number) => void;
  onRemove: (productId: string) => void;
}) {
  const subtotal = item.precio * item.cantidad - item.descuento;

  return (
    <div className="p-3 md:p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-gray-900 text-sm md:text-base">
            {item.nombre}
          </h4>
          <p className="text-xs md:text-sm text-gray-600">
            ${item.precio.toFixed(2)} {locale === 'es' ? 'c/u' : 'each'}
          </p>
        </div>
        <button
          onClick={() => onRemove(item.productoId)}
          className="text-red-600 hover:text-red-700 font-semibold text-sm"
        >
          ✕
        </button>
      </div>

      {/* Quantity Control */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-700 block mb-1">
          {locale === 'es' ? 'Cantidad' : 'Quantity'}
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onQuantityChange(item.productoId, Math.max(1, item.cantidad - 1))}
            className="w-8 h-8 md:w-10 md:h-10 bg-gray-200 hover:bg-gray-300 rounded text-sm font-bold transition"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            value={item.cantidad}
            onChange={(e) => onQuantityChange(item.productoId, parseInt(e.target.value) || 1)}
            className="w-12 md:w-16 text-center border border-gray-300 rounded py-1 text-sm md:text-base"
          />
          <button
            onClick={() => onQuantityChange(item.productoId, item.cantidad + 1)}
            className="w-8 h-8 md:w-10 md:h-10 bg-gray-200 hover:bg-gray-300 rounded text-sm font-bold transition"
          >
            +
          </button>
        </div>
      </div>

      {/* Discount Control */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-700 block mb-1">
          {locale === 'es' ? 'Descuento ($)' : 'Discount ($)'}
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.descuento}
          onChange={(e) => onDiscountChange(item.productoId, parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm md:text-base"
          placeholder="0.00"
        />
      </div>

      {/* Subtotal */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-xs md:text-sm font-semibold text-gray-700">
            {locale === 'es' ? 'Subtotal' : 'Subtotal'}
          </span>
          <span className="text-lg md:text-xl font-bold text-gray-900">
            ${subtotal.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Payment Method Selector Component
 */
function PaymentMethodSelector({
  locale,
  selectedMethod,
  onMethodChange,
}: {
  locale: Locale;
  selectedMethod: PaymentMethod | '';
  onMethodChange: (method: PaymentMethod) => void;
}) {
  const paymentMethods: Array<{
    value: PaymentMethod;
    label: string;
    icon: string;
  }> = [
    {
      value: 'CASH',
      label: locale === 'es' ? 'Efectivo' : 'Cash',
      icon: '💵',
    },
    {
      value: 'CARD',
      label: locale === 'es' ? 'Tarjeta' : 'Card',
      icon: '💳',
    },
    {
      value: 'MIXED',
      label: locale === 'es' ? 'Mixto' : 'Mixed',
      icon: '💰',
    },
    {
      value: 'QR',
      label: 'Mercado Pago',
      icon: '📱',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <label className="block text-sm md:text-base font-semibold text-gray-700 mb-3">
        {locale === 'es' ? 'Método de Pago' : 'Payment Method'}
      </label>
      <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
        {paymentMethods.map((method) => (
          <button
            key={method.value}
            onClick={() => onMethodChange(method.value)}
            className={`p-3 md:p-4 rounded-lg border-2 transition text-sm md:text-base font-medium flex items-center gap-2 ${
              selectedMethod === method.value
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span className="text-lg md:text-xl">{method.icon}</span>
            {method.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Cart Summary Component
 */
function CartSummary({
  locale,
  items,
  selectedPaymentMethod,
  onPaymentMethodChange,
  onCheckout,
}: {
  locale: Locale;
  items: CartItem[];
  selectedPaymentMethod: PaymentMethod | '';
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onCheckout: () => void;
}) {
  const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.descuento, 0);
  const total = subtotal - totalDiscount;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Cart Items */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
          {locale === 'es' ? 'Carrito' : 'Cart'}
        </h2>
        {items.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-base md:text-lg">
              {locale === 'es'
                ? 'El carrito está vacío'
                : 'Cart is empty'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <CartItemComponent
                key={item.productoId}
                item={item}
                locale={locale}
                onQuantityChange={() => {}}
                onDiscountChange={() => {}}
                onRemove={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Payment Method */}
      {items.length > 0 && (
        <PaymentMethodSelector
          locale={locale}
          selectedMethod={selectedPaymentMethod}
          onMethodChange={onPaymentMethodChange}
        />
      )}

      {/* Summary Totals */}
      {items.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 sticky bottom-24 md:bottom-0">
          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-sm md:text-base">
              <span className="text-gray-700">
                {locale === 'es' ? 'Subtotal' : 'Subtotal'}
              </span>
              <span className="font-semibold text-gray-900">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-gray-700">
                  {locale === 'es' ? 'Descuento' : 'Discount'}
                </span>
                <span className="font-semibold text-red-600">
                  -${totalDiscount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="border-t-2 border-gray-200 pt-3">
              <div className="flex justify-between">
                <span className="text-lg md:text-xl font-bold text-gray-900">
                  {locale === 'es' ? 'Total' : 'Total'}
                </span>
                <span className="text-2xl md:text-3xl font-bold text-green-600">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 md:space-y-3">
            <button
              onClick={onCheckout}
              disabled={!selectedPaymentMethod || items.length === 0}
              className="w-full py-3 md:py-4 bg-green-600 text-white text-base md:text-lg font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {locale === 'es' ? '💳 Procesar Pago' : '💳 Process Payment'}
            </button>
            <button
              className="w-full py-2 md:py-3 border-2 border-gray-300 text-gray-700 text-base md:text-lg font-semibold rounded-lg hover:border-gray-400 transition"
            >
              {locale === 'es' ? '🖨️ Vista Previa' : '🖨️ Receipt Preview'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main POS Terminal Component
 */
export default function POSTerminal() {
  const { locale: loaderLocale } = useLoaderData<POSTerminalData>();
  const { lang } = useParams();
  const locale = (lang || 'es') as Locale;

  // State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock products - replace with API call
  const mockProducts = [
    { id: '1', sku: 'SKU001', nombre: 'Producto A', precio: 19.99, stock: 10 },
    { id: '2', sku: 'SKU002', nombre: 'Producto B', precio: 29.99, stock: 5 },
    { id: '3', sku: 'SKU003', nombre: 'Producto C', precio: 39.99, stock: 15 },
    { id: '4', sku: 'SKU004', nombre: 'Producto D', precio: 49.99, stock: 0 },
  ];

  const filteredProducts = mockProducts.filter((p) =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToCart = (product: any) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.productoId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productoId === product.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productoId: product.id,
          nombre: product.nombre,
          precio: product.precio,
          cantidad: 1,
          descuento: 0,
        },
      ];
    });
  };

  const handleCheckout = () => {
    if (cartItems.length === 0 || !selectedPaymentMethod) return;
    console.log('Processing checkout:', {
      items: cartItems,
      paymentMethod: selectedPaymentMethod,
      total: cartItems.reduce(
        (sum, item) => sum + item.precio * item.cantidad - item.descuento,
        0
      ),
    });
    // TODO: Implement checkout logic
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {/* Left Column - Products (Hidden on Mobile) */}
      <div className="md:col-span-2 space-y-4 md:space-y-6">
        {/* Search Bar - Always Visible */}
        <ProductSearchBar
          locale={locale}
          onSearch={setSearchQuery}
          onAddToCart={() => {}}
        />

        {/* Product Grid */}
        <ProductGrid
          locale={locale}
          products={filteredProducts}
          onSelectProduct={handleAddToCart}
        />
      </div>

      {/* Right Column - Cart (Fixed on Desktop, Fullscreen on Mobile) */}
      <div className="md:col-span-1">
        <CartSummary
          locale={locale}
          items={cartItems}
          selectedPaymentMethod={selectedPaymentMethod}
          onPaymentMethodChange={setSelectedPaymentMethod}
          onCheckout={handleCheckout}
        />
      </div>
    </div>
  );
}
