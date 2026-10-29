'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import CheckoutProgress from './CheckoutProgress';
import ShippingAddressForm from './ShippingAddressForm';
import ShippingMethodSelector from './ShippingMethodSelector';
import PaymentMethodSelector from './PaymentMethodSelector';
import OrderReview from './OrderReview';
import { checkoutSchema, type CheckoutFormData } from '@/lib/validation/checkout.schema';

type Step = 'shipping' | 'shippingMethod' | 'payment' | 'review';

interface CheckoutFlowProps {
  cartTotal: number;
  cartItems: any[];
  onOrderConfirm?: (orderData: any) => Promise<void>;
}

/**
 * Multi-step checkout orchestrator
 * - 4 steps: shipping, shipping method, payment, review
 * - Form state persistence
 * - Validation at each step
 * - Back/Next navigation
 */
export default function CheckoutFlow({
  cartTotal,
  cartItems,
  onOrderConfirm,
}: CheckoutFlowProps) {
  const t = useTranslations();
  const [currentStep, setCurrentStep] = useState<Step>('shipping');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<CheckoutFormData>>({
    shippingAddress: {
      street: '',
      city: '',
      postalCode: '',
      phone: '',
      country: 'AR',
    },
    shippingMethod: 'standard',
    paymentMethod: {
      type: 'card',
    },
  });

  const steps: { id: Step; label: string }[] = [
    { id: 'shipping', label: t('checkout.shippingAddress') },
    { id: 'shippingMethod', label: t('checkout.shippingMethod') },
    { id: 'payment', label: t('checkout.paymentMethod') },
    { id: 'review', label: t('checkout.orderReview') },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const handleNext = async () => {
    try {
      // Validate current step
      const result = checkoutSchema.partial().safeParse(formData);
      if (!result.success) {
        console.error('Validation error:', result.error);
        return;
      }

      if (currentStepIndex < steps.length - 1) {
        setCurrentStep(steps[currentStepIndex + 1].id);
      }
    } catch (error) {
      console.error('Error moving to next step:', error);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    }
  };

  const handleConfirmOrder = async () => {
    try {
      setIsSubmitting(true);
      const result = checkoutSchema.safeParse(formData);
      if (!result.success) {
        console.error('Validation error:', result.error);
        return;
      }

      if (onOrderConfirm) {
        await onOrderConfirm({
          ...formData,
          cartItems,
          total: cartTotal,
        });
      }
    } catch (error) {
      console.error('Error confirming order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const shippingCosts: Record<string, number> = {
    standard: 10,
    express: 25,
    pickup: 0,
  };

  const shippingCost = shippingCosts[formData.shippingMethod || 'standard'] || 0;
  const subtotal = cartTotal;
  const tax = subtotal * 0.21; // 21% VAT
  const total = subtotal + tax + shippingCost;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Progress Indicator */}
      <CheckoutProgress currentStep={currentStepIndex} steps={steps} />

      {/* Form Container */}
      <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
        {currentStep === 'shipping' && (
          <ShippingAddressForm
            data={formData.shippingAddress || {}}
            onChange={(shippingAddress) =>
              setFormData({ ...formData, shippingAddress })
            }
          />
        )}

        {currentStep === 'shippingMethod' && (
          <ShippingMethodSelector
            selectedMethod={formData.shippingMethod || 'standard'}
            onChange={(shippingMethod) =>
              setFormData({ ...formData, shippingMethod })
            }
            costs={shippingCosts}
          />
        )}

        {currentStep === 'payment' && (
          <PaymentMethodSelector
            selectedMethod={formData.paymentMethod}
            onChange={(paymentMethod) =>
              setFormData({ ...formData, paymentMethod })
            }
          />
        )}

        {currentStep === 'review' && (
          <OrderReview
            shippingAddress={formData.shippingAddress || {}}
            shippingMethod={formData.shippingMethod || 'standard'}
            paymentMethod={formData.paymentMethod}
            cartItems={cartItems}
            subtotal={subtotal}
            tax={tax}
            shippingCost={shippingCost}
            total={total}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={handleBack}
          disabled={currentStepIndex === 0}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {t('common.back')}
        </button>

        {currentStep !== 'review' && (
          <button
            onClick={handleNext}
            className="flex-1 px-4 py-3 bg-[#D97757] text-white rounded-lg font-semibold hover:bg-[#C86543] transition"
          >
            {t('common.next')}
          </button>
        )}

        {currentStep === 'review' && (
          <button
            onClick={handleConfirmOrder}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-[#D97757] text-white rounded-lg font-semibold hover:bg-[#C86543] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? t('common.processing') : t('checkout.confirmOrder')}
          </button>
        )}
      </div>

      {/* Order Summary Sidebar - Sticky on Desktop */}
      <div className="mt-8 md:absolute md:right-4 md:top-8 md:w-80 bg-gray-50 rounded-lg p-6 sticky bottom-0">
        <h3 className="font-bold text-lg mb-4">{t('checkout.orderSummary')}</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{t('checkout.subtotal')}</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('checkout.tax')}</span>
            <span className="font-medium">${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('checkout.shipping')}</span>
            <span className="font-medium">${shippingCost.toFixed(2)}</span>
          </div>
        </div>

        <div className="border-t border-gray-200 my-4 pt-4 flex justify-between text-lg font-bold">
          <span>{t('checkout.total')}</span>
          <span className="text-[#D97757]">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
