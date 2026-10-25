import React, { createContext, ReactNode, useState, useCallback, useRef, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  position: ToastPosition;
  onClose?: () => void;
}

export interface ToastContextType {
  toasts: Toast[];
  toast: (message: string, type: ToastType, duration?: number, position?: ToastPosition) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children, maxToasts = 3 }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const timeoutIdsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timeoutId = timeoutIdsRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(id);
    }
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
    timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutIdsRef.current.clear();
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType, duration = 3000, position: ToastPosition = 'top-right') => {
      const id = `toast-${toastIdRef.current++}`;

      // If max toasts reached, remove oldest
      setToasts((prev) => {
        const newToasts = [...prev];
        if (newToasts.length >= maxToasts) {
          const removed = newToasts.shift();
          if (removed) {
            const timeoutId = timeoutIdsRef.current.get(removed.id);
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutIdsRef.current.delete(removed.id);
            }
          }
        }
        return newToasts;
      });

      const newToast: Toast = {
        id,
        message,
        type,
        duration,
        position,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss
      const timeoutId = setTimeout(() => {
        removeToast(id);
      }, duration);

      timeoutIdsRef.current.set(id, timeoutId);
    },
    [maxToasts, removeToast]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutIdsRef.current.clear();
    };
  }, []);

  const value: ToastContextType = {
    toasts,
    toast,
    removeToast,
    clearToasts,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};
