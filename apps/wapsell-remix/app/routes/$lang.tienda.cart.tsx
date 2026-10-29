/**
 * Shopping Cart Page
 * Allows users to review items, adjust quantities, see totals, and proceed to checkout
 * Public route - works with guest and authenticated users
 */

import type { LoaderFunction, ActionFunction, MetaFunction } from '@remix-run/node';
import { useLoaderData, useParams, Form } from '@remix-run/react';
import { json, redirect } from '@remix-run/node';
import { getSessionFromRequest } from '~/services/auth.server';
import { useState } from 'react';

interface CartItem {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  image: string;
}

interface CartLoaderData {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  locale: string;
  isAuthenticated: boolean;
}

export const loader: LoaderFunction = async ({ request, params }) => {
  const session = await getSessionFromRequest(request);
  const jwt = session.get('jwt');

  // In real app, fetch from cart service/session storage
  // For now, return empty cart
  const items: CartItem[] = [
    // {
    //   id: '1',
    //   nombre: 'Producto 1',
    //   precio: 99.99,
    //   cantidad: 2,
    //   image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    // },
  ];

  const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;

  return json({
    items,
    subtotal,
    tax,
    total,
    locale: params.lang || 'es',
    isAuthenticated: !!jwt,
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const formData = await request.formData();
  const action = formData.get('_action');

  if (action === 'remove') {
    // Remove item from cart
    const itemId = formData.get('itemId');
    // In real app, update cart service
    console.log('Remove item:', itemId);
    return json({ success: true });
  }

  if (action === 'update-quantity') {
    // Update quantity
    const itemId = formData.get('itemId');
    const quantity = parseInt(formData.get('quantity') as string);
    // In real app, update cart service
    console.log('Update quantity:', itemId, quantity);
    return json({ success: true });
  }

  if (action === 'checkout') {
    // Proceed to checkout
    const locale = params.lang || 'es';
    return redirect(`/${locale}/tienda/checkout`);
  }

  return json({ error: 'Unknown action' }, { status: 400 });
};

export const meta: MetaFunction = ({ params }) => [
  {
    title: params.lang === 'es' ? 'Carrito - Tienda' : 'Cart - Store',
  },
];

export default function CartPage() {
  const { items, subtotal, tax, total, locale, isAuthenticated } = useLoaderData<CartLoaderData>();
  const { lang } = useParams();
  const [cartItems, setCartItems] = useState(items);

  const t = locale === 'es' ? {
    cart: 'Carrito',
    empty: 'Tu carrito está vacío',
    emptyDesc: 'Agrega productos para comenzar',
    continueShopping: 'Continuar comprando',
    product: 'Producto',
    price: 'Precio',
    quantity: 'Cantidad',
    subtotal: 'Subtotal',
    total: 'Total',
    tax: 'Impuestos',
    remove: 'Remover',
    checkout: 'Proceder al Pago',
    yourCart: 'Tu Carrito',
    summary: 'Resumen de Compra',
    unit: 'Unidad',
  } : {
    cart: 'Cart',
    empty: 'Your cart is empty',
    emptyDesc: 'Add products to get started',
    continueShopping: 'Continue Shopping',
    product: 'Product',
    price: 'Price',
    quantity: 'Quantity',
    subtotal: 'Subtotal',
    total: 'Total',
    tax: 'Tax',
    remove: 'Remove',
    checkout: 'Proceed to Checkout',
    yourCart: 'Your Cart',
    summary: 'Order Summary',
    unit: 'Unit',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">{t.cart}</h1>
        </div>
      </header>

      {cartItems.length === 0 ? (
        // Empty Cart State
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.empty}</h2>
            <p className="text-gray-600 mb-8">{t.emptyDesc}</p>
            <a
              href={`/${lang}/tienda`}
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {t.continueShopping}
            </a>
          </div>
        </main>
      ) : (
        // Cart with Items
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 bg-gray-50 p-6 border-b border-gray-200 text-sm font-semibold text-gray-700">
                  <div className="col-span-5">{t.product}</div>
                  <div className="col-span-2 text-center">{t.price}</div>
                  <div className="col-span-2 text-center">{t.quantity}</div>
                  <div className="col-span-2 text-center">{t.subtotal}</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Items */}
                {cartItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 p-6 border-b border-gray-200 items-center hover:bg-gray-50 transition">
                    {/* Product Info */}
                    <div className="col-span-5 flex gap-4">
                      <img
                        src={item.image}
                        alt={item.nombre}
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div>
                        <a
                          href={`/${lang}/tienda/product/${item.id}`}
                          className="font-semibold text-gray-900 hover:text-blue-600"
                        >
                          {item.nombre}
                        </a>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="col-span-2 text-center text-gray-900 font-medium">
                      ${item.precio.toFixed(2)}
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2">
                      <div className="flex justify-center items-center border border-gray-300 rounded w-fit mx-auto">
                        <button className="px-3 py-1 text-gray-600 hover:bg-gray-100">−</button>
                        <input
                          type="number"
                          value={item.cantidad}
                          className="w-12 text-center border-0 py-1"
                          min="1"
                          readOnly
                        />
                        <button className="px-3 py-1 text-gray-600 hover:bg-gray-100">+</button>
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="col-span-2 text-center font-semibold text-gray-900">
                      ${(item.precio * item.cantidad).toFixed(2)}
                    </div>

                    {/* Remove */}
                    <div className="col-span-1">
                      <Form method="post">
                        <input type="hidden" name="_action" value="remove" />
                        <input type="hidden" name="itemId" value={item.id} />
                        <button
                          type="submit"
                          className="text-red-600 hover:text-red-700 font-medium text-sm"
                        >
                          {t.remove}
                        </button>
                      </Form>
                    </div>
                  </div>
                ))}
              </div>

              {/* Continue Shopping Button */}
              <div className="mt-6">
                <a
                  href={`/${lang}/tienda`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← {t.continueShopping}
                </a>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">{t.summary}</h2>

                {/* Subtotal */}
                <div className="flex justify-between mb-4 pb-4 border-b border-gray-200">
                  <span className="text-gray-600">{t.subtotal}</span>
                  <span className="text-gray-900 font-medium">${subtotal.toFixed(2)}</span>
                </div>

                {/* Tax */}
                <div className="flex justify-between mb-6 pb-6 border-b border-gray-200">
                  <span className="text-gray-600">{t.tax}</span>
                  <span className="text-gray-900 font-medium">${tax.toFixed(2)}</span>
                </div>

                {/* Total */}
                <div className="flex justify-between mb-8 text-lg">
                  <span className="font-bold text-gray-900">{t.total}</span>
                  <span className="font-bold text-gray-900">${total.toFixed(2)}</span>
                </div>

                {/* Checkout Button */}
                <Form method="post">
                  <input type="hidden" name="_action" value="checkout" />
                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    {t.checkout}
                  </button>
                </Form>

                {!isAuthenticated && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
                    {locale === 'es'
                      ? 'Puedes comprar sin crear cuenta'
                      : 'You can shop without creating an account'
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
