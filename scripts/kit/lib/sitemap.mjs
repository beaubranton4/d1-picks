// site-kit v0.1.0
/**
 * Fetch every <loc> from a sitemap (following sitemap indexes). Sitemap URLs
 * use the canonical host; `mapToBase` rewrites them to the server being
 * audited (e.g. http://localhost:3000) so a local build can be crawled.
 */
import { decode } from './html.mjs';

export const mapToBase = (url, base) => url.replace(/^https?:\/\/[^/]+/, base.replace(/\/$/, ''));

export async function fetchSitemap(base, start = '/sitemap.xml', seen = new Set()) {
  const url = start.startsWith('http') ? mapToBase(start, base) : base.replace(/\/$/, '') + start;
  if (seen.has(url)) return { urls: [], images: [], lastmods: [] };
  seen.add(url);
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`sitemap ${url} returned ${res.status}`);
  const xml = await res.text();
  const locs = (block) => [...block.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => decode(m[1]));
  if (/<sitemapindex\b/.test(xml)) {
    const out = { urls: [], images: [], lastmods: [] };
    for (const child of locs(xml)) {
      const r = await fetchSitemap(base, child, seen);
      out.urls.push(...r.urls);
      out.images.push(...r.images);
      out.lastmods.push(...r.lastmods);
    }
    return out;
  }
  const out = { urls: [], images: [], lastmods: [] };
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const block = m[1];
    const imgs = [...block.matchAll(/<image:loc>\s*([^<]+?)\s*<\/image:loc>/g)].map((x) => decode(x[1]));
    const withoutImages = block.replace(/<image:image>[\s\S]*?<\/image:image>/g, '');
    const loc = locs(withoutImages)[0];
    if (!loc) continue;
    out.urls.push(loc);
    out.images.push(...imgs);
    const lm = withoutImages.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/);
    if (lm) out.lastmods.push({ url: loc, lastmod: lm[1] });
  }
  return out;
}
