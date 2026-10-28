'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useLocale } from './AuthContext';

interface CTASectionProps {
  isAuthenticated: boolean;
}

export default function CTASection({ isAuthenticated }: CTASectionProps) {
  const t = useTranslations();
  const locale = useLocale();

  if (isAuthenticated) {
    return null;
  }

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
      <div className="max-w-4xl mx-auto">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#D97757]/10 to-[#D97757]/5 rounded-3xl"></div>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#141413] mb-6">
            {t('home.cta.title')}
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">{t('home.cta.subtitle')}</p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${locale}/auth/signup`}
              className="px-8 py-4 bg-[#D97757] text-white rounded-lg font-semibold hover:bg-[#C86543] transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {t('home.cta.getStarted')}
            </Link>
            <Link
              href={`/${locale}/auth/login`}
              className="px-8 py-4 border-2 border-[#D97757] text-[#D97757] rounded-lg font-semibold hover:bg-[#D97757] hover:text-white transition-all duration-200"
            >
              {t('home.cta.signIn')}
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 pt-12 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-6">{t('home.cta.joinCommunity')}</p>
            <div className="flex justify-center gap-8 flex-wrap">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#D97757]">500+</p>
                <p className="text-sm text-gray-600">{t('home.cta.businesses')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#D97757]">5000+</p>
                <p className="text-sm text-gray-600">{t('home.cta.users')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#D97757]">150M+</p>
                <p className="text-sm text-gray-600">{t('home.cta.transactions')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
