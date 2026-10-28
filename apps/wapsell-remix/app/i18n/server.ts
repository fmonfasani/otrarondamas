export function getLocaleFromRequest(request: Request): string {
  const url = new URL(request.url);
  const lang = url.pathname.split('/')[1];

  if (['es', 'en'].includes(lang)) {
    return lang;
  }

  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage?.startsWith('en')) {
    return 'en';
  }

  return 'es'; // Default
}
