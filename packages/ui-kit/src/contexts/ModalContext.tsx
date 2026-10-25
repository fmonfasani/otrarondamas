import React, { createContext, ReactNode, useState, useCallback } from 'react';

export interface ModalState {
  isOpen: boolean;
  title?: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  hasCloseButton: boolean;
  data?: Record<string, unknown>;
}

export interface ModalContextType {
  modal: ModalState;
  openModal: (title?: string, size?: 'sm' | 'md' | 'lg' | 'xl', hasCloseButton?: boolean, data?: Record<string, unknown>) => void;
  closeModal: () => void;
}

export const ModalContext = createContext<ModalContextType | undefined>(undefined);

export interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    size: 'md',
    hasCloseButton: true,
  });

  const openModal = useCallback(
    (title?: string, size: 'sm' | 'md' | 'lg' | 'xl' = 'md', hasCloseButton = true, data?: Record<string, unknown>) => {
      setModal({
        isOpen: true,
        title,
        size,
        hasCloseButton,
        data,
      });
    },
    []
  );

  const closeModal = useCallback(() => {
    setModal((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const value: ModalContextType = {
    modal,
    openModal,
    closeModal,
  };

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};
