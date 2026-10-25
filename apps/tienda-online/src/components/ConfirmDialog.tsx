import React, { useCallback } from 'react';
import { Modal } from '@otrarondamas/ui-kit';
import { useModal } from '@otrarondamas/ui-kit';

/**
 * ConfirmDialog - Reusable confirmation modal
 *
 * Displays a confirmation dialog with title, message, and action buttons.
 * Uses Modal from @wapsell/ui-kit via context.
 *
 * Features:
 * - Customizable title and message
 * - onConfirm and onCancel callbacks
 * - Accessible button labels
 * - WCAG 2.1 AA compliant
 *
 * @example
 * ```tsx
 * const { openModal, closeModal } = useModal();
 *
 * const handleDelete = () => {
 *   openModal('Delete Item', 'md', true, { type: 'confirm' });
 * };
 *
 * <ConfirmDialog
 *   onConfirm={() => {
 *     deleteItem();
 *     closeModal();
 *   }}
 *   onCancel={closeModal}
 *   confirmText="Delete"
 *   confirmVariant="danger"
 * />
 * ```
 */

interface ConfirmDialogProps {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'default' | 'danger' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'default',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const { modal, closeModal } = useModal();

  const handleConfirm = useCallback(() => {
    if (!isLoading) {
      onConfirm();
    }
  }, [onConfirm, isLoading]);

  const handleCancel = useCallback(() => {
    if (!isLoading) {
      onCancel();
      closeModal();
    }
  }, [onCancel, closeModal, isLoading]);

  if (!modal.isOpen || modal.title !== title) {
    return null;
  }

  return (
    <Modal>
      <Modal.Header>{title}</Modal.Header>
      <Modal.Body>
        <p className="text-gray-700 text-sm">{message}</p>
      </Modal.Body>
      <Modal.Footer>
        <button
          onClick={handleCancel}
          disabled={isLoading}
          aria-label={cancelText}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          aria-label={confirmText}
          className={`px-4 py-2 rounded text-white ${
            confirmVariant === 'danger'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-blue-600 hover:bg-blue-700'
          } disabled:opacity-50`}
        >
          {isLoading ? 'Loading...' : confirmText}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmDialog;
