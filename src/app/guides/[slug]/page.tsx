import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { Faq } from '@/kit/components/Faq';
import { RelatedLinks } from '@/kit/components/RelatedLinks';
import { getAuthor } from '@/kit/config';
import { getCollection, getEntry } from '@/kit/content';
import { Mdx } from '@/kit/mdx';
import { assertReleased } from '@/kit/release';
import { JsonLd, article } from '@/kit/seo/jsonld';
import { buildMetadata } from '@/kit/seo/metadata';
import { linkIndex } from '@/site/pages';
import { ModelSnapshot } from '@/site/snapshot';

// Hourly ISR: a future-dated guide is prebuilt as a 404 and flips to 200
// within the hour after its publishDate, with no deploy.
export const revalidate = 3600;
export const dynamicParams = false;

/** Every guide, released or not; assertReleased() decides 200 vs 404. */
export function generateStaticParams() {
  return getCollection('guides').map((e) => ({ slug: e.slug }));
}

function load(slug: string) {
  const entry = getEntry('guides', slug);
  if (!entry) notFound();
  assertReleased(entry.path);
  return entry;
}

export async function generateMetadata({ params }: PageProps<'/guides/[slug]'>) {
  const e = load((await params).slug);
  return buildMetadata({
    path: e.path,
    title: e.title,
    description: e.description,
    type: 'article',
    publishedTime: e.publishDate,
    modifiedTime: e.updatedDate,
  });
}

// Guides are explainers drafted by the growth loop from NCAA pages and gated by
// script (docs/growth/strategy.md). They never carry a prediction or a bet call.
export default async function GuidePage({ params }: PageProps<'/guides/[slug]'>) {
  const e = load((await params).slug);
  const index = linkIndex();
  const author = getAuthor(e.author);

  return (
    <article className="prose">
      <Breadcrumbs items={index.breadcrumbs(e.path)} />
      <h1 className="display text-5xl sm:text-6xl">{e.title}</h1>
      <p className="text-sm text-muted">
        By <Link href="/about">{author.name}</Link> · Published <time dateTime={e.publishDate}>{e.publishDate}</time>
        {e.updatedDate ? (
          <>
            {' '}
            · Updated <time dateTime={e.updatedDate}>{e.updatedDate}</time>
          </>
        ) : null}
        {' '}
        · Drafted by an automated process from NCAA pages and checked by script. See the{' '}
        <Link href="/editorial-policy">editorial policy</Link>.
      </p>
      <Mdx source={e.body} />
      <Faq items={e.faq} />
      <ModelSnapshot />
      <RelatedLinks links={index.related(e.path)} title="Keep reading" />
      <JsonLd
        data={article({
          path: e.path,
          title: e.title,
          description: e.description,
          datePublished: e.publishDate,
          dateModified: e.updatedDate,
          author: e.author,
        })}
      />
    </article>
  );
}
