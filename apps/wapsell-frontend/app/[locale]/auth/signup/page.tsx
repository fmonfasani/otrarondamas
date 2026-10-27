'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import RegisterForm from '@/components/auth/RegisterForm';

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F5] to-[#F3F1ED] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1A1815] mb-2">Wapsell</h1>
          <p className="text-gray-600">Plataforma de Negocios Digitales</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
