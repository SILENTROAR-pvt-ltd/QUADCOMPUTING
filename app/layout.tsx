import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'Quad Computing',
  description: 'Choose your Quad Computing portal.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
};

import { RealtimeHealthIndicator } from '@/components/common/RealtimeHealthIndicator';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <RealtimeHealthIndicator />
        <Analytics />
      </body>
    </html>
  );
}
