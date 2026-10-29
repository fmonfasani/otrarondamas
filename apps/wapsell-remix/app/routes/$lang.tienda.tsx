/**
 * Tienda (Online Store) Layout
 * Parent layout for all online store routes
 * Provides navigation, header, and consistent styling
 */

import { Outlet, useParams, useLocation } from '@remix-run/react';
import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { getSessionFromRequest } from '~/services/auth.server';
import { useState } from 'react';

interface TiendaLayoutData {
  isAuthenticated: boolean;
  locale: string;
}

export const loader: LoaderFunction = async ({ request, params }) => {
  const session = await getSessionFromRequest(request);
  const jwt = session.get('jwt');

  return json({
    isAuthenticated: !!jwt,
    locale: params.lang || 'es',
  });
};

export default function TiendaLayout() {
  const { lang } = useParams();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHomePage = location.pathname.endsWith('/tienda') || location.pathname.endsWith('/tienda/');

  const t = (lang === 'es' || !lang)
    ? {
        home: 'Inicio',
        categories: 'Categorías',
        cart: 'Carrito',
        account: 'Cuenta',
        login: 'Iniciar Sesión',
        shop: 'Tienda',
        about: 'Acerca de',
        contact: 'Contacto',
        privacyPolicy: 'Política de Privacidad',
        termsOfService: 'Términos de Servicio',
        copyright: 'Derechos reservados',
      }
    : {
        home: 'Home',
        categories: 'Categories',
        cart: 'Cart',
        account: 'Account',
        login: 'Sign In',
        shop: 'Shop',
        about: 'About',
        contact: 'Contact',
        privacyPolicy: 'Privacy Policy',
        termsOfService: 'Terms of Service',
        copyright: 'All rights reserved',
      };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <a
                href={`/${lang}/tienda`}
                className="flex items-center gap-2 hover:opacity-80 transition"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">W</span>
                </div>
                <span className="font-bold text-gray-900 hidden sm:inline">{t.shop}</span>
              </a>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href={`/${lang}/tienda`}
                className="text-gray-700 hover:text-gray-900 font-medium text-sm transition"
              >
                {t.home}
              </a>
              <div className="relative group">
                <button className="text-gray-700 hover:text-gray-900 font-medium text-sm transition flex items-center gap-1">
                  {t.categories}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>
                {/* Dropdown placeholder */}
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Cart Icon */}
              <a
                href={`/${lang}/tienda/cart`}
                className="relative p-2 text-gray-700 hover:text-gray-900 transition"
                title={t.cart}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  0
                </span>
              </a>

              {/* Account/Login */}
              <a
                href={`/${lang}/tienda/orders`}
                className="hidden sm:block px-4 py-2 text-gray-700 hover:text-gray-900 font-medium text-sm transition"
              >
                {t.account}
              </a>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-700 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <a
                href={`/${lang}/tienda`}
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
              >
                {t.home}
              </a>
              <a
                href={`/${lang}/tienda/orders`}
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
              >
                {t.account}
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-20 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div>
              <h3 className="font-bold text-lg mb-4">{t.shop}</h3>
              <p className="text-gray-400 text-sm mb-4">
                {lang === 'es'
                  ? 'Tu tienda online de confianza para las mejores compras'
                  : 'Your trusted online store for the best shopping'}
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">{lang === 'es' ? 'Navegación' : 'Navigation'}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href={`/${lang}/tienda`} className="hover:text-white transition">
                    {t.home}
                  </a>
                </li>
                <li>
                  <a href={`/${lang}/tienda`} className="hover:text-white transition">
                    {t.shop}
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4">{lang === 'es' ? 'Soporte' : 'Support'}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition">
                    {t.contact}
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">{lang === 'es' ? 'Legal' : 'Legal'}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition">
                    {t.privacyPolicy}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    {t.termsOfService}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2024 Wapsell. {t.copyright}.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
