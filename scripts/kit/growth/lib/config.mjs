// site-kit v0.1.0
// growth.config.json loader with defaults and validation. Run from the repo root.
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = process.cwd();

export const DEFAULTS = {
  enabled: false,
  site: { name: '', domain: '', gscProperty: '', ga4PropertyId: '' },
  voiceGuide: 'docs/growth/voice.md',
  paths: { dir: 'docs/growth', fixtures: null },
  content: {
    dir: 'content/posts',
    ext: 'md',
    bodyFormat: 'markdown', // 'html' when the site renders post.content as raw HTML
    urlTemplate: '/{category}/{slug}',
    categories: [],
    defaultCategory: null,
    publishDateField: 'publishDate',
    dateField: null, // also set to the release date when the site sorts by it (e.g. "date")
    descriptionField: 'description',
    keywordsField: 'keywords', // 'tags' in site-kit MDX collections
    titleMustIncludeYear: false,
    author: '',
    noindexField: null,
    tools: [], // [{ path, file, keywords: [] }]
    dataAssets: [], // [{ file, keywords: [] }]
    knownPaths: ['/'],
    factPatterns: [], // regexes: queries answerable from cited policy/spec pages
    publishedLog: null, // optional dedupe log to append to
    frontmatterExtras: {}, // static or {slug} templated extra frontmatter
  },
  sources: { preferDomains: [], excludeDomains: [], extraUrls: [] },
  clusters: [], // [{ name, seeds: [], favor: bool }]
  skip: { patterns: [], reasons: {} },
  dataforseo: { locationCode: 2840, languageCode: 'en', maxKd: 35, minVolume: 50, suggestionsLimit: 100, seedsPerRun: 2, estimates: { keyword_suggestions: 0.02, serp_advanced_aio: 0.006 }, serpTopN: 4 },
  // Cheapest model first. Each rung must still pass every gate; a draft that fails on a rung escalates to the next.
  anthropic: {
    models: [
      { model: 'claude-haiku-4-5', pricePerMTok: { input: 1, output: 5 } },
      { model: 'claude-sonnet-5-5', pricePerMTok: { input: 2, output: 10 } },
    ],
    maxTokens: 12000,
    maxRepairs: 1,
  },
  caps: { monthlyUsd: { dataforseo: 3, anthropic: 2 }, weeklyPages: 3, perRunPages: 1, minLeadDays: 3 },
  release: { weekdays: [2, 4, 6], maxHorizonDays: 56 }, // 1=Mon ... 7=Sun
  gates: {
    minWords: 700,
    minInternalLinks: 2,
    minVerifiedBlocks: 3,
    minSourceDomains: 2,
    maxSimilarity: 0.3, // 5-gram containment against any existing page
    topicOverlap: { duplicate: 0.8, extend: 0.6 },
    descriptionMin: 70,
    descriptionMax: 160,
    bannedPhrases: [],
    allowFirstHand: false,
    forbidAffiliateLinks: true,
    minAioChars: 200,
  },
  measure: { checkpoints: [14, 28, 60], strikingPosition: [8, 30], minImpressionsStriking: 30, tractionImpressions: 20, pruneAfterDays: 60 },
  brakes: { minIndexedShareAt30d: 0.5, minPagesForIndexCheck: 3, impressionDropPct: 50 },
  autoMerge: true,
};

const merge = (a, b) => {
  if (Array.isArray(a) || typeof a !== 'object' || a === null) return b === undefined ? a : b;
  const out = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) out[k] = k in a && v && typeof v === 'object' && !Array.isArray(v) ? merge(a[k], v) : v;
  return out;
};

export const withDefaults = (raw) => merge(DEFAULTS, raw);

export function loadConfig(file = path.join(ROOT, 'growth.config.json')) {
  if (!fs.existsSync(file)) {
    console.error(`[growth] ${path.relative(ROOT, file)} not found. Run from the site's repo root.`);
    process.exit(2);
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const cfg = merge(DEFAULTS, raw);
  validate(cfg);
  return cfg;
}

export function validate(cfg) {
  const errs = [];
  if (!cfg.site.name) errs.push('site.name is empty');
  if (!cfg.site.domain) errs.push('site.domain is empty');
  if (!(cfg.caps.weeklyPages >= 1 && cfg.caps.weeklyPages <= 3)) errs.push('caps.weeklyPages must be 1-3 (the release cadence is at most 3 editorial pages a week)');
  if (!cfg.clusters.length) errs.push('clusters is empty');
  if (errs.length) {
    console.error(`[growth] growth.config.json invalid:\n - ${errs.join('\n - ')}`);
    process.exit(2);
  }
}

export const abs = (...p) => path.join(ROOT, ...p);
export const growthDir = (cfg) => abs(cfg.paths.dir);
export const origin = (cfg) => `https://${cfg.site.domain}`;
export const pageUrl = (cfg, p) => `${origin(cfg)}${p}`;
export const postPath = (cfg, { category, slug }) => cfg.content.urlTemplate.replace('{category}', category ?? '').replace('{slug}', slug).replace('//', '/');

/** Secrets the weekly workflow needs. */
export const REQUIRED_SECRETS = ['DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD', 'GSC_SA_KEY_BASE64', 'ANTHROPIC_API_KEY', 'GA4_PROPERTY_ID'];
export const missingSecrets = (env = process.env) => REQUIRED_SECRETS.filter((k) => !env[k]);
