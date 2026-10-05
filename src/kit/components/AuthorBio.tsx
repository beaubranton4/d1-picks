// site-kit v0.1.0
import Image from 'next/image';
import Link from 'next/link';
import { authorPath, getAuthor } from '../config';

/** Real-author box for EEAT: name, credentials, bio, link to the profile page. */
export function AuthorBio({ slug }: { slug: string }) {
  const a = getAuthor(slug);
  return (
    <aside aria-label="About the author" className="mt-10 flex gap-4 rounded-lg border border-slate-200 p-5">
      {a.photo ? (
        <Image src={a.photo} alt={`Photo of ${a.name}`} width={72} height={72} className="h-18 w-18 rounded-full object-cover" />
      ) : null}
      <div>
        <p className="font-semibold">
          Written by <Link href={authorPath(a.slug)} className="underline">{a.name}</Link>
        </p>
        {a.credentials.length ? <p className="text-sm text-slate-600">{a.credentials.join(' · ')}</p> : null}
        <p className="mt-2 text-sm">{a.bio}</p>
      </div>
    </aside>
  );
}
