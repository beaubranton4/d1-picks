// site-kit v0.1.0
// Inventory of existing pages, read from the site's content dir. Works for
// markdown/MDX files with gray-matter frontmatter; no site code is imported.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { abs, postPath } from './config.mjs';
import { asDate, todayIso } from './text.mjs';

export function scanPosts(cfg, { dir = abs(cfg.content.dir) } = {}) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => /\.(md|mdx)$/.test(x)).sort()) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    let data = {};
    let body = raw;
    try {
      ({ data, content: body } = matter(raw));
    } catch {
      continue;
    }
    const slug = data.slug ?? f.replace(/\.mdx?$/, '');
    const category = data.category ?? cfg.content.defaultCategory;
    const release = asDate(data[cfg.content.publishDateField]) ?? asDate(data.date) ?? asDate(data.publishDate);
    out.push({
      file: path.join(cfg.content.dir, f),
      slug,
      category,
      path: postPath(cfg, { category, slug }),
      title: String(data.title ?? slug),
      keywords: Array.isArray(data[cfg.content.keywordsField]) ? data[cfg.content.keywordsField].map(String) : [],
      release,
      released: !release || release <= todayIso(),
      text: body.replace(/<[^>]+>/g, ' '),
      data,
    });
  }
  return out;
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
