// site-kit v0.1.0
import Link from 'next/link';
import { JsonLd, breadcrumbList } from '../seo/jsonld';

/** Visible breadcrumb trail plus the matching BreadcrumbList JSON-LD. */
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  if (items.length < 2) return null;
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <ol className="flex flex-wrap gap-1">
          {items.map((it, i) => {
            const last = i === items.length - 1;
            return (
              <li key={it.path} className="flex items-center gap-1">
                {last ? (
                  <span aria-current="page">{it.name}</span>
                ) : (
                  <>
                    <Link href={it.path} className="underline-offset-2 hover:underline">
                      {it.name}
                    </Link>
                    <span aria-hidden="true">/</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd data={breadcrumbList(items)} />
    </>
  );
}
