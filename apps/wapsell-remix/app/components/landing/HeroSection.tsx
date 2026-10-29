import { Link } from '@remix-run/react';

export interface HeroSectionProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  locale: 'es' | 'en';
}

export function HeroSection({
  title,
  subtitle,
  ctaText,
  ctaLink,
  locale,
}: HeroSectionProps) {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          {title}
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
          {subtitle}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to={ctaLink}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition transform hover:scale-105"
          >
            {ctaText}
          </Link>
          <Link
            to={`/${locale}/auth/login`}
            className="px-8 py-4 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition transform hover:scale-105"
          >
            {locale === 'es' ? 'Iniciar Sesión' : 'Sign In'}
          </Link>
        </div>
      </div>
    </section>
  );
}
