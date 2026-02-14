import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://d1picks.com'),
  title: 'D1 Baseball Picks | Free +EV College Baseball Betting Picks',
  description: 'Free daily +EV college baseball betting picks. No paywall, no signup required. Data-driven picks for D1 baseball.',
  keywords: ['college baseball', 'betting picks', 'EV betting', 'D1 baseball', 'sports betting', 'positive expected value'],
  authors: [{ name: 'D1 Baseball Picks' }],
  openGraph: {
    title: 'D1 Baseball Picks | Free +EV Picks Daily',
    description: 'Free daily +EV college baseball betting picks. No paywall, just data-driven picks.',
    url: 'https://d1picks.com',
    siteName: 'D1 Baseball Picks',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'D1 Baseball Picks - Free +EV College Baseball Betting Picks',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'D1 Baseball Picks | Free +EV Picks Daily',
    description: 'Free daily +EV college baseball betting picks. No paywall, just data-driven picks.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-mlb-dark text-mlb-textPrimary antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
