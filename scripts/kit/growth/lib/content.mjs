// site-kit v0.1.0
// Inventory of existing pages, read from the site's content dir. Works for
// markdown/MDX files with gray-matter frontmatter; no site code is imported.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { abs, postPath } from './config.mjs';
import { asDate, todayIso } from './text.mjs';

const NOT_LIVE = new Set(['draft', 'archived']);

function scanDir(cfg, { dir, rel, ext, urlTemplate, defaultCategory }) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => (ext ? x.endsWith(`.${ext}`) : /\.(md|mdx)$/.test(x))).sort()) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    let data = {};
    let body = raw;
    try {
      ({ data, content: body } = matter(raw));
    } catch {
      continue;
    }
    const slug = data.slug ?? f.replace(/\.mdx?$/, '');
    const category = data.category ?? defaultCategory;
    const release = asDate(data[cfg.content.publishDateField]) ?? asDate(data.date) ?? asDate(data.publishDate);
    const live = !NOT_LIVE.has(String(data.status ?? '').toLowerCase());
    const keywords = Array.isArray(data[cfg.content.keywordsField]) ? data[cfg.content.keywordsField].map(String) : [];
    if (typeof data.target_keyword === 'string') keywords.push(data.target_keyword);
    out.push({
      file: path.join(rel, f),
      slug,
      category,
      path: postPath({ content: { urlTemplate } }, { category, slug }),
      title: String(data.title ?? slug),
      keywords,
      release,
      released: live && (!release || release <= todayIso()),
      text: body.replace(/<[^>]+>/g, ' '),
      data,
    });
  }
  return out;
}

export function scanPosts(cfg, { dir = abs(cfg.content.dir) } = {}) {
  const main = scanDir(cfg, { dir, rel: cfg.content.dir, ext: null, urlTemplate: cfg.content.urlTemplate, defaultCategory: cfg.content.defaultCategory });
  const extra = (cfg.content.extraDirs ?? []).flatMap((x) => scanDir(cfg, { dir: abs(x.dir), rel: x.dir, ext: x.ext ?? null, urlTemplate: x.urlTemplate, defaultCategory: x.category ?? null }));
  return [...main, ...extra];
}

/** Pages already queued or published by the loop itself (docs/growth/pages/*.json). */
export function loadState(cfg) {
  const f = abs(cfg.paths.dir, 'state.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { pages: {}, refreshQueue: [], paused: null, lastRun: null };
}
export function saveState(cfg, state) {
  const f = abs(cfg.paths.dir, 'state.json');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, `${JSON.stringify(state, null, 2)}\n`);
}
