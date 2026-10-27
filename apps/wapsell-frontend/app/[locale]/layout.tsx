import type { Metadata } from 'next';
import { ReactNode } from 'react';
import '../globals.css';

export const dynamic = 'force-dynamic';
export const dynamicParams = false;

export const metadata: Metadata = {
  title: 'Wapsell - Multi-Business Platform',
  description: 'Manage multiple businesses with Wapsell',
};

interface RootLayoutProps {
  children: ReactNode;
  params: {
    locale: string;
  };
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  return (
    <html lang={params.locale}>
      <body>
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
