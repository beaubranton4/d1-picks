// site-kit v0.1.0
/**
 * Affiliate registry lookup (data/affiliates.json). Content refers to links by
 * id; the URL and the network tag are applied here, in one place. An unknown
 * id throws at build, so a typo never ships as a dead or untagged link.
 */
import registry from '../../data/affiliates.json';
import { config } from './config';
import { isProduction } from './env';

export type Affiliate = { url: string; network: string; label: string };

const entries = registry as unknown as Record<string, Affiliate | string>;
const warned = new Set<string>();

export function getAffiliate(id: string): Affiliate {
  const a = entries[id];
  if (!a || typeof a === 'string') {
    throw new Error(`[site-kit] unknown affiliate id "${id}"; add it to data/affiliates.json`);
  }
  return a;
}

/** The registry URL with this site's tag for the network applied (Amazon: ?tag=). */
export function affiliateHref(id: string): string {
  const a = getAffiliate(id);
  const tag = config.affiliateTags[a.network];
  if (!tag) {
    if (a.network in config.affiliateTags && isProduction() && !warned.has(a.network)) {
      warned.add(a.network);
      console.warn(`[site-kit] affiliate network "${a.network}" has no tag in site.config.json affiliateTags; "${id}" ships UNTAGGED (no commission).`);
    }
    return a.url;
  }
  const url = new URL(a.url);
  if (a.network === 'amazon') url.searchParams.set('tag', tag);
  return url.toString();
}
