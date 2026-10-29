import { Link } from '@remix-run/react';

export interface HeaderProps {
  locale: 'es' | 'en';
  showLogo?: boolean;
  companyName?: string;
}

export function Header({
  locale,
  showLogo = true,
  companyName = 'Wapsell',
}: HeaderProps) {
  const loginText = locale === 'es' ? 'Iniciar Sesión' : 'Sign In';
  const signupText = locale === 'es' ? 'Crear Cuenta' : 'Create Account';

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link to={`/${locale}`} className="flex items-center gap-2 hover:opacity-80 transition">
          {showLogo && (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">W</span>
            </div>
          )}
          <span className="text-xl font-bold text-gray-900">{companyName}</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <Link
            to={`/${locale}/auth/login`}
            className="px-6 py-2 text-gray-700 font-medium hover:text-gray-900 transition"
          >
            {loginText}
          </Link>
          <Link
            to={`/${locale}/auth/register`}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            {signupText}
          </Link>
        </nav>
      </div>
    </header>
  );
}
