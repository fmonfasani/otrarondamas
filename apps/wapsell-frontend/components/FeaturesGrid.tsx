'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface Feature {
  icon: string;
  title: string;
  desc: string;
}

export default function FeaturesGrid() {
  const t = useTranslations();

  const features: Feature[] = [
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
  ];

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#141413] mb-4">
            {t('home.features.title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('home.features.subtitle')}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group p-8 bg-gradient-to-br from-[#FAF9F5] to-[#F3F1ED] rounded-2xl border border-gray-200 hover:border-[#D97757] hover:shadow-lg transition-all duration-300"
            >
              {/* Icon */}
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className="text-2xl font-semibold text-[#141413] mb-3">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 leading-relaxed">
                {feature.desc}
              </p>

              {/* Accent line */}
              <div className="mt-6 h-1 w-12 bg-[#D97757] rounded-full group-hover:w-16 transition-all duration-300"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
