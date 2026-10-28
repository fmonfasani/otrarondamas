'use client';

import React, { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';
type ToastPosition =
  'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const typeClasses: Record<ToastType, string> = {
  success: 'bg-[#10B981] text-white',
  error: 'bg-[#EF4444] text-white',
  warning: 'bg-[#F59E0B] text-white',
  info: 'bg-[#3B82F6] text-white',
};

const typeIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  action,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`${typeClasses[type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[500px]`}
    >
      <span className="text-xl font-bold">{typeIcons[type]}</span>
      <span className="flex-1 text-sm font-medium">{message}</span>
      {action && (
        <button
          onClick={() => {
            action.onClick();
            setIsVisible(false);
          }}
          className="ml-2 px-2 py-1 rounded hover:opacity-80 transition-opacity font-medium text-sm"
        >
          {action.label}
        </button>
      )}
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="ml-2 hover:opacity-80 transition-opacity flex-shrink-0"
        aria-label="Close toast"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};

interface ToastContainerProps {
  position?: ToastPosition;
  toasts: Array<ToastProps & { id: string }>;
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'bottom-right',
  toasts,
  onRemove,
}) => {
  const positionClasses: Record<ToastPosition, string> = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-[999] flex flex-col gap-2 pointer-events-none`}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={() => onRemove(toast.id)} />
        </div>
      ))}
    </div>
  );
};

export default Toast;
