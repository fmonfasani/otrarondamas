import { ReactNode } from 'react';
import '../globals.css';
import { getMessages } from 'next-intl/server';

export const metadata = {
  title: 'Wapsell - Plataforma de Negocios Digitales',
  description: 'Plataforma SaaS para gestionar tu negocio digital',
  icons: { icon: '/favicon.ico' },
  other: {
    'og:locale': 'es_ES',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const dynamicParams = false;

interface RootLayoutProps {
  children: ReactNode;
}

export default async function EsLayout({ children }: RootLayoutProps) {
  // Safely get messages with fallback
  const messages: any = {};
  if (typeof window === 'undefined') {
    // Server-side only
    try {
      const m = await getMessages();
      Object.assign(messages, m);
    } catch {
      // Ignore errors during prerendering
    }
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="language" content="Spanish" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
