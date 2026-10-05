// site-kit v0.1.0
import type { ReactNode } from 'react';
import { affiliateHref, getAffiliate } from '../affiliates';

/**
 * Registry-backed affiliate link. Always rel="sponsored nofollow noopener" and
 * a new tab. Pages that use one must render <Disclosure /> above it (MDX pages
 * do this automatically via Entry.hasAffiliateLinks).
 */
export function AffiliateLink({ id, children }: { id: string; children?: ReactNode }) {
  const a = getAffiliate(id);
  return (
    <a href={affiliateHref(id)} rel="sponsored nofollow noopener" target="_blank" className="underline">
      {children ?? a.label}
    </a>
  );
}
