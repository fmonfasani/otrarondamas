'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function Onboarding() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.id as string;
  const t = useTranslations();

  useEffect(() => {
    // Pequeño delay para mostrar el mensaje de éxito
    const timer = setTimeout(() => {
      // Actualizar empresaId en localStorage
      localStorage.setItem('empresaId', empresaId);
      // Redirigir a dashboard
      router.push('/dashboard');
    }, 3000);

    return () => clearTimeout(timer);
  }, [empresaId, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F5] to-[#F3F1ED] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="inline-block p-4 bg-[#D97757] rounded-full">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-[#1A1815] mb-4">
          {t('onboarding.success')}
        </h1>

        <p className="text-lg text-gray-600 mb-8">
          {t('onboarding.redirecting')}
        </p>

        <div className="animate-pulse flex justify-center gap-2">
          <div className="w-3 h-3 bg-[#D97757] rounded-full"></div>
          <div className="w-3 h-3 bg-[#D97757] rounded-full"></div>
          <div className="w-3 h-3 bg-[#D97757] rounded-full"></div>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-8 px-6 py-2 text-[#D97757] hover:text-[#C86543] font-semibold"
        >
          {t('onboarding.clickHere')}
        </button>
      </div>
    </div>
  );
}
