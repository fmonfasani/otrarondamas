/**
 * Error Message Component
 * Dismissible error alert
 */

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorMessage({
  message,
  onDismiss,
}: ErrorMessageProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
      <div className="flex-shrink-0 text-xl">⚠</div>
      <div className="flex-1">{message}</div>
      <button
        onClick={() => onDismiss?.()}
        className="text-red-600 hover:text-red-800 text-xl"
        aria-label="Close message"
      >
        ×
      </button>
    </div>
  );
}
