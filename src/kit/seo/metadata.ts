// site-kit v0.1.0
/**
 * buildMetadata: the only way pages should produce <head> SEO tags.
 *
 * - Self-referencing ABSOLUTE canonical on the canonical host, always.
 * - OpenGraph + Twitter mirror the title/description/image.
 * - robots comes from the environment and release state: preview/dev builds
 *   are noindex,nofollow; an unreleased page is noindex (it 404s anyway).
 * - Throws during the build when the title is missing or the description is
 *   missing or outside 70-160 characters, so a thin <head> never ships.
 */
import type { Metadata } from 'next';
import { absoluteUrl, authorPath, brandPattern, config, normalizePath } from '../config';
import { isProduction } from '../env';
import { isReleased } from '../release';

export const DESCRIPTION_MIN = 70;
export const DESCRIPTION_MAX = 160;
export const DEFAULT_OG_IMAGE = { url: '/og-default.png', width: 1200, height: 630, alt: config.name };

export type MetadataInput = {
  path: string;
  title: string;
  description: string;
  /** Root-relative or absolute. Defaults to /og-default.png. */
  image?: string | { url: string; width?: number; height?: number; alt?: string };
  type?: 'website' | 'article' | 'profile';
  /** article only: YYYY-MM-DD */
  publishedTime?: string;
  /** article only: set ONLY for a real material update */
  modifiedTime?: string;
  /** author slugs */
  authors?: string[];
  /** Append " | Site Name" unless the title already names the brand. Default true. */
  brand?: boolean;
  /** Force noindex (e.g. a utility page). Release state and env still apply. */
  noindex?: boolean;
};

export function validateSeo(path: string, title: string, description: string): void {
  const where = `[site-kit] ${path}`;
  if (!title?.trim()) throw new Error(`${where}: title is required`);
  const len = description?.trim().length ?? 0;
  if (!len) throw new Error(`${where}: meta description is required`);
  if (len < DESCRIPTION_MIN || len > DESCRIPTION_MAX) {
    throw new Error(
      `${where}: meta description is ${len} chars; keep it ${DESCRIPTION_MIN}-${DESCRIPTION_MAX} ("${description}")`,
    );
  }
}

export function fullTitle(title: string, brand = true): string {
  if (!brand || brandPattern.test(title)) return title;
  return `${title} | ${config.name}`;
}

export function buildMetadata(input: MetadataInput): Metadata {
  const path = normalizePath(input.path);
  validateSeo(path, input.title, input.description);
  const url = absoluteUrl(path);
  const title = fullTitle(input.title, input.brand ?? true);
  const description = input.description.trim();

  const img =
    typeof input.image === 'string'
      ? { url: input.image, alt: input.title }
      : (input.image ?? DEFAULT_OG_IMAGE);
  const ogImage = { ...img, url: absoluteUrl(img.url) };

  const indexable = isProduction() && isReleased(path) && !input.noindex;
  const robots: Metadata['robots'] = indexable
    ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } }
    : { index: false, follow: isProduction() };

  const type = input.type ?? 'website';
  const openGraph: Metadata['openGraph'] =
    type === 'article'
      ? {
          type: 'article',
          url,
          title,
          description,
          siteName: config.name,
          locale: config.locale,
          images: [ogImage],
          publishedTime: input.publishedTime,
          ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
          authors: (input.authors ?? []).map((s) => absoluteUrl(authorPath(s))),
        }
      : { type: type === 'profile' ? 'profile' : 'website', url, title, description, siteName: config.name, locale: config.locale, images: [ogImage] };

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots,
    openGraph,
    twitter: { card: 'summary_large_image', title, description, images: [ogImage.url] },
  };
}
