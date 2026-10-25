/**
 * SEO Configuration
 * Centralized configuration for meta tags, OG tags, structured data
 */

export interface SeoConfig {
  siteName: string;
  baseUrl: string;
  defaultImage: string;
  twitterHandle?: string;
  author: string;
  keywords: string[];
  defaultLocale: string;
  currency: string;
}

export const seoConfig: SeoConfig = {
  siteName: 'Wapsell',
  baseUrl: process.env.BASE_URL || 'https://wapsell.com',
  defaultImage:
    process.env.SEO_DEFAULT_IMAGE ||
    'https://cdn.wapsell.com/og-default.jpg',
  twitterHandle: '@wapsell_io',
  author: 'Wapsell Inc',
  keywords: [
    'ecommerce',
    'pos',
    'erp',
    'tienda online',
    'comercio electrónico',
    'punto de venta',
    'gestión inventario',
  ],
  defaultLocale: 'es-AR',
  currency: 'ARS',
};
