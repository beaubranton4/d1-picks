import Link from 'next/link';
import { NAV } from '@/site/pages';

export default function NotFound() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-3">That page does not exist, or it is not published yet. These sections are a good place to start:</p>
      <ul className="mt-4 list-disc space-y-1 pl-6">
        <li>
          <Link href="/" className="underline">
            Home
          </Link>
        </li>
        {NAV.map((n) => (
          <li key={n.path}>
            <Link href={n.path} className="underline">
              {n.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
