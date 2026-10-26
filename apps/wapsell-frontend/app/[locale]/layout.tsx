import type { Metadata } from 'next';
import { AuthProvider } from '@/components/AuthContext';
import NavBar from '@/components/NavBar';
import { ReactNode } from 'react';
import '../globals.css';

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

export default function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  return (
    <html lang={params.locale}>
      <body>
        <AuthProvider>
          <NavBar />
          <main className="flex-1">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
