'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F5] via-[#FCF9F5] to-[#F8F5F0] flex flex-col items-center justify-center px-4 py-8 sm:py-12">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#D97757] rounded-full opacity-5" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#6A9BCC] rounded-full opacity-5" />
      </div>

      {/* Main content */}
      <div className="w-full max-w-md relative z-10">
        {/* Logo and branding */}
        <div className="text-center mb-10 sm:mb-12">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#D97757] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg sm:text-xl">W</span>
            </div>
            <span className="text-3xl sm:text-4xl font-bold text-[#1A1815]">Wapsell</span>
          </div>

          {/* Tagline */}
          <p className="text-sm sm:text-base text-gray-600">Plataforma de Negocios Digitales</p>
        </div>

        {/* Form */}
        <LoginForm />

        {/* Help text */}
        <p className="text-center text-xs text-gray-500 mt-8 px-4">
          ¿Necesitas ayuda?{' '}
          <a href="/support" className="text-[#D97757] hover:underline font-medium">
            Contacta al equipo de soporte
          </a>
        </p>
      </div>

      {/* Footer */}
      <div className="mt-16 sm:mt-20 text-center text-xs text-gray-500 relative z-10">
        <p>© 2026 Wapsell. Todos los derechos reservados.</p>
      </div>
    </div>
  );
}
