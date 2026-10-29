/**
 * Confirmation Dialog Component
 * Reusable modal for confirming destructive or important actions
 */

import FormButton from './FormButton';

interface ConfirmationDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'secondary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmationDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationDialogProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-gray-700">{message}</p>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelLabel}
            </button>
            <FormButton
              type="button"
              label={confirmLabel}
              variant={confirmVariant}
              isLoading={isLoading}
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </>
  );
}
