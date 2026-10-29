/**
 * Checkout Route - E-Commerce Checkout Flow
 * Multi-step checkout process with form validation and payment handling
 */

import type { LoaderFunction, ActionFunction, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, useActionData, useNavigation } from '@remix-run/react';
import { useState, useEffect } from 'react';
import {
  CheckoutFlow,
  OrderConfirmation,
  type CartItem,
  type CheckoutInput,
} from '~/components/tienda/checkout';
import { checkoutAction } from '~/actions/checkout.server';

interface LoaderData {
  cartItems: CartItem[];
  subtotal: number;
  locale: string;
}

interface ActionData {
  success?: boolean;
  orderId?: string;
  redirectUrl?: string;
  estimatedDeliveryDate?: string;
  error?: string;
}

/**
 * Loader: Fetch cart from session/store
 */
export const loader: LoaderFunction = async ({ request, params }) => {
  // TODO: Replace with actual cart retrieval from session or store
  // This is a placeholder implementation

  const cartItems: CartItem[] = [
    {
      id: 'prod-1',
      nombre: 'Example Product 1',
      cantidad: 2,
      precioUnitario: '29.99',
      subtotal: '59.98',
    },
    {
      id: 'prod-2',
      nombre: 'Example Product 2',
      cantidad: 1,
      precioUnitario: '49.99',
      subtotal: '49.99',
    },
  ];

  const subtotal = cartItems.reduce(
    (sum, item) => sum + parseFloat(item.subtotal),
    0
  );

  return json<LoaderData>({
    cartItems,
    subtotal,
    locale: params.lang || 'es',
  });
};

/**
 * Action: Handle checkout submission
 */
export const action: ActionFunction = checkoutAction;

/**
 * Meta tags
 */
export const meta: MetaFunction = ({ params }) => [
  {
    title: params.lang === 'es' ? 'Checkout - Wapsell' : 'Checkout - Wapsell',
  },
  {
    name: 'description',
    content: params.lang === 'es'
      ? 'Completa tu compra de forma segura'
      : 'Complete your purchase securely',
  },
];

/**
 * Checkout Route Component
 */
export default function CheckoutRoute() {
  const { cartItems, subtotal, locale } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Show confirmation screen on success
  useEffect(() => {
    if (actionData?.success && actionData?.orderId) {
      setShowConfirmation(true);
    }
  }, [actionData]);

  // Handle order submission
  const handleSubmitOrder = async (checkoutData: CheckoutInput) => {
    try {
      const response = await fetch('/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...checkoutData,
          cartItems: cartItems.map((item) => ({
            productoId: item.id,
            cantidad: parseInt(item.cantidad as any),
          })),
          total: subtotal,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit order');
      }

      // Handle redirect for external payment processors
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }

      // Success - show confirmation
      if (result.success) {
        setShowConfirmation(true);
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      // Error will be displayed in CheckoutFlow component
      throw error;
    }
  };

  // Show confirmation screen
  if (showConfirmation && actionData?.orderId) {
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + 7);

    return (
      <OrderConfirmation
        orderNumber={actionData.orderId}
        email="customer@example.com" // TODO: Get from checkout data
        estimatedDeliveryDate={estimatedDate.toLocaleDateString(locale)}
        shippingAddress={{
          name: 'John Doe', // TODO: Get from checkout data
          address: '123 Main St',
          city: 'New York',
          zipCode: '10001',
          country: 'USA',
        }}
        total={subtotal}
        trackingUrl={`/orders/${actionData.orderId}/track`}
        onContinueShopping={() => {
          window.location.href = locale === 'es' ? '/es/tienda' : '/en/tienda';
        }}
      />
    );
  }

  // Show checkout form
  return (
    <CheckoutFlow
      items={cartItems}
      subtotal={subtotal}
      onSubmitOrder={handleSubmitOrder}
      onCancel={() => {
        if (window.confirm('¿Deseas cancelar la compra? Tu carrito será guardado.')) {
          window.history.back();
        }
      }}
    />
  );
}

/**
 * Error boundary for checkout errors
 */
export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 text-center mb-2">
          Checkout Error
        </h1>
        <p className="text-gray-600 text-center mb-6">
          {error.message || 'An error occurred during checkout'}
        </p>
        <button
          onClick={() => window.location.href = '/' }
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Return to Store
        </button>
      </div>
    </div>
  );
}
