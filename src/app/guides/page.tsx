import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { JsonLd, itemList } from '@/kit/seo/jsonld';
import { buildMetadata } from '@/kit/seo/metadata';
import { GUIDES_PATH, linkIndex } from '@/site/pages';

// The hub exists only once a guide has been released (see getAllPages), so an
// empty /guides is a 404 and out of the sitemap rather than a thin page. It is
// separate from every model-driven route (/volleyball/*, /results).
export const revalidate = 3600;

export function generateMetadata() {
  const hub = linkIndex().get(GUIDES_PATH);
  if (!hub) notFound();
  return buildMetadata({ path: GUIDES_PATH, title: hub.title, description: hub.description! });
}

export default function GuidesHub() {
  const index = linkIndex();
  const hub = index.get(GUIDES_PATH);
  if (!hub) notFound();
  const guides = index.children(GUIDES_PATH);
  return (
    <div className="prose">
      <Breadcrumbs items={index.breadcrumbs(GUIDES_PATH)} />
      <h1 className="display text-5xl sm:text-6xl">{hub.title}</h1>
      <p className="text-lg">{hub.description}</p>
      <ul className="not-prose mt-6 space-y-5">
        {guides.map((g) => (
          <li key={g.path}>
            <Link href={g.path} className="text-lg font-semibold underline">
              {g.title}
            </Link>
            <p>{g.description}</p>
            {g.publishDate ? <p className="text-sm text-muted">Published {g.publishDate}</p> : null}
          </li>
        ))}
      </ul>
      <JsonLd data={itemList(guides.map((g) => ({ name: g.title, path: g.path })), hub.title)} />
    </div>
  );
}
