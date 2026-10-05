// site-kit v0.1.0
import Link from 'next/link';

/** FTC-style affiliate disclosure. Render it before the first affiliate link. */
export function Disclosure() {
  return (
    <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      Some links on this page are affiliate links. If you buy through them we may earn a commission, at no extra cost
      to you. It never changes what we recommend. See our <Link href="/editorial-policy" className="underline">editorial policy</Link>.
    </p>
  );
}
