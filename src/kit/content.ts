// site-kit v0.1.0
/**
 * MDX collections declared in site.config.json `collections`.
 *
 * Reads frontmatter with gray-matter and validates it, so a bad file fails the
 * build with its filename instead of rendering a broken page. Returns ALL
 * entries, released or not: release filtering is release.ts's job
 * (releasedOnly / assertReleased), so callers always say what they mean.
 *
 * Server only. Cached per process in production; re-read on every call in
 * dev so edits show up without a restart.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { config, getAuthor, normalizePath } from './config';

export type FaqItem = { question: string; answer: string };

export type Entry = {
  collection: string;
  slug: string;
  /** URL path, e.g. /guides/how-to-get-a-library-card */
  path: string;
  title: string;
  description: string;
  /** YYYY-MM-DD. The release gate and the Article datePublished. */
  publishDate: string;
  /** YYYY-MM-DD. Only set when the page was materially updated; drives dateModified. */
  updatedDate?: string;
  author: string;
  image?: string;
  imageAlt?: string;
  tags: string[];
  related: string[];
  faq: FaqItem[];
  /** True when the body uses <AffiliateLink>; the page renders a Disclosure. */
  hasAffiliateLinks: boolean;
  body: string;
  file: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** gray-matter turns unquoted YAML dates into Date objects; normalize both forms. */
function asDate(v: unknown): string | undefined {
  if (v == null || v === '') return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function parseFile(collection: string, basePath: string, file: string): Entry {
  const rel = path.relative(process.cwd(), file);
  const bad = (msg: string): never => {
    throw new Error(`[site-kit] ${rel}: ${msg}`);
  };
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  const slug = path.basename(file).replace(/\.mdx?$/, '');

  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  const publishDate = asDate(data.publishDate);
  const updatedDate = asDate(data.updatedDate);
  if (!title) bad('frontmatter "title" is required');
  if (!description) bad('frontmatter "description" is required');
  if (!publishDate || !DATE_RE.test(publishDate)) bad('frontmatter "publishDate" must be YYYY-MM-DD');
  if (updatedDate && !DATE_RE.test(updatedDate)) bad('frontmatter "updatedDate" must be YYYY-MM-DD');
  if (updatedDate && publishDate && updatedDate < publishDate) bad('"updatedDate" is before "publishDate"');
  if (typeof data.author !== 'string') bad('frontmatter "author" (an author slug) is required');
  getAuthor(data.author); // throws on an unknown author
  if (data.image && !data.imageAlt) bad('"image" needs "imageAlt" describing what the image actually shows');

  const faq: FaqItem[] = Array.isArray(data.faq) ? data.faq : [];
  for (const f of faq) {
    if (!f?.question || !f?.answer) bad('every faq item needs "question" and "answer"');
  }

  return {
    collection,
    slug,
    path: normalizePath(`${basePath}/${slug}`),
    title,
    description,
    publishDate: publishDate!,
    updatedDate,
    author: data.author,
    image: data.image || undefined,
    imageAlt: data.imageAlt || undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    related: Array.isArray(data.related) ? data.related.map((p: string) => normalizePath(String(p))) : [],
    faq,
    hasAffiliateLinks: /<AffiliateLink\b/.test(content),
    body: content,
    file: rel,
  };
}

let cache: Map<string, Entry[]> | null = null;

function loadAll(): Map<string, Entry[]> {
  if (cache && process.env.NODE_ENV === 'production') return cache;
  const out = new Map<string, Entry[]>();
  for (const [name, c] of Object.entries(config.collections)) {
    // Collections must live under content/. Scoping the path statically keeps
    // the server bundle tracing content/ only, not the whole repo.
    if (!/^content\//.test(c.dir)) throw new Error(`[site-kit] collection "${name}": dir must be under content/ (got "${c.dir}")`);
    const dir = path.join(process.cwd(), 'content', c.dir.slice('content/'.length));
    const files = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => /\.mdx?$/.test(f)).map((f) => path.join(dir, f))
      : [];
    const entries = files
      .map((f) => parseFile(name, c.basePath, f))
      .sort((a, b) => b.publishDate.localeCompare(a.publishDate) || a.slug.localeCompare(b.slug));
    out.set(name, entries);
  }
  cache = out;
  return out;
}

/** Every entry in a collection, newest first, INCLUDING unreleased ones. */
export function getCollection(name: string): Entry[] {
  const entries = loadAll().get(name);
  if (!entries) throw new Error(`[site-kit] unknown collection "${name}"; declare it in site.config.json`);
  return entries;
}

export function getEntry(collection: string, slug: string): Entry | undefined {
  return getCollection(collection).find((e) => e.slug === slug);
}

export function getEntryByPath(p: string): Entry | undefined {
  const target = normalizePath(p);
  for (const entries of loadAll().values()) {
    const hit = entries.find((e) => e.path === target);
    if (hit) return hit;
  }
  return undefined;
}

export function publishDateForPath(p: string): string | undefined {
  return getEntryByPath(p)?.publishDate;
}
