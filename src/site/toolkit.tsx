/**
 * Shared pieces for the data and tool pages (RPI, tournament, simulator,
 * conferences, matchup calculator). Server components only.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { config, absoluteUrl } from '@/kit/config';
import { JsonLd } from '@/kit/seo/jsonld';
import { etStamp } from './format';
import { linkIndex } from './pages';
import { ratings } from './data';

export const EDITORIAL = config.authors[0];

/** Who made the page and how fresh it is. Automated pages say so. */
export function Byline({ note }: { note?: string }) {
  const s = ratings();
  return (
    <p className="mt-2 text-sm text-muted">
      By <Link href="/about" className="underline">{EDITORIAL.name}</Link>. Built automatically from our saved model output and NCAA.com results; ratings
      updated {etStamp(s.generated_at)}.{note ? ` ${note}` : ''}
    </p>
  );
}

export function DownloadLink({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <a href={href} download className="inline-block border-2 border-ink bg-card px-4 py-2.5 text-sm font-semibold hover:bg-ball-soft">
      {label}
      <span className="block text-xs font-normal text-muted">{detail}</span>
    </a>
  );
}

export function Assumptions({ items, title = 'What we assumed' }: { items: ReactNode[]; title?: string }) {
  return (
    <section aria-labelledby="assumptions" className="mt-10 max-w-3xl">
      <h2 id="assumptions" className="display text-3xl">{title}</h2>
      <ul className="prose mt-3 !max-w-none">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </section>
  );
}

export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 max-w-3xl text-sm text-muted">{children}</p>;
}

/** Schema.org Dataset for a page whose main asset is a downloadable table. */
export function DatasetLd({ path, name, description, csvPath, dateModified }: { path: string; name: string; description: string; csvPath: string; dateModified: string }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name,
        description,
        url: absoluteUrl(path),
        inLanguage: 'en',
        isAccessibleForFree: true,
        dateModified: dateModified.slice(0, 10),
        creator: { '@type': 'Organization', name: config.name, url: absoluteUrl('/') },
        isBasedOn: ratings().source.page,
        distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: absoluteUrl(csvPath) }],
      }}
    />
  );
}

export function ToolLd({ path, name, description }: { path: string; name: string; description: string }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name,
        description,
        url: absoluteUrl(path),
        applicationCategory: 'SportsApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript for the interactive controls; the default results render without it.',
        isAccessibleForFree: true,
        publisher: { '@type': 'Organization', name: config.name, url: absoluteUrl('/') },
      }}
    />
  );
}

/** Links to the other data pages, through the link index so unreleased ones drop out. */
export function MoreData({ current }: { current: string }) {
  const paths = [
    '/volleyball/ratings',
    '/volleyball/rpi',
    '/volleyball/ncaa-tournament-predictions',
    '/volleyball/bracket-simulator',
    '/volleyball/conference-standings',
    '/volleyball/matchup-calculator',
    '/results',
  ].filter((p) => p !== current);
  const pages = linkIndex().keepExisting(paths);
  if (!pages.length) return null;
  return (
    <section aria-labelledby="more-data" className="mt-12 border-t-2 border-ink pt-6">
      <h2 id="more-data" className="display text-3xl">More from our data</h2>
      <ul className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {pages.map((p) => (
          <li key={p.path}>
            <Link href={p.path} className="font-semibold underline">{p.label ?? p.title}</Link>
            {p.description ? <p className="text-sm text-muted">{p.description}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
