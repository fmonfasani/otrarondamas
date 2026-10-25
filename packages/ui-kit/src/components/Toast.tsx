import React, { useEffect } from 'react';
import { useContext } from 'react';
import { ToastContext, Toast as ToastType } from '../contexts/ToastContext';

const typeStyles = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: '✓',
    iconBg: 'bg-green-100',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: '✕',
    iconBg: 'bg-red-100',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'ⓘ',
    iconBg: 'bg-blue-100',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: '⚠',
    iconBg: 'bg-yellow-100',
  },
};

const positionClasses: Record<string, string> = {
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
};

interface ToastItemProps {
  toast: ToastType;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast }) => {
  const context = useContext(ToastContext);
  const style = typeStyles[toast.type];

  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        if (context) {
          context.removeToast(toast.id);
        }
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast, context]);

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-lg p-4 flex items-center gap-3 shadow-md animate-slideIn`}
      role="status"
      aria-live="polite"
    >
      <div className={`${style.iconBg} w-8 h-8 rounded-full flex items-center justify-center font-bold ${style.text}`}>
        {style.icon}
      </div>
      <div className="flex-1">
        <p className={`${style.text} font-medium`}>{toast.message}</p>
      </div>
      {context && (
        <button
          onClick={() => context.removeToast(toast.id)}
          className={`${style.text} hover:opacity-70 ml-2`}
          aria-label="Dismiss toast"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('ToastContainer must be used within a ToastProvider');
  }

  // Group toasts by position
  const toastsByPosition = context.toasts.reduce(
    (acc, toast) => {
      const pos = toast.position;
      if (!acc[pos]) {
        acc[pos] = [];
      }
      acc[pos].push(toast);
      return acc;
    },
    {} as Record<string, ToastType[]>
  );

  return (
    <>
      {Object.entries(toastsByPosition).map(([position, toasts]) => (
        <div
          key={position}
          className={`fixed z-50 flex flex-col gap-2 ${positionClasses[position]} pointer-events-none`}
          aria-label={`Toast notifications - ${position}`}
        >
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} />
            </div>
          ))}
        </div>
      ))}
    </>
  );
};
