// site-kit v0.1.0
/**
 * Sitemap entries from the page registry: released, indexable pages only,
 * absolute canonical URLs, real lastModified dates (updatedDate, else
 * publishDate, else the scheduled release date;
 * never "now", which teaches Google to ignore lastmod) and image
 * entries pointing at ORIGINAL image paths.
 */
import type { MetadataRoute } from 'next';
import { absoluteUrl } from '../config';
import { createLinkIndex, type PageEntry, type PageType } from '../links';
import { releaseDateFor } from '../release';

export function buildSitemap(pages: PageEntry[], types?: PageType[]): MetadataRoute.Sitemap {
  const index = createLinkIndex(pages);
  return index.pages
    .filter((p) => p.indexable !== false && (!types || types.includes(p.type)))
    .map((p) => {
      const lastModified = p.updatedDate ?? p.publishDate ?? releaseDateFor(p.path);
      return {
        url: absoluteUrl(p.path),
        ...(lastModified ? { lastModified } : {}),
        ...(p.images?.length ? { images: p.images.map((i) => absoluteUrl(i)) } : {}),
      };
    });
}
