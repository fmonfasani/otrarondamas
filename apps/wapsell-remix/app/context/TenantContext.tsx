import { createContext, useContext, ReactNode } from 'react';

export interface TenantContextType {
  empresaId: string;
  empresaName: string;
  userId: string;
}

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({
  children,
  tenant,
}: {
  children: ReactNode;
  tenant: TenantContextType;
}) {
  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }

  return context;
}
