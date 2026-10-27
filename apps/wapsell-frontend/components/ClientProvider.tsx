'use client';

import { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';

interface ClientProviderProps {
  children: ReactNode;
}

export function ClientProvider({ children }: ClientProviderProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
