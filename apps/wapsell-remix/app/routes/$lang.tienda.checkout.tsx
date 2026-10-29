/**
 * Checkout Flow
 * Multi-step checkout: Address → Shipping → Payment → Review → Confirmation
 * Supports both guest and authenticated users
 */

import type { LoaderFunction, ActionFunction, MetaFunction } from '@remix-run/node';
import { useLoaderData, useParams, Form } from '@remix-run/react';
import { json, redirect } from '@remix-run/node';
import { getSessionFromRequest, getAuthenticatedUser } from '~/services/auth.server';
import { useState } from 'react';

interface CheckoutUser {
  id?: string;
  email?: string;
  nombre?: string;
}

interface CheckoutLoaderData {
  step: number;
  cartTotal: number;
  user: CheckoutUser | null;
  locale: string;
}

export const loader: LoaderFunction = async ({ request, params }) => {
  const session = await getSessionFromRequest(request);
  const user = await getAuthenticatedUser(request);

  return json({
    step: 1,
    cartTotal: 251.88, // Mock: subtotal + tax
    user: user ? {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
    } : null,
    locale: params.lang || 'es',
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const formData = await request.formData();
  const step = parseInt(formData.get('step') as string) || 1;
  const locale = params.lang || 'es';

  // Validate step-specific data
  if (step === 1) {
    // Shipping address validation
    const address = formData.get('address');
    const city = formData.get('city');
    const postalCode = formData.get('postalCode');

    if (!address || !city || !postalCode) {
      return json({ error: 'Missing required address fields' }, { status: 400 });
    }
  } else if (step === 3) {
    // Payment validation
    const paymentMethod = formData.get('paymentMethod');
    if (!paymentMethod) {
      return json({ error: 'Missing payment method' }, { status: 400 });
    }
  } else if (step === 4) {
    // Submit order and redirect to confirmation
    const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
    return redirect(`/${locale}/tienda/orders/${orderId}`);
  }

  // Move to next step
  return json({ success: true, nextStep: step + 1 });
};

export const meta: MetaFunction = ({ params }) => [
  {
    title: params.lang === 'es' ? 'Pago - Tienda' : 'Checkout - Store',
  },
];

type CheckoutStep = 1 | 2 | 3 | 4 | 5;

export default function CheckoutPage() {
  const { step: initialStep, cartTotal, user, locale } = useLoaderData<CheckoutLoaderData>();
  const { lang } = useParams();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(initialStep as CheckoutStep);

  const t = locale === 'es' ? {
    checkout: 'Pago',
    step: 'Paso',
    of: 'de',
    shippingAddress: 'Dirección de Envío',
    shippingMethod: 'Método de Envío',
    payment: 'Pago',
    review: 'Revisar y Confirmar',
    confirmation: 'Confirmación',
    address: 'Dirección',
    city: 'Ciudad',
    postalCode: 'Código Postal',
    phone: 'Teléfono',
    country: 'País',
    standard: 'Estándar (5-7 días)',
    express: 'Rápido (2-3 días)',
    overnight: 'Entrega Nocturna',
    creditCard: 'Tarjeta de Crédito',
    bankTransfer: 'Transferencia Bancaria',
    paypal: 'PayPal',
    subtotal: 'Subtotal',
    shipping: 'Envío',
    tax: 'Impuestos',
    total: 'Total',
    next: 'Siguiente',
    previous: 'Anterior',
    complete: 'Completar Orden',
    placeholders: {
      address: 'Calle y número',
      city: 'Tu ciudad',
      postalCode: '12345',
      phone: '+57 3001234567',
    },
    confirmOrder: 'Confirmar Orden',
    orderNumber: 'Número de Orden',
    orderPlaced: 'Tu orden ha sido confirmada',
    thankYou: 'Gracias por tu compra',
    orderDetails: 'Detalles de la Orden',
    accountInfo: 'Información de Cuenta',
    createAccount: 'Crear Cuenta',
    accountDesc: 'Crea una cuenta para rastrear tu orden',
    continueAs: 'Continuar como Invitado',
  } : {
    checkout: 'Checkout',
    step: 'Step',
    of: 'of',
    shippingAddress: 'Shipping Address',
    shippingMethod: 'Shipping Method',
    payment: 'Payment',
    review: 'Review & Confirm',
    confirmation: 'Confirmation',
    address: 'Address',
    city: 'City',
    postalCode: 'Postal Code',
    phone: 'Phone',
    country: 'Country',
    standard: 'Standard (5-7 days)',
    express: 'Express (2-3 days)',
    overnight: 'Overnight',
    creditCard: 'Credit Card',
    bankTransfer: 'Bank Transfer',
    paypal: 'PayPal',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    tax: 'Tax',
    total: 'Total',
    next: 'Next',
    previous: 'Previous',
    complete: 'Complete Order',
    placeholders: {
      address: 'Street and number',
      city: 'Your city',
      postalCode: '12345',
      phone: '+1 (555) 123-4567',
    },
    confirmOrder: 'Confirm Order',
    orderNumber: 'Order Number',
    orderPlaced: 'Your order has been placed',
    thankYou: 'Thank you for your purchase',
    orderDetails: 'Order Details',
    accountInfo: 'Account Information',
    createAccount: 'Create Account',
    accountDesc: 'Create an account to track your order',
    continueAs: 'Continue as Guest',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">{t.checkout}</h1>
          <p className="text-gray-600 mt-1">
            {t.step} {currentStep} {t.of} 5
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5].map((stepNum) => (
              <div key={stepNum} className="flex-1">
                <div
                  className={`h-2 rounded-full mx-1 transition ${
                    stepNum <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                ></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>{t.shippingAddress}</span>
            <span>{t.shippingMethod}</span>
            <span>{t.payment}</span>
            <span>{t.review}</span>
            <span>{t.confirmation}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Form method="post" className="space-y-8">
              {/* Step 1: Shipping Address */}
              {currentStep === 1 && (
                <div className="bg-white rounded-lg shadow p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">{t.shippingAddress}</h2>

                  <div className="space-y-4">
                    {!user && (
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900">{t.accountDesc}</p>
                        <div className="flex gap-2 mt-3">
                          <button
                            type="button"
                            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            {t.createAccount}
                          </button>
                          <button type="button" className="px-4 py-2 text-blue-600 hover:text-blue-700 text-sm">
                            {t.continueAs}
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.address}</label>
                      <input
                        type="text"
                        name="address"
                        placeholder={t.placeholders.address}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t.city}</label>
                        <input
                          type="text"
                          name="city"
                          placeholder={t.placeholders.city}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t.postalCode}</label>
                        <input
                          type="text"
                          name="postalCode"
                          placeholder={t.placeholders.postalCode}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.phone}</label>
                      <input
                        type="tel"
                        name="phone"
                        placeholder={t.placeholders.phone}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <input type="hidden" name="step" value={1} />
                  <button
                    type="submit"
                    className="w-full mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    {t.next} →
                  </button>
                </div>
              )}

              {/* Step 2: Shipping Method */}
              {currentStep === 2 && (
                <div className="bg-white rounded-lg shadow p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">{t.shippingMethod}</h2>

                  <div className="space-y-4">
                    {[
                      { value: 'standard', label: t.standard, price: 5.99 },
                      { value: 'express', label: t.express, price: 14.99 },
                      { value: 'overnight', label: t.overnight, price: 24.99 },
                    ].map((method) => (
                      <label key={method.value} className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 transition">
                        <input
                          type="radio"
                          name="shippingMethod"
                          value={method.value}
                          defaultChecked={method.value === 'standard'}
                          required
                        />
                        <span className="ml-3 flex-1">
                          <span className="font-medium text-gray-900">{method.label}</span>
                          <span className="text-sm text-gray-600"> - ${method.price.toFixed(2)}</span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <input type="hidden" name="step" value={2} />
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition"
                    >
                      ← {t.previous}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                      {t.next} →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Payment */}
              {currentStep === 3 && (
                <div className="bg-white rounded-lg shadow p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">{t.payment}</h2>

                  <div className="space-y-4">
                    {[
                      { value: 'credit-card', label: t.creditCard },
                      { value: 'bank-transfer', label: t.bankTransfer },
                      { value: 'paypal', label: t.paypal },
                    ].map((method) => (
                      <label key={method.value} className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 transition">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.value}
                          defaultChecked={method.value === 'credit-card'}
                          required
                        />
                        <span className="ml-3 font-medium text-gray-900">{method.label}</span>
                      </label>
                    ))}
                  </div>

                  <input type="hidden" name="step" value={3} />
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition"
                    >
                      ← {t.previous}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                      {t.next} →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Review & Confirm */}
              {currentStep === 4 && (
                <div className="bg-white rounded-lg shadow p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">{t.review}</h2>

                  <div className="space-y-4 pb-6 border-b border-gray-200">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{t.shippingAddress}</h3>
                      <p className="text-sm text-gray-600">123 Main Street</p>
                      <p className="text-sm text-gray-600">New York, NY 10001</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{t.shippingMethod}</h3>
                      <p className="text-sm text-gray-600">{t.standard}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{t.payment}</h3>
                      <p className="text-sm text-gray-600">{t.creditCard}</p>
                    </div>
                  </div>

                  <input type="hidden" name="step" value={4} />
                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition"
                    >
                      ← {t.previous}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                    >
                      {t.complete}
                    </button>
                  </div>
                </div>
              )}
            </Form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">{t.orderDetails}</h3>

              <div className="space-y-3 pb-4 border-b border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.subtotal}</span>
                  <span className="text-gray-900 font-medium">$199.99</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.shipping}</span>
                  <span className="text-gray-900 font-medium">$5.99</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.tax}</span>
                  <span className="text-gray-900 font-medium">$15.90</span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-bold text-gray-900 mt-4">
                <span>{t.total}</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
