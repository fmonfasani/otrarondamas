import { useState, useCallback } from 'react';

/**
 * useModal - Hook for managing modal/dialog state
 * Provides methods to open, close, and toggle modal visibility
 *
 * @returns Object with modal state and methods
 *
 * @example
 * const { isOpen, open, close, toggle } = useModal(false);
 * return (
 *   <>
 *     <button onClick={open}>Open Modal</button>
 *     {isOpen && <Modal onClose={close} />}
 *   </>
 * );
 */
export const useModal = (initialState: boolean = false) => {
  const [isOpen, setIsOpen] = useState<boolean>(initialState);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
};
