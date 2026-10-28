'use client';

import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';

interface LocaleProviderWrapperProps {
  children: ReactNode;
  messages: any;
  locale: string;
}

export function LocaleProviderWrapper({
  children,
  messages,
  locale,
}: LocaleProviderWrapperProps) {
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
