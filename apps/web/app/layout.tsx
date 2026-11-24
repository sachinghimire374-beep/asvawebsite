import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { absoluteUrl } from '@/lib/utils';
import './globals.css';

// Self-hosted (Latin subset) so builds do not need to reach Google Fonts.
const geist = localFont({ src: './fonts/geist-latin.woff2', weight: '100 900', variable: '--font-geist', display: 'swap' });
const geistMono = localFont({ src: './fonts/geist-mono-latin.woff2', weight: '100 900', variable: '--font-geist-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl('/')),
  applicationName: 'Asva Innovation Lab',
  icons: { icon: [{ url: '/brand/favicon.svg', type: 'image/svg+xml' }] },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
