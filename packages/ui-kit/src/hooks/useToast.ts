import { useContext } from 'react';
import { ToastContext, ToastContextType, ToastType, ToastPosition } from '../contexts/ToastContext';

export interface UseToastReturn {
  toast: (message: string, type: ToastType, duration?: number, position?: ToastPosition) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToast = (): UseToastReturn => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return {
    toast: context.toast,
    removeToast: context.removeToast,
    clearToasts: context.clearToasts,
  };
};
