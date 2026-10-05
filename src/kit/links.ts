// site-kit v0.1.0
/**
 * Internal-link index over the site's page registry (src/site/pages.ts).
 *
 * Front-matter `related` lists and hand-written cross-links are partly
 * aspirational: they name pages that were planned, renamed, or are not
 * released yet. Rendering them ships dead links (or leaks an unreleased URL).
 * Every link a page renders goes through this index, which only knows pages
 * that exist AND are released, so a missing target is dropped instead.
 *
 * The same index drives breadcrumbs, hub listings, related links, the sitemap
 * and llms.txt, and findOrphans() reports released pages nothing links to.
 */
import { normalizePath } from './config';
import { releasedOnly } from './release';

export type PageType =
  | 'home'
  | 'hub'
  | 'article'
  | 'directory'
  | 'tool'
  | 'author'
  | 'about'
  | 'policy'
  | 'other';

export type PageEntry = {
  path: string;
  title: string;
  description?: string;
  type: PageType;
  /** Parent page path. Hubs list their children; children breadcrumb to it. */
  parent?: string;
  /** Short label for breadcrumbs and nav, defaults to title. */
  label?: string;
  tags?: string[];
  /** Explicit related paths; unknown or unreleased targets are dropped. */
  related?: string[];
  publishDate?: string;
  updatedDate?: string;
  /** Absolute or root-relative ORIGINAL image paths (sitemap image entries). */
  images?: string[];
  /** false keeps a page out of the sitemap and llms.txt (it still renders). */
  indexable?: boolean;
};

export type LinkIndex = ReturnType<typeof createLinkIndex>;

export function createLinkIndex(
  pages: PageEntry[],
  opts: { filter?: (pages: PageEntry[]) => PageEntry[] } = {},
) {
  const filter = opts.filter ?? releasedOnly;
  const byPath = new Map<string, PageEntry>();
  for (const p of filter(pages)) {
    const path = normalizePath(p.path);
    if (byPath.has(path)) throw new Error(`[site-kit] duplicate page path in registry: ${path}`);
    byPath.set(path, { ...p, path, parent: p.parent ? normalizePath(p.parent) : undefined });
  }
  const all = [...byPath.values()];

  const get = (path: string) => byPath.get(normalizePath(path));
  const has = (path: string) => byPath.has(normalizePath(path));

  /** Children of a hub, in registry order. */
  const children = (path: string) => all.filter((p) => p.parent === normalizePath(path));

  /** Drop paths that do not exist or are not released. Preserves order, dedupes. */
  function keepExisting(paths: string[] | undefined): PageEntry[] {
    const seen = new Set<string>();
    const out: PageEntry[] = [];
    for (const raw of paths ?? []) {
      const page = get(raw);
      if (page && !seen.has(page.path)) {
        seen.add(page.path);
        out.push(page);
      }
    }
    return out;
  }

  /** Home -> ... -> page, following `parent`. */
  function breadcrumbs(path: string): { name: string; path: string }[] {
    const trail: { name: string; path: string }[] = [];
    const seen = new Set<string>();
    let cur = get(path);
    while (cur && !seen.has(cur.path)) {
      seen.add(cur.path);
      trail.unshift({ name: cur.label ?? cur.title, path: cur.path });
      cur = cur.parent ? get(cur.parent) : undefined;
    }
    return trail;
  }

  /**
   * Related pages: explicit `related` first, then siblings sharing a tag, then
   * other siblings, then same-type pages elsewhere. Never the page itself or
   * its parent (the breadcrumb already links the parent).
   */
  function related(path: string, limit = 4): PageEntry[] {
    const self = get(path);
    if (!self) return [];
    const out = new Map<string, PageEntry>();
    const add = (p: PageEntry) => {
      if (out.size < limit && p.path !== self.path && p.path !== self.parent && p.type !== 'home') {
        out.set(p.path, p);
      }
    };
    keepExisting(self.related).forEach(add);
    const tags = new Set(self.tags ?? []);
    const siblings = all.filter((p) => p.parent === self.parent && p.type === self.type);
    siblings.filter((p) => (p.tags ?? []).some((t) => tags.has(t))).forEach(add);
    siblings.forEach(add);
    all.filter((p) => p.type === self.type).forEach(add);
    return [...out.values()];
  }

  return { pages: all, get, has, children, keepExisting, breadcrumbs, related };
}

/**
 * Released pages with no inbound link from another page, given the link edges
 * the templates render: parent -> child (hub listings), child -> parent
 * (breadcrumbs), page -> related (for `relatedTypes`), and every page -> each
 * nav path.
 * The home page is the root and never an orphan. Use it in a unit test so a
 * page that nothing links to fails CI; scripts/kit/audit-site.mjs checks the
 * same thing against the real rendered HTML.
 */
export function findOrphans(
  index: LinkIndex,
  opts: {
    navPaths?: string[];
    relatedLimit?: number;
    /** Page types whose template renders <RelatedLinks links={index.related(path)}>. */
    relatedTypes?: PageType[];
  } = {},
): PageEntry[] {
  const relatedTypes = new Set(opts.relatedTypes ?? ['article']);
  const inbound = new Map<string, Set<string>>();
  const link = (from: string, to: string) => {
    if (from === to) return;
    if (!inbound.has(to)) inbound.set(to, new Set());
    inbound.get(to)!.add(from);
  };
  const nav = (opts.navPaths ?? []).map(normalizePath);
  for (const page of index.pages) {
    if (page.parent && index.has(page.parent)) {
      link(page.parent, page.path);
      link(page.path, page.parent);
    }
    if (relatedTypes.has(page.type)) for (const r of index.related(page.path, opts.relatedLimit ?? 4)) link(page.path, r.path);
    for (const n of nav) if (index.has(n)) link(page.path, n);
  }
  return index.pages.filter((p) => p.type !== 'home' && p.path !== '/' && !(inbound.get(p.path)?.size));
}
