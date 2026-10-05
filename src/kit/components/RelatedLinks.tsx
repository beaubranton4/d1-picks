// site-kit v0.1.0
import Link from 'next/link';
import type { PageEntry } from '../links';

/** Related pages, resolved through the link index (dead/unreleased targets already dropped). */
export function RelatedLinks({ links, title = 'Related' }: { links: PageEntry[]; title?: string }) {
  if (!links.length) return null;
  return (
    <section aria-labelledby="related-heading" className="mt-10">
      <h2 id="related-heading" className="text-xl font-semibold">
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.path}>
            <Link href={l.path} className="font-medium underline">
              {l.title}
            </Link>
            {l.description ? <p className="text-sm text-slate-600">{l.description}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
