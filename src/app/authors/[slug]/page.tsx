import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { authorPath, config } from '@/kit/config';
import { getCollection } from '@/kit/content';
import { releasedOnly } from '@/kit/release';
import { JsonLd, profilePage } from '@/kit/seo/jsonld';
import { buildMetadata } from '@/kit/seo/metadata';
import { linkIndex } from '@/site/pages';

export const revalidate = 3600;

const GENERATED = new Set(['volleyballGames']);
export const dynamicParams = false;

export function generateStaticParams() {
  return config.authors.map((a) => ({ slug: a.slug }));
}

function load(slug: string) {
  const a = config.authors.find((x) => x.slug === slug);
  if (!a) notFound();
  return a;
}

export async function generateMetadata({ params }: PageProps<'/authors/[slug]'>) {
  const a = load((await params).slug);
  const description = a.bio.length > 160 ? a.bio.slice(0, 157).replace(/\s+\S*$/, '') + '...' : a.bio;
  return buildMetadata({ path: authorPath(a.slug), title: a.name, description, type: 'profile' });
}

export default async function AuthorPage({ params }: PageProps<'/authors/[slug]'>) {
  const a = load((await params).slug);
  const path = authorPath(a.slug);
  const writing = Object.keys(config.collections)
    .flatMap((c) => releasedOnly(getCollection(c)))
    // Model-generated match previews name the maintainer as author but are not his writing.
    .filter((e) => e.author === a.slug && !GENERATED.has(e.collection));

  return (
    <div>
      <Breadcrumbs items={linkIndex().breadcrumbs(path)} />
      <div className="mt-4 flex items-center gap-4">
        {a.photo ? <Image src={a.photo} alt={`Photo of ${a.name}`} width={96} height={96} className="rounded-full" /> : null}
        <h1 className="text-3xl font-bold">{a.name}</h1>
      </div>
      <p className="mt-4">{a.bio}</p>
      {a.credentials.length ? (
        <ul className="mt-4 list-disc pl-6">
          {a.credentials.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-4">
        At D1 Picks, {a.name} built the rating model, the daily pipeline that logs and grades every prediction, and this site. The{' '}
        <Link href="/methodology" className="underline">
          methodology
        </Link>{' '}
        describes the model in full.
      </p>
      {a.sameAs.length ? (
        <p className="mt-4 text-sm">
          Elsewhere:{' '}
          {a.sameAs.map((u, i) => (
            <span key={u}>
              {i ? ', ' : ''}
              <a href={u} rel="me noopener" target="_blank" className="underline">
                {new URL(u).hostname}
              </a>
            </span>
          ))}
        </p>
      ) : null}
      {writing.length ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Writing</h2>
          <ul className="mt-3 space-y-2">
            {writing.map((e) => (
              <li key={e.path}>
                <Link href={e.path} className="underline">
                  {e.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <JsonLd data={profilePage(a.slug)} />
    </div>
  );
}
