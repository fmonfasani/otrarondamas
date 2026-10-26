'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthContext';

export default function Home() {
  const t = useTranslations();
  const { isAuthenticated, empresa } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F5] to-[#F3F1ED]">
      {/* Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-12 sm:pb-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1815] mb-6">
              {t('home.hero.title')}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8">
              {t('home.hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-8 py-3 bg-[#D97757] text-white rounded-lg font-semibold hover:bg-[#C86543] transition-colors text-center"
                  >
                    {t('home.cta.dashboard')}
                  </Link>
                  <Link
                    href="/negocios"
                    className="px-8 py-3 border-2 border-[#D97757] text-[#D97757] rounded-lg font-semibold hover:bg-[#D97757] hover:text-white transition-colors text-center"
                  >
                    {t('home.cta.businesses')}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="px-8 py-3 bg-[#D97757] text-white rounded-lg font-semibold hover:bg-[#C86543] transition-colors text-center"
                  >
                    {t('home.cta.signIn')}
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-8 py-3 border-2 border-[#D97757] text-[#D97757] rounded-lg font-semibold hover:bg-[#D97757] hover:text-white transition-colors text-center"
                  >
                    {t('home.cta.signUp')}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right Visual */}
          <div className="hidden md:block">
            <div className="relative w-full aspect-square bg-white rounded-2xl shadow-xl p-8">
              <div className="bg-gradient-to-br from-[#D97757] to-[#C86543] rounded-xl w-full h-full flex items-center justify-center">
                <div className="text-center text-white">
                  <svg
                    className="w-24 h-24 mx-auto mb-4 opacity-80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <p className="text-lg font-semibold">Wapsell Platform</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        {!isAuthenticated && (
          <div className="mt-20 sm:mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '🏢',
                title: t('home.features.multiTenant.title'),
                desc: t('home.features.multiTenant.desc'),
              },
              {
                icon: '📊',
                title: t('home.features.analytics.title'),
                desc: t('home.features.analytics.desc'),
              },
              {
                icon: '🔒',
                title: t('home.features.security.title'),
                desc: t('home.features.security.desc'),
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-[#1A1815] mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Current Business Info (if authenticated) */}
      {isAuthenticated && empresa && (
        <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-20 max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-8 border-l-4 border-[#D97757]">
            <h2 className="text-2xl font-semibold text-[#1A1815] mb-4">
              {t('home.currentBusiness')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-600 text-sm">{t('home.businessName')}</p>
                <p className="text-lg font-semibold text-[#1A1815]">{empresa.nombre}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">{t('home.plan')}</p>
                <p className="text-lg font-semibold text-[#D97757] capitalize">
                  {empresa.plan}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">{t('home.activeUsers')}</p>
                <p className="text-lg font-semibold text-[#1A1815]">
                  {empresa.usuariosActivos}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
