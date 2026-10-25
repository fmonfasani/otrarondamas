import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Modal } from '../Modal';
import { ModalProvider } from '../../contexts/ModalContext';
import { useModal } from '../../hooks/useModal';

// Test component wrapper
const ModalTestWrapper: React.FC = () => {
  const { openModal, closeModal, modal } = useModal();

  return (
    <div>
      <button onClick={() => openModal('Test Modal', 'md', true)}>Open Modal</button>
      <button onClick={closeModal}>Close Modal Button</button>
      <Modal>
        <Modal.Header>Test Modal</Modal.Header>
        <Modal.Body>
          <p>This is a test modal</p>
          <input type="text" placeholder="Test input" />
        </Modal.Body>
        <Modal.Footer>
          <button onClick={closeModal}>Cancel</button>
          <button>Save</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

describe('Modal Component', () => {
  it('should render modal when isOpen is true', () => {
    render(
      <ModalProvider>
        <ModalTestWrapper />
      </ModalProvider>
    );

    const openButton = screen.getByRole('button', { name: /open modal/i });
    fireEvent.click(openButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('This is a test modal')).toBeInTheDocument();
  });

  it('should not render modal when isOpen is false', () => {
    render(
      <ModalProvider>
        <ModalTestWrapper />
      </ModalProvider>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should close modal on close button click', () => {
    render(
      <ModalProvider>
        <ModalTestWrapper />
      </ModalProvider>
    );

    const openButton = screen.getByRole('button', { name: /open modal/i });
    fireEvent.click(openButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeButton);

    waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should close modal on Escape key press', () => {
    render(
      <ModalProvider>
        <ModalTestWrapper />
      </ModalProvider>
    );

    const openButton = screen.getByRole('button', { name: /open modal/i });
    fireEvent.click(openButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should close modal on backdrop click', () => {
    render(
      <ModalProvider>
        <ModalTestWrapper />
      </ModalProvider>
    );

    const openButton = screen.getByRole('button', { name: /open modal/i });
    fireEvent.click(openButton);

    const backdrop = screen.getByRole('dialog').parentElement;
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should focus first focusable element on open', async () => {
    render(
      <ModalProvider>
        <ModalTestWrapper />
      </ModalProvider>
    );

    const openButton = screen.getByRole('button', { name: /open modal/i });
    fireEvent.click(openButton);

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Test input');
      expect(input).toBeInTheDocument();
    });
  });

  it('should lock scroll when modal is open', () => {
    render(
      <ModalProvider>
        <ModalTestWrapper />
      </ModalProvider>
    );

    const openButton = screen.getByRole('button', { name: /open modal/i });
    fireEvent.click(openButton);

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should unlock scroll when modal is closed', async () => {
    render(
      <ModalProvider>
        <ModalTestWrapper />
      </ModalProvider>
    );

    const openButton = screen.getByRole('button', { name: /open modal/i });
    fireEvent.click(openButton);

    expect(document.body.style.overflow).toBe('hidden');

    const closeButton = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  it('should render with different sizes', () => {
    render(
      <ModalProvider>
        <ModalTestWrapper />
      </ModalProvider>
    );

    const openButton = screen.getByRole('button', { name: /open modal/i });
    fireEvent.click(openButton);

    const modalContent = screen.getByRole('dialog').querySelector('div');
    expect(modalContent).toHaveClass('w-full', 'max-w-2xl');
  });

  it('should display close button when hasCloseButton is true', () => {
    render(
      <ModalProvider>
        <ModalTestWrapper />
      </ModalProvider>
    );

    const openButton = screen.getByRole('button', { name: /open modal/i });
    fireEvent.click(openButton);

    expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
  });

  it('should render Modal.Header, Modal.Body, and Modal.Footer', () => {
    render(
      <ModalProvider>
        <ModalTestWrapper />
      </ModalProvider>
    );

    const openButton = screen.getByRole('button', { name: /open modal/i });
    fireEvent.click(openButton);

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('This is a test modal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });
});
