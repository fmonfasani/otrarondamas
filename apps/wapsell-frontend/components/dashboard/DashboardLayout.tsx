'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/components/AuthContext';
import BusinessSelector from '@/components/BusinessSelector';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { empresa, user, logout } = useAuth();

  if (!empresa) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando empresa...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo / Brand */}
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-[#D97757]">Wapsell</div>
            </div>

            {/* Center - Business Selector */}
            <div className="flex-1 flex justify-center">{empresa && <BusinessSelector />}</div>

            {/* Right - User Menu */}
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user?.nombre}</p>
                <p className="text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
};
