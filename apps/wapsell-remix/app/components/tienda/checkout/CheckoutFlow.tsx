/**
 * Complete Checkout Flow
 * Manages multi-step checkout process with form state management
 */

import React from 'react';
import { ShippingAddressForm, ShippingAddressFormProps } from './ShippingAddressForm';
import { ShippingMethodSelector, ShippingMethodSelectorProps } from './ShippingMethodSelector';
import { PaymentMethodSelector, PaymentMethodSelectorProps } from './PaymentMethodSelector';
import { OrderReview, OrderReviewProps } from './OrderReview';
import { ShippingAddressInput, ShippingMethodInput, PaymentMethodInput, CheckoutInput, SHIPPING_COSTS, CardDetailsInput } from './checkout.schema';

export type CheckoutStep = 1 | 2 | 3 | 4;

export interface CheckoutFlowProps {
  items: OrderReviewProps['items'];
  subtotal: number;
  onSubmitOrder: (data: CheckoutInput) => Promise<void>;
  onCancel?: () => void;
  initialStep?: CheckoutStep;
}

export const CheckoutFlow = React.forwardRef<HTMLDivElement, CheckoutFlowProps>(
  ({ items, subtotal, onSubmitOrder, onCancel, initialStep = 1 }, ref) => {
    const [currentStep, setCurrentStep] = React.useState<CheckoutStep>(initialStep);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string>('');

    // Form state for all steps
    const [shippingAddress, setShippingAddress] = React.useState<ShippingAddressInput | null>(
      null
    );
    const [shippingMethod, setShippingMethod] = React.useState<ShippingMethodInput | null>(
      null
    );
    const [paymentMethod, setPaymentMethod] = React.useState<
      PaymentMethodInput & Partial<CardDetailsInput>
    >(null);

    // Calculate totals
    const shippingCost =
      shippingMethod && shippingMethod.shippingMethod
        ? SHIPPING_COSTS[shippingMethod.shippingMethod].cost
        : 0;

    const total = subtotal + shippingCost;

    // Step handlers
    const handleShippingAddressSubmit = (data: ShippingAddressInput) => {
      setShippingAddress(data);
      setError('');
      setCurrentStep(2);
    };

    const handleShippingMethodSubmit = (data: ShippingMethodInput) => {
      setShippingMethod(data);
      setError('');
      setCurrentStep(3);
    };

    const handlePaymentMethodSubmit = (
      data: PaymentMethodInput & Partial<CardDetailsInput>
    ) => {
      setPaymentMethod(data);
      setError('');
      setCurrentStep(4);
    };

    const handleOrderConfirm = async () => {
      if (!shippingAddress || !shippingMethod || !paymentMethod) {
        setError('Please complete all steps');
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const orderData: CheckoutInput = {
          ...shippingAddress,
          ...shippingMethod,
          ...paymentMethod,
        };

        await onSubmitOrder(orderData);
      } catch (err: any) {
        setError(err.message || 'Failed to submit order. Please try again.');
        setIsLoading(false);
      }
    };

    const handleBack = () => {
      if (currentStep > 1) {
        setCurrentStep((prev) => (prev - 1) as CheckoutStep);
        setError('');
      }
    };

    const handleCancel = () => {
      if (
        window.confirm(
          'Are you sure you want to cancel checkout? Your cart will be saved.'
        )
      ) {
        onCancel?.();
      }
    };

    return (
      <div ref={ref} className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
              </div>
              <button
                onClick={handleCancel}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Step Indicator */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  {[1, 2, 3, 4].map((step) => (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition ${
                            step <= currentStep
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {step < currentStep ? '✓' : step}
                        </div>
                        <p className="text-xs font-medium text-gray-600 mt-2 text-center">
                          {step === 1
                            ? 'Shipping'
                            : step === 2
                              ? 'Method'
                              : step === 3
                                ? 'Payment'
                                : 'Review'}
                        </p>
                      </div>

                      {step < 4 && (
                        <div
                          className={`flex-1 h-1 mx-2 transition ${
                            step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Step Content */}
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                {currentStep === 1 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Shipping Address</h2>
                    <ShippingAddressForm
                      onSubmit={handleShippingAddressSubmit}
                      isLoading={isLoading}
                      initialData={shippingAddress || undefined}
                    />
                  </div>
                )}

                {currentStep === 2 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Shipping Method</h2>
                    <ShippingMethodSelector
                      onSubmit={handleShippingMethodSubmit}
                      onBack={handleBack}
                      isLoading={isLoading}
                      initialData={shippingMethod || undefined}
                      weight={items.reduce((sum, item) => sum + parseFloat(item.cantidad as any), 0)}
                      distance={50} // Default distance, can be calculated from ZIP
                    />
                  </div>
                )}

                {currentStep === 3 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Payment Method</h2>
                    <PaymentMethodSelector
                      onSubmit={handlePaymentMethodSubmit}
                      onBack={handleBack}
                      isLoading={isLoading}
                      initialData={paymentMethod || undefined}
                    />
                  </div>
                )}

                {currentStep === 4 && shippingAddress && shippingMethod && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Order Review</h2>
                    <OrderReview
                      items={items}
                      subtotal={subtotal}
                      shippingCost={shippingCost}
                      shippingMethod={shippingMethod.shippingMethod as any}
                      firstName={shippingAddress.firstName}
                      lastName={shippingAddress.lastName}
                      email={shippingAddress.email}
                      phone={shippingAddress.phone}
                      address={shippingAddress.address}
                      city={shippingAddress.city}
                      zipCode={shippingAddress.zipCode}
                      country={shippingAddress.country}
                      paymentMethod={paymentMethod?.paymentMethod || ''}
                      cardLast4={
                        paymentMethod?.cardNumber
                          ? paymentMethod.cardNumber.slice(-4)
                          : undefined
                      }
                      onConfirm={handleOrderConfirm}
                      onBack={handleBack}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
                <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>

                {/* Items */}
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.nombre} x {item.cantidad}
                      </span>
                      <span className="font-medium text-gray-900">
                        ${parseFloat(item.subtotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">${subtotal.toFixed(2)}</span>
                  </div>

                  {shippingMethod && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className="text-gray-900">
                        ${shippingCost.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Security Badge */}
                <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs text-green-700 flex items-center gap-2">
                    <span>🔒</span> Secure checkout
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
);

CheckoutFlow.displayName = 'CheckoutFlow';
