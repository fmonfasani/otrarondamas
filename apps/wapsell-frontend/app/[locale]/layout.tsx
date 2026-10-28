import { ReactNode } from 'react';
import '../globals.css';
import { ClientProvider } from '@/components/ClientProvider';

export const dynamic = 'force-dynamic';
export const dynamicParams = false;

interface RootLayoutProps {
  children: ReactNode;
  params: {
    locale: string;
  };
}

export default function RootLayout({ children, params }: RootLayoutProps) {
  return (
    <html lang={params.locale}>
      <body>
        <ClientProvider>
          <main className="flex-1">{children}</main>
        </ClientProvider>
      </body>
    </html>
  );
}
