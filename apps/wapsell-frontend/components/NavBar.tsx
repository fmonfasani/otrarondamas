'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthContext';
import BusinessSelector from './BusinessSelector';
import { useTranslations } from 'next-intl';

const NavBar: React.FC = () => {
  const { user, empresa, logout, isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const t = useTranslations();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="bg-[#1A1815] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-[#D97757]">
              Wapsell
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-6">
              <Link
                href="/"
                className="hover:text-[#D97757] transition-colors"
              >
                {t('nav.home')}
              </Link>
              <Link
                href="/dashboard"
                className="hover:text-[#D97757] transition-colors"
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                href="/negocios"
                className="hover:text-[#D97757] transition-colors"
              >
                {t('nav.myBusinesses')}
              </Link>
            </div>
          </div>

          {/* Business Selector & User Menu */}
          <div className="flex items-center gap-4">
            {empresa && (
              <BusinessSelector
                currentEmpresa={empresa}
                empresas={[]}
              />
            )}

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                <span className="hidden sm:inline">{user?.nombre}</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-lg z-50">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 hover:bg-gray-100 rounded-t-lg"
                  >
                    {t('nav.profile')}
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-b-lg text-red-600"
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link
              href="/"
              className="block px-4 py-2 hover:bg-gray-700 rounded"
            >
              {t('nav.home')}
            </Link>
            <Link
              href="/dashboard"
              className="block px-4 py-2 hover:bg-gray-700 rounded"
            >
              {t('nav.dashboard')}
            </Link>
            <Link
              href="/negocios"
              className="block px-4 py-2 hover:bg-gray-700 rounded"
            >
              {t('nav.myBusinesses')}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
