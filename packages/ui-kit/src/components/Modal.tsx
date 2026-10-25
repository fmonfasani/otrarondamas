import React, { useEffect, useRef, ReactNode } from 'react';
import { useModal } from '../hooks/useModal';

const sizeClasses: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: 'w-96',
  md: 'w-full max-w-2xl',
  lg: 'w-full max-w-4xl',
  xl: 'w-full max-w-6xl',
};

interface ModalTriggerProps {
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hasCloseButton?: boolean;
  data?: Record<string, unknown>;
}

export const ModalTrigger: React.FC<ModalTriggerProps> = ({
  children,
  title,
  size = 'md',
  hasCloseButton = true,
  data,
}) => {
  const { openModal } = useModal();

  return (
    <div
      onClick={() => openModal(title, size, hasCloseButton, data)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          openModal(title, size, hasCloseButton, data);
        }
      }}
    >
      {children}
    </div>
  );
};

interface ModalHeaderProps {
  children: ReactNode;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ children }) => (
  <div className="border-b border-gray-200 px-6 py-4">
    <h2 className="text-lg font-semibold text-gray-900">{children}</h2>
  </div>
);

interface ModalBodyProps {
  children: ReactNode;
}

export const ModalBody: React.FC<ModalBodyProps> = ({ children }) => (
  <div className="px-6 py-4">{children}</div>
);

interface ModalFooterProps {
  children: ReactNode;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children }) => (
  <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">{children}</div>
);

interface ModalProps {
  children: ReactNode;
}

export const Modal: React.FC<ModalProps> & {
  Trigger: typeof ModalTrigger;
  Header: typeof ModalHeader;
  Body: typeof ModalBody;
  Footer: typeof ModalFooter;
} = ({ children }) => {
  const { modal, closeModal } = useModal();
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll lock when modal opens
  useEffect(() => {
    if (modal.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modal.isOpen]);

  // Focus trap: focus first interactive element
  useEffect(() => {
    if (modal.isOpen && contentRef.current) {
      const focusableElements = contentRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [modal.isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modal.isOpen) {
        closeModal();
      }
    };

    if (modal.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [modal.isOpen, closeModal]);

  if (!modal.isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === modalRef.current) {
      closeModal();
    }
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div
        ref={contentRef}
        className={`bg-white rounded-lg shadow-lg ${sizeClasses[modal.size]} max-h-screen overflow-y-auto`}
      >
        {modal.hasCloseButton && (
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

Modal.Trigger = ModalTrigger;
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
