import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  staticPageGenerationTimeout: 1, // Skip static page generation
};

export default withNextIntl(nextConfig);
