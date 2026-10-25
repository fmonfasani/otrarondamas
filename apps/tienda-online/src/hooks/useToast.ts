import { useState, useCallback } from 'react';

/**
 * Toast message type
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Toast configuration
 */
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

/**
 * useToast - Hook for managing toast notifications
 * Provides methods to add, remove, and manage toast notifications
 *
 * @returns Object with toast state and methods
 *
 * @example
 * const { toasts, addToast, removeToast, clearToasts } = useToast();
 * addToast({ message: 'Success!', type: 'success', duration: 3000 });
 */
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = useCallback(() => `toast-${Date.now()}-${Math.random()}`, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = generateId();
      const newToast: Toast = {
        ...toast,
        id,
        duration: toast.duration ?? 3000,
      };

      setToasts((prevToasts) => [...prevToasts, newToast]);

      // Auto-remove toast after duration
      if (newToast.duration) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }

      return id;
    },
    [generateId]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
  };
};
