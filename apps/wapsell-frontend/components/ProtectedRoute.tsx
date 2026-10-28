'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useLocale } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmpresa?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireEmpresa = true }) => {
  const { isAuthenticated, empresaId, isLoading } = useAuth();
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login`);
    } else if (requireEmpresa && !empresaId) {
      router.push(`/${locale}/negocios`);
    }
  }, [isAuthenticated, empresaId, isLoading, requireEmpresa, router, locale]);

  const shouldRender = !isLoading && isAuthenticated && (!requireEmpresa || empresaId);

  if (!shouldRender) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D97757]"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
