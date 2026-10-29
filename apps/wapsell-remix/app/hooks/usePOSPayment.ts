/**
 * usePayment Hook
 * Client-side hook for handling POS payment processing
 * - Payment form state management
 * - Validation feedback
 * - Loading states for API calls
 * - Error handling
 */

import { useState, useCallback } from 'react';
import type { PaymentInput } from '~/utils/payment.validation';
import { PaymentSchema } from '~/utils/payment.validation';

export interface PaymentState {
  method: 'CASH' | 'CARD' | 'MIXED' | 'QR' | null;
  amount?: number;
  amountReceived?: number;
  cardNumber?: string;
  cardholderName?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string;
  installments?: number;
  cashAmount?: number;
  cardAmount?: number;
  qrReference?: string;
  provider?: 'MERCADO_PAGO' | 'OTHER';
}

export interface PaymentErrors {
  method?: string;
  amount?: string;
  amountReceived?: string;
  cardNumber?: string;
  cardholderName?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv?: string;
  cashAmount?: string;
  cardAmount?: string;
  qrReference?: string;
  general?: string;
}

export interface UsePOSPaymentReturn {
  state: PaymentState;
  errors: PaymentErrors;
  isProcessing: boolean;
  updatePayment: (updates: Partial<PaymentState>) => void;
  resetPayment: () => void;
  validatePayment: () => boolean;
  buildPaymentData: () => PaymentInput | null;
}

const initialState: PaymentState = {
  method: null,
};

/**
 * Hook for managing payment state and validation
 */
export function usePOSPayment(): UsePOSPaymentReturn {
  const [state, setState] = useState<PaymentState>(initialState);
  const [errors, setErrors] = useState<PaymentErrors>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const updatePayment = useCallback((updates: Partial<PaymentState>) => {
    setState((prev) => {
      const next = { ...prev, ...updates };

      // Reset errors on update
      setErrors({});

      return next;
    });
  }, []);

  const resetPayment = useCallback(() => {
    setState(initialState);
    setErrors({});
    setIsProcessing(false);
  }, []);

  const validatePayment = useCallback((): boolean => {
    if (!state.method) {
      setErrors({ method: 'Payment method is required' });
      return false;
    }

    const newErrors: PaymentErrors = {};

    try {
      const paymentData = buildPaymentData();
      if (!paymentData) {
        newErrors.general = 'Unable to build payment data';
        setErrors(newErrors);
        return false;
      }

      // Validate with Zod schema
      PaymentSchema.parse(paymentData);
      setErrors({});
      return true;
    } catch (error: any) {
      if (error.errors && Array.isArray(error.errors)) {
        // Zod error
        error.errors.forEach((err: any) => {
          const path = err.path[0] as string;
          if (path) {
            newErrors[path as keyof PaymentErrors] = err.message;
          }
        });
      } else {
        newErrors.general = error?.message || 'Validation failed';
      }
      setErrors(newErrors);
      return false;
    }
  }, [state]);

  const buildPaymentData = useCallback((): PaymentInput | null => {
    switch (state.method) {
      case 'CASH':
        if (!state.amount || state.amount <= 0) return null;
        return {
          method: 'CASH',
          amount: state.amount,
          amountReceived: state.amountReceived,
        };

      case 'CARD':
        if (
          !state.amount ||
          state.amount <= 0 ||
          !state.cardNumber ||
          !state.cardholderName ||
          !state.expiryMonth ||
          !state.expiryYear ||
          !state.cvv
        ) {
          return null;
        }
        return {
          method: 'CARD',
          cardNumber: state.cardNumber,
          cardholderName: state.cardholderName,
          expiryMonth: state.expiryMonth,
          expiryYear: state.expiryYear,
          cvv: state.cvv,
          amount: state.amount,
          installments: state.installments,
        };

      case 'QR':
        if (!state.amount || state.amount <= 0 || !state.qrReference) return null;
        return {
          method: 'QR',
          amount: state.amount,
          qrReference: state.qrReference,
          provider: state.provider || 'MERCADO_PAGO',
        };

      case 'MIXED':
        if ((state.cashAmount ?? 0) + (state.cardAmount ?? 0) <= 0) return null;
        const mixed: PaymentInput = {
          method: 'MIXED',
          cashAmount: state.cashAmount ?? 0,
          cardAmount: state.cardAmount ?? 0,
          amountReceived: state.amountReceived,
        };

        // Add card details if cardAmount > 0
        if ((state.cardAmount ?? 0) > 0) {
          mixed.cardNumber = state.cardNumber;
          mixed.cardholderName = state.cardholderName;
          mixed.expiryMonth = state.expiryMonth;
          mixed.expiryYear = state.expiryYear;
          mixed.cvv = state.cvv;
          mixed.installments = state.installments;
        }

        return mixed;

      default:
        return null;
    }
  }, [state]);

  return {
    state,
    errors,
    isProcessing,
    updatePayment,
    resetPayment,
    validatePayment,
    buildPaymentData,
  };
}

/**
 * Hook for submitting a complete sale with payment
 */
export interface UseCompleteSaleOptions {
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
}

export function useCompleteSale(options?: UseCompleteSaleOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (requestData: {
      items: any[];
      payment: PaymentInput;
      canal: 'presencial' | 'mayorista' | 'online';
      clienteId?: string;
      idempotencyKey?: string;
    }) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/pos/complete-sale', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.details || data.message || 'Sale creation failed';
          setError(errorMessage);
          options?.onError?.(data);
          return null;
        }

        options?.onSuccess?.(data);
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Network error';
        setError(errorMessage);
        options?.onError?.(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    submit,
    isLoading,
    error,
    reset,
  };
}
