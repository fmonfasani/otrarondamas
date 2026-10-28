'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useLocale } from './AuthContext';
import Logo from './Logo';

export default function LandingFooter() {
  const t = useTranslations();
  const locale = useLocale();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1A1815] text-gray-300 border-t border-gray-700">
      <div className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand Column */}
            <div className="col-span-1">
              <Logo size="sm" showText={true} />
              <p className="mt-4 text-sm text-gray-400">{t('footer.tagline')}</p>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="font-semibold text-white mb-4">{t('footer.product')}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href={`/${locale}/`} className="hover:text-[#D97757] transition-colors">
                    {t('footer.features')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/`} className="hover:text-[#D97757] transition-colors">
                    {t('footer.pricing')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/`} className="hover:text-[#D97757] transition-colors">
                    {t('footer.security')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="font-semibold text-white mb-4">{t('footer.company')}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href={`/${locale}/`} className="hover:text-[#D97757] transition-colors">
                    {t('footer.about')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/`} className="hover:text-[#D97757] transition-colors">
                    {t('footer.blog')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/`} className="hover:text-[#D97757] transition-colors">
                    {t('footer.careers')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h4 className="font-semibold text-white mb-4">{t('footer.legal')}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href={`/${locale}/`} className="hover:text-[#D97757] transition-colors">
                    {t('footer.privacy')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/`} className="hover:text-[#D97757] transition-colors">
                    {t('footer.terms')}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/`} className="hover:text-[#D97757] transition-colors">
                    {t('footer.contact')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700 pt-8">
            {/* Bottom Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-400">
                &copy; {currentYear} {t('footer.copyright')}
              </p>
              <div className="flex gap-6">
                <Link href="#" className="text-gray-400 hover:text-[#D97757] transition-colors">
                  Twitter
                </Link>
                <Link href="#" className="text-gray-400 hover:text-[#D97757] transition-colors">
                  LinkedIn
                </Link>
                <Link href="#" className="text-gray-400 hover:text-[#D97757] transition-colors">
                  GitHub
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
