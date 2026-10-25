import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';
import { ModalProvider } from '@otrarondamas/ui-kit';

/**
 * ConfirmDialog Test Suite
 *
 * Tests:
 * 1. Renders dialog with title and message
 * 2. Calls onConfirm when confirm button clicked
 * 3. Calls onCancel when cancel button clicked
 * 4. Disables buttons while loading
 */

const renderWithModal = (component: React.ReactElement) => {
  return render(
    <ModalProvider>
      {component}
    </ModalProvider>
  );
};

describe('ConfirmDialog', () => {
  it('should render confirm dialog with title and message', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    renderWithModal(
      <ConfirmDialog
        title="Delete Item?"
        message="This action cannot be undone"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Delete Item?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    renderWithModal(
      <ConfirmDialog
        title="Confirm"
        message="Are you sure?"
        confirmText="Yes"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /yes/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    renderWithModal(
      <ConfirmDialog
        title="Confirm"
        message="Are you sure?"
        cancelText="No"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /no/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalled();
    });
  });

  it('should disable buttons while loading', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    renderWithModal(
      <ConfirmDialog
        title="Confirm"
        message="Loading..."
        onConfirm={onConfirm}
        onCancel={onCancel}
        isLoading={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      if (button.getAttribute('aria-label') !== 'Close modal') {
        expect(button).toBeDisabled();
      }
    });
  });
});
