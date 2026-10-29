/**
 * Success Message Component
 * Dismissible success alert
 */

import { useState, useEffect } from 'react';

interface SuccessMessageProps {
  message: string;
  onDismiss?: () => void;
  autoClose?: number; // milliseconds
}

export default function SuccessMessage({
  message,
  onDismiss,
  autoClose = 5000,
}: SuccessMessageProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!autoClose) return;

    const timeout = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, autoClose);

    return () => clearTimeout(timeout);
  }, [autoClose, onDismiss]);

  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
      <div className="flex-shrink-0 text-xl">✓</div>
      <div className="flex-1">{message}</div>
      <button
        onClick={() => {
          setIsVisible(false);
          onDismiss?.();
        }}
        className="text-green-600 hover:text-green-800 text-xl"
        aria-label="Close message"
      >
        ×
      </button>
    </div>
  );
}
