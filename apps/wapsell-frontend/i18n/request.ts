import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from '../i18n.config';

// Safely handle both server and client contexts
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = requestLocale || defaultLocale;

  // Validate that the incoming `locale` is valid
  if (!locale || !locales.includes(locale)) {
    locale = defaultLocale;
  }

  try {
    const messages = (await import(`../messages/${locale}.json`)).default;
    return {
      locale,
      messages,
      timeZone: 'America/Argentina/Buenos_Aires',
      now: new Date(),
    };
  } catch (_error) {
    // Fallback to default locale if import fails
    const messages = (await import(`../messages/${defaultLocale}.json`)).default;
    return {
      locale: defaultLocale,
      messages,
      timeZone: 'America/Argentina/Buenos_Aires',
      now: new Date(),
    };
  }
});
