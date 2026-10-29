import { Link } from '@remix-run/react';

export interface CTASectionProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  locale: 'es' | 'en';
}

export function CTASection({
  title,
  subtitle,
  ctaText,
  ctaLink,
  locale,
}: CTASectionProps) {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-12 sm:p-16 text-white text-center">
          <h3 className="text-3xl sm:text-4xl font-bold mb-4">{title}</h3>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">{subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={ctaLink}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition transform hover:scale-105"
            >
              {ctaText}
            </Link>
            <Link
              to={`/${locale}/auth/login`}
              className="px-8 py-4 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition border border-white"
            >
              {locale === 'es' ? 'Iniciar Sesión' : 'Sign In'}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
