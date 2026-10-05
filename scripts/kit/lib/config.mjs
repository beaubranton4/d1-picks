// site-kit v0.1.0
/**
 * site.config.json and data/seo-taxonomy.json for scripts. Read from the
 * current working directory (run scripts from the site's repo root).
 */
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = process.cwd();

function readJson(rel, { required = true } = {}) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    if (!required) return null;
    console.error(`[site-kit] ${rel} not found. Run this from the site's repo root.`);
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function loadConfig() {
  return readJson('site.config.json');
}

export const siteOrigin = (cfg) => `https://${cfg.canonicalHost}`;

/** Exit 2 with a clear message when a config field a script needs is empty. */
export function requireField(cfg, key, hint) {
  if (!cfg[key] || !String(cfg[key]).trim()) {
    console.error(`[site-kit] site.config.json "${key}" is empty${hint ? ` (${hint})` : ''}`);
    process.exit(2);
  }
  return cfg[key];
}

/** Path part of a URL on the site, without trailing slash. */
export function shortPath(url, cfg) {
  const p = url.replace(/^https?:\/\/[^/]+/, '').split('#')[0].split('?')[0];
  return p.length > 1 ? p.replace(/\/+$/, '') : '/';
}

/** data/seo-taxonomy.json with compiled regexes; sane defaults when absent. */
export function loadTaxonomy() {
  const t = readJson('data/seo-taxonomy.json', { required: false }) ?? {};
  const re = (s) => new RegExp(s, 'i');
  return {
    sections: (t.sections ?? []).map((s) => ({ name: s.name, re: re(s.pattern) })),
    genericPaths: (t.genericPaths ?? ['^/$']).map(re),
    excludePaths: (t.excludePaths ?? []).map(re),
    intentTiers: (t.intentTiers ?? []).map((x) => ({ tier: x.tier, label: x.label, patterns: x.patterns.map(re) })),
    defaultTier: t.defaultTier ?? 'T3',
    builtThings: (t.builtThings ?? []).map((b) => ({ ...b, re: re(b.pattern) })),
    stopwords: t.stopwords ?? [],
  };
}

/** First matching section name, else "other". */
export function sectionOf(p, taxonomy) {
  return taxonomy.sections.find((s) => s.re.test(p))?.name ?? 'other';
}

/** Intent tier for a query: first tier whose pattern matches, else the default. */
export function classifyIntent(query, taxonomy) {
  const q = query.toLowerCase();
  for (const t of taxonomy.intentTiers) if (t.patterns.some((r) => r.test(q))) return t.tier;
  return taxonomy.defaultTier;
}
