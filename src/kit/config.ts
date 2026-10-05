// site-kit v0.1.0
/**
 * Typed loader for site.config.json, the one place site identity lives.
 * Validated at import, so a malformed config fails the build, not a page.
 */
import raw from '../../site.config.json';

export type Author = {
  slug: string;
  name: string;
  bio: string;
  credentials: string[];
  photo?: string;
  sameAs: string[];
};

export type Collection = {
  /** Directory holding the .mdx files, relative to the repo root. */
  dir: string;
  /** URL prefix; an entry's path is `${basePath}/${slug}`. */
  basePath: string;
  label: string;
};

export type SiteConfig = {
  domain: string;
  /** Bare host (no scheme, no slash). House rule: the apex domain. */
  canonicalHost: string;
  name: string;
  tagline: string;
  description: string;
  locale: string;
  language: string;
  contactEmail: string;
  gscProperty: string;
  ga4MeasurementId: string;
  ga4PropertyId: string;
  brandRegex: string;
  organization: { logo: string; sameAs: string[] };
  authors: Author[];
  affiliateTags: Record<string, string>;
  releaseCadence: { maxEditorialPerWeek: number; exemptPaths: string[] };
  collections: Record<string, Collection>;
  verifiedData: string[];
  contentRules: { bannedPhrases: string[] };
  competitors: string[];
};

function fail(msg: string): never {
  throw new Error(`[site-kit] site.config.json: ${msg}`);
}

function validate(c: SiteConfig): SiteConfig {
  for (const k of ['domain', 'canonicalHost', 'name', 'tagline', 'description', 'locale', 'language'] as const) {
    if (typeof c[k] !== 'string' || !c[k].trim()) fail(`"${k}" is required`);
  }
  if (!/^[a-z0-9.-]+$/i.test(c.canonicalHost)) {
    fail(`"canonicalHost" must be a bare host like "example.com" (got "${c.canonicalHost}")`);
  }
  if (!Array.isArray(c.authors) || c.authors.length === 0) fail('"authors" needs at least one real author');
  for (const a of c.authors) {
    if (!a.slug || !a.name || !a.bio) fail(`author "${a.slug ?? '?'}" needs slug, name and bio`);
  }
  for (const a of c.authors) {
    a.credentials = Array.isArray(a.credentials) ? a.credentials : [];
    a.sameAs = Array.isArray(a.sameAs) ? a.sameAs : [];
  }
  c.organization = { logo: c.organization?.logo ?? '/logo.png', sameAs: c.organization?.sameAs ?? [] };
  c.affiliateTags ??= {};
  if (!c.collections || typeof c.collections !== 'object') fail('"collections" is required (use {} for none)');
  // An empty regex matches every query, which would count all traffic as brand.
  if (typeof c.brandRegex !== 'string' || !c.brandRegex.trim()) fail('"brandRegex" is required (e.g. "acme\\s*widgets")');
  try {
    new RegExp(c.brandRegex, 'i');
  } catch {
    fail(`"brandRegex" is not a valid regex`);
  }
  return c;
}

export const config: SiteConfig = validate(raw as unknown as SiteConfig);

export const siteOrigin = `https://${config.canonicalHost}`;

/** Normalize a site path: leading slash, no trailing slash (except root), no query/hash. */
export function normalizePath(p: string): string {
  let out = p.split('#')[0].split('?')[0].trim();
  if (!out.startsWith('/')) out = '/' + out;
  if (out.length > 1) out = out.replace(/\/+$/, '');
  return out;
}

/** Absolute URL on the canonical host. Absolute inputs pass through untouched. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const p = normalizePath(pathOrUrl);
  return p === '/' ? siteOrigin : siteOrigin + p;
}

export function getAuthor(slug: string): Author {
  const a = config.authors.find((x) => x.slug === slug);
  if (!a) throw new Error(`[site-kit] unknown author "${slug}"; add it to site.config.json authors[]`);
  return a;
}

export function authorPath(slug: string): string {
  return `/authors/${slug}`;
}

export const brandPattern = new RegExp(config.brandRegex, 'i');
