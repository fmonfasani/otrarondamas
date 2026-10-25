import React, { ReactNode } from 'react';
import { ModalProvider } from '@otrarondamas/ui-kit';
import { ToastProvider, ToastContainer } from '@otrarondamas/ui-kit';

/**
 * AppProviders - Root provider wrapper for tienda-online
 *
 * Integrates:
 * - ModalProvider: Context for modal dialogs
 * - ToastProvider: Context for toast notifications
 * - ToastContainer: Renders toast notifications
 *
 * Usage:
 * ```tsx
 * <AppProviders>
 *   <App />
 * </AppProviders>
 * ```
 *
 * @example
 * Provides Modal and Toast functionality throughout the app via context
 */

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ToastProvider maxToasts={3}>
      <ModalProvider>
        {children}
        <ToastContainer />
      </ModalProvider>
    </ToastProvider>
  );
};

export default AppProviders;
