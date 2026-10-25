import { useToast } from '@otrarondamas/ui-kit';
import { ToastType, ToastPosition } from '@otrarondamas/ui-kit';

/**
 * useNotification - App-level convenience wrapper for Toast notifications
 *
 * Simplifies toast usage with shorthand methods for common notification types.
 *
 * Features:
 * - Success, error, info, warning shortcuts
 * - Configurable duration
 * - Position management
 * - Automatic cleanup
 *
 * @example
 * ```tsx
 * const { notify, success, error } = useNotification();
 *
 * // Using notify shorthand
 * notify('Item added', 'success');
 *
 * // Using convenience methods
 * success('Operation completed');
 * error('Something went wrong');
 * ```
 */

interface NotificationOptions {
  duration?: number;
  position?: ToastPosition;
}

interface UseNotificationReturn {
  notify: (message: string, type: ToastType, options?: NotificationOptions) => void;
  success: (message: string, options?: NotificationOptions) => void;
  error: (message: string, options?: NotificationOptions) => void;
  info: (message: string, options?: NotificationOptions) => void;
  warning: (message: string, options?: NotificationOptions) => void;
}

export const useNotification = (): UseNotificationReturn => {
  const { toast } = useToast();

  const notify = (message: string, type: ToastType = 'info', options?: NotificationOptions) => {
    toast(message, type, options?.duration ?? 3000, options?.position ?? 'top-right');
  };

  const success = (message: string, options?: NotificationOptions) => {
    notify(message, 'success', options);
  };

  const error = (message: string, options?: NotificationOptions) => {
    notify(message, 'error', options);
  };

  const info = (message: string, options?: NotificationOptions) => {
    notify(message, 'info', options);
  };

  const warning = (message: string, options?: NotificationOptions) => {
    notify(message, 'warning', options);
  };

  return {
    notify,
    success,
    error,
    info,
    warning,
  };
};

export default useNotification;
