import type { Metadata } from 'next';
import { Archivo } from 'next/font/google';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Analytics } from '@/kit/components/Analytics';
import { config, siteOrigin } from '@/kit/config';
import { JsonLd, organization, website } from '@/kit/seo/jsonld';
import { FOOTER, NAV } from '@/site/pages';
import './globals.css';

// Default for every page: regenerate at most hourly, so a page whose release
// date passes appears without a deploy. Content pages repeat it explicitly.
export const revalidate = 3600;

// One family at two widths (see globals.css). Self-hosted at build by next/font.
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  applicationName: config.name,
};

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#121c33" />
      <rect x="5" y="11" width="13" height="10" rx="1.5" fill="#1e48d6" />
      <rect x="16" y="11" width="11" height="10" rx="1.5" fill="#ffc93c" />
      <rect x="15.25" y="7" width="1.5" height="18" rx="0.75" fill="#ffffff" />
    </svg>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={config.language} className={archivo.variable}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-card focus:px-3 focus:py-2">
          Skip to content
        </a>
        <header className="border-b-2 border-ink bg-paper">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3.5">
            <Link href="/" className="flex items-center gap-2.5" aria-label={`${config.name} home`}>
              <Mark />
              <span className="display text-[1.9rem] tracking-tight">{config.name}</span>
            </Link>
            <nav aria-label="Main">
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[0.95rem] font-semibold">
                {NAV.map((n) => (
                  <li key={n.path}>
                    <Link href={n.path} className="decoration-2 hover:underline">
                      {n.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
          {children}
        </main>
        <footer className="mt-12 bg-ink text-[#d9dfeb]">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-[1.4fr_1fr]">
            <div className="space-y-3">
              <p className="display text-2xl text-white">21+ only. Nothing here is certain.</p>
              <p>
                D1 Picks publishes model probabilities for college sports. It is not a sportsbook and accepts no wagers. Sports
                betting is legal only in some states; check your state&apos;s law. If gambling is causing you or someone you know
                trouble, call or text{' '}
                <a href="tel:18006973738" className="font-semibold text-white underline">
                  1-800-MY-RESET
                </a>{' '}
                (1-800-697-3738), the National Problem Gambling Helpline.
              </p>
              <p className="text-[#aab4c8]">
                Results and schedules from the{' '}
                <a href="https://www.ncaa.com/scoreboard/volleyball-women/d1" rel="noopener" target="_blank" className="underline">
                  NCAA.com scoreboard
                </a>
                . D1 Picks is not affiliated with the NCAA, any conference, school or sportsbook.
              </p>
            </div>
            <nav aria-label="Footer">
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2 font-semibold text-white">
                {FOOTER.map((n) => (
                  <li key={n.path}>
                    <Link href={n.path} className="hover:underline">
                      {n.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </footer>
        <JsonLd data={[organization(), website()]} />
        <Analytics />
      </body>
    </html>
  );
}
