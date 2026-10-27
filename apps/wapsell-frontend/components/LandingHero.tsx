'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Logo from './Logo';

interface LandingHeroProps {
  isAuthenticated: boolean;
}

export default function LandingHero({ isAuthenticated }: LandingHeroProps) {
  const t = useTranslations();

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 lg:pt-32 pb-16 sm:pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Content */}
          <div className="flex flex-col justify-center">
            {/* Logo */}
            <div className="mb-8">
              <Logo size="md" showText={true} />
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[#141413] leading-tight mb-6">
              {t('home.hero.title')}
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8 max-w-lg">
              {t('home.hero.subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-8 py-4 bg-[#D97757] text-white rounded-lg font-semibold hover:bg-[#C86543] transition-all duration-200 transform hover:scale-105 text-center shadow-md hover:shadow-lg"
                  >
                    {t('home.cta.dashboard')}
                  </Link>
                  <Link
                    href="/negocios"
                    className="px-8 py-4 border-2 border-[#D97757] text-[#D97757] rounded-lg font-semibold hover:bg-[#D97757] hover:text-white transition-all duration-200 text-center"
                  >
                    {t('home.cta.businesses')}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="px-8 py-4 bg-[#D97757] text-white rounded-lg font-semibold hover:bg-[#C86543] transition-all duration-200 transform hover:scale-105 text-center shadow-md hover:shadow-lg"
                  >
                    {t('home.cta.signIn')}
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-8 py-4 border-2 border-[#D97757] text-[#D97757] rounded-lg font-semibold hover:bg-[#D97757] hover:text-white transition-all duration-200 text-center"
                  >
                    {t('home.cta.signUp')}
                  </Link>
                </>
              )}
            </div>

            {/* Trust Badge */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">
                {t('home.trustedBy')}
              </p>
              <div className="flex flex-wrap gap-6 items-center">
                <div className="text-gray-400 font-semibold">500+</div>
                <div className="text-gray-400 font-semibold">100+</div>
                <div className="text-gray-400 font-semibold">24/7</div>
              </div>
            </div>
          </div>

          {/* Right: Visual (Hidden on Mobile) */}
          <div className="hidden lg:block">
            <div className="relative w-full h-96">
              {/* Large gradient card */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#D97757] via-[#B8563F] to-[#8B3A24] rounded-3xl shadow-2xl overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-6 right-6 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                  <div className="absolute bottom-6 left-6 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                </div>

                {/* Content */}
                <div className="relative h-full flex flex-col items-center justify-center text-white p-8">
                  <svg
                    className="w-32 h-32 mb-6 opacity-90"
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
                  <p className="text-2xl font-bold text-center">
                    {t('home.hero.platform')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
