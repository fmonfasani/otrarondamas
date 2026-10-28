'use client';

import { ReactNode } from 'react';
import { IntlProvider } from 'next-intl';
import { AuthProvider } from './AuthContext';

interface ClientLayoutProps {
  children: ReactNode;
  locale: string;
  messages: Record<string, Record<string, string>>;
}

export default function ClientLayout({ children, locale, messages }: ClientLayoutProps) {
  return (
    <IntlProvider locale={locale} messages={messages}>
      <AuthProvider>{children}</AuthProvider>
    </IntlProvider>
  );
}
