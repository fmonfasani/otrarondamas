import type { ReactNode } from 'react';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Wapsell',
  description: 'Multi-business platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
