'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmpresa?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireEmpresa = true }) => {
  const { isAuthenticated, empresaId, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/auth/login');
    } else if (requireEmpresa && !empresaId) {
      router.push('/negocios');
    }
  }, [isAuthenticated, empresaId, isLoading, requireEmpresa, router]);

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
