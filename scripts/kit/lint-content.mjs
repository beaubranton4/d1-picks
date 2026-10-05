#!/usr/bin/env node
// site-kit v0.1.0
/**
 * Content lint: catches what would embarrass the site before a build or a
 * reviewer does. Merges three earlier tools: the article frontmatter/H1/dash
 * lint, the voice linter's banned-phrase and meta-leak lists, and the
 * invisible-Unicode watermark scanner.
 *
 * Per MDX entry (errors fail; warnings do not):
 *   - frontmatter parses; title, description, publishDate, author present
 *   - description 70-160 chars; dates are YYYY-MM-DD; updatedDate in range
 *   - author exists in site.config.json; image exists and has imageAlt
 *   - no body H1 (the template renders the title as the page's one H1)
 *   - no raw markdown images or <img> (use <Img>, which forces alt + size)
 *   - no em dash, en dash or spaced double hyphen
 *   - no banned hype/AI-slop phrases or model meta-narration
 *   - no zero-width, tag, variation-selector or exotic-space characters
 * Site-wide:
 *   - release cadence: at most releaseCadence.maxEditorialPerWeek gated pages
 *     per ISO week from this week on (verified-directory paths exempt)
 *   - verified data: every listing has source_url + verified_at
 *   - invisible characters anywhere in content/, data/ and src/app/
 *   - with --base <ref>: entries added since <ref> must not be backdated
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { cli } from './lib/cli.mjs';
import { ROOT, loadConfig } from './lib/config.mjs';
import { isCadenceExempt, isoWeek, loadSchedule, releaseItems, scanCollections } from './lib/content.mjs';

const { values, positionals } = cli(
  `
Usage: node scripts/kit/lint-content.mjs [files...] [--base <git-ref>] [--fix]

Lints every MDX entry in the collections declared in site.config.json, plus
site-wide release and data checks. Pass files to lint only those entries.

  --base <ref>   treat entries/schedule keys added since <ref> as new: their
                 release date must be today or later (no backdating)
  --fix          strip invisible characters in place (exotic spaces become
                 plain spaces); everything else needs a human rewrite
`,
  { base: { type: 'string' }, fix: { type: 'boolean' } },
);

const cfg = loadConfig();
const today = new Date().toISOString().slice(0, 10);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const results = []; // { file, level, msg }
const err = (file, msg) => results.push({ file, level: 'error', msg });
const warn = (file, msg) => results.push({ file, level: 'warn', msg });

// ---------------------------------------------------------------------------
// Rule tables
// ---------------------------------------------------------------------------

const BANNED_PHRASES = [
  // hype (voice guide)
  'level up', 'game changer', 'game-changer', 'unlock', 'unleash', 'next level', 'revolutionize',
  'supercharge', 'elevate your', "in today's fast-paced", 'in today’s fast-paced', 'look no further',
  'dive in', 'dive into', 'the secret', 'secrets',
  // AI-slop tells
  'delve', 'tapestry', 'a testament to', "it's important to note", 'it is important to note',
  'in conclusion', 'embark on', 'in the realm of', 'ever-evolving', 'navigate the complexities',
  'harness the power', "in today's digital age", 'seamless',
  ...(cfg.contentRules?.bannedPhrases ?? []),
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const phraseRe = (p) => new RegExp(`\\b${escapeRe(p)}(s|es|ed|d|ing)?\\b`, 'i');

/** The model's own process narration mistaken for copy. */
const META_LEAK = [
  [/^\s*(HOLD|NOTE|TODO|TBD|WAIT|FLAG|CAVEAT|FIXME)\b/m, 'line opens with a status label'],
  [/awaiting confirmation/i, 'asks for confirmation'],
  [/before (drafting|building|proceeding)/i, 'narrates its own process'],
  [/\bas an ai\b|\bas a (large )?language model\b/i, 'speaks as the model'],
  [/\bI hope this helps\b|\bhere(?:'s| is) (the|your) (article|draft|post)\b/i, 'chat-reply framing'],
  [/\[(insert|citation needed|source)[^\]]*\](?!\()/i, 'unfilled placeholder'],
];

// Invisible characters: zero-width, bidi marks, soft hyphen, invisible
// operators, exotic spaces (incl. NBSP), tag characters (hidden-text
// steganography) and variation selectors.
const INVISIBLE = new Map([
  [0x200b, ['ZERO WIDTH SPACE', '']], [0x200c, ['ZERO WIDTH NON-JOINER', '']], [0x200d, ['ZERO WIDTH JOINER', '']],
  [0x2060, ['WORD JOINER', '']], [0xfeff, ['BOM / ZERO WIDTH NO-BREAK SPACE', '']], [0x200e, ['LEFT-TO-RIGHT MARK', '']],
  [0x200f, ['RIGHT-TO-LEFT MARK', '']], [0x061c, ['ARABIC LETTER MARK', '']], [0x180e, ['MONGOLIAN VOWEL SEPARATOR', '']],
  [0x00ad, ['SOFT HYPHEN', '']], [0x2061, ['FUNCTION APPLICATION', '']], [0x2062, ['INVISIBLE TIMES', '']],
  [0x2063, ['INVISIBLE SEPARATOR', '']], [0x2064, ['INVISIBLE PLUS', '']],
  [0x00a0, ['NO-BREAK SPACE', ' ']], [0x202f, ['NARROW NO-BREAK SPACE', ' ']], [0x2007, ['FIGURE SPACE', ' ']],
  [0x2008, ['PUNCTUATION SPACE', ' ']], [0x2009, ['THIN SPACE', ' ']], [0x200a, ['HAIR SPACE', ' ']],
  [0x2002, ['EN SPACE', ' ']], [0x2003, ['EM SPACE', ' ']], [0x2004, ['THREE-PER-EM SPACE', ' ']],
  [0x2005, ['FOUR-PER-EM SPACE', ' ']], [0x2006, ['SIX-PER-EM SPACE', ' ']], [0x3000, ['IDEOGRAPHIC SPACE', ' ']],
]);
const isTag = (cp) => cp >= 0xe0000 && cp <= 0xe007f;
const isVariationSelector = (cp) => (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0xe0100 && cp <= 0xe01ef);

function scanInvisible(text) {
  const hits = new Map();
  let line = 1;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (ch === '\n') line++;
    const label = INVISIBLE.get(cp)?.[0] ?? (isTag(cp) ? 'UNICODE TAG CHAR (hidden text)' : isVariationSelector(cp) ? 'VARIATION SELECTOR' : null);
    if (label) {
      const h = hits.get(label) ?? { n: 0, line };
      h.n++;
      hits.set(label, h);
    }
  }
  return [...hits.entries()].map(([label, h]) => `${h.n}x ${label} (first at line ${h.line})`);
}

function stripInvisible(text) {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (INVISIBLE.has(cp)) out += INVISIBLE.get(cp)[1];
    else if (isTag(cp) || isVariationSelector(cp)) continue;
    else out += ch;
  }
  return out;
}

/** Body with code fences and inline code removed, so prose rules skip code. */
const proseOnly = (body) => body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');

// ---------------------------------------------------------------------------
// Per-entry checks
// ---------------------------------------------------------------------------

const authors = new Set((cfg.authors ?? []).map((a) => a.slug));
let entries = scanCollections(cfg);
if (positionals.length) {
  const wanted = new Set(positionals.map((f) => path.relative(ROOT, path.resolve(f))));
  entries = entries.filter((e) => wanted.has(e.file));
  for (const f of wanted) if (!entries.some((e) => e.file === f)) err(f, 'not an entry in any collection declared in site.config.json');
}

for (const e of entries) {
  const f = e.file;
  if (e.parseError) {
    err(f, `frontmatter will not parse: ${e.parseError}`);
    continue;
  }
  const d = e.data;
  for (const k of ['title', 'description', 'publishDate', 'author']) {
    if (d[k] == null || String(d[k]).trim() === '') err(f, `missing frontmatter "${k}"`);
  }
  if (typeof d.description === 'string') {
    const n = d.description.trim().length;
    if (n < 70 || n > 160) err(f, `description is ${n} chars; keep it 70-160`);
  }
  if (typeof d.title === 'string' && d.title.length > 60) warn(f, `title is ${d.title.length} chars; Google truncates around 60`);
  if (e.publishDate && !DATE_RE.test(e.publishDate)) err(f, `publishDate must be YYYY-MM-DD, got "${e.publishDate}"`);
  if (e.updatedDate) {
    if (!DATE_RE.test(e.updatedDate)) err(f, `updatedDate must be YYYY-MM-DD, got "${e.updatedDate}"`);
    else if (e.publishDate && e.updatedDate < e.publishDate) err(f, 'updatedDate is before publishDate');
    else if (e.updatedDate > today) err(f, 'updatedDate is in the future; set it when the update ships');
  }
  if (d.author && !authors.has(d.author)) err(f, `author "${d.author}" is not in site.config.json authors[]`);
  if (d.image) {
    if (!String(d.image).startsWith('/')) err(f, 'image must be a root-relative path under public/');
    else if (!fs.existsSync(path.join(ROOT, 'public', d.image))) err(f, `image not found: public${d.image}`);
    if (!d.imageAlt) err(f, 'image needs imageAlt describing what the image actually shows');
  }
  if (d.faq != null && !Array.isArray(d.faq)) err(f, 'faq must be a list of { question, answer }');
  const faq = Array.isArray(d.faq) ? d.faq : [];
  for (const item of faq) {
    if (!item?.question || !item?.answer) err(f, 'every faq item needs question and answer');
  }

  const prose = proseOnly(e.body);
  const h1s = prose.split('\n').filter((l) => /^#\s+/.test(l));
  if (h1s.length) err(f, `${h1s.length} body H1 heading(s); the template renders the title as the H1, use ## for sections`);
  if (/!\[[^\]]*\]\([^)]*\)/.test(prose)) err(f, 'raw markdown image; use <Img src alt width height /> (alt + size + AVIF/WebP)');
  if (/<img\b/i.test(prose)) err(f, 'raw <img>; use <Img src alt width height />');

  const allow = new Set((Array.isArray(d.lintAllow) ? d.lintAllow : []).map((x) => String(x).toLowerCase()));
  const copy = `${d.title ?? ''}\n${d.description ?? ''}\n${prose}\n${faq.map((q) => `${q?.question}\n${q?.answer}`).join('\n')}`;
  if (/—/.test(copy)) err(f, 'contains an em dash; rewrite with a comma, colon or full stop');
  if (/–/.test(copy)) err(f, 'contains an en dash; use "to" for ranges or a hyphen');
  if (/(^|\s)--(\s|$)/m.test(copy)) err(f, 'contains a spaced double hyphen');
  for (const p of BANNED_PHRASES) {
    if (!allow.has(p.toLowerCase()) && phraseRe(p).test(copy)) err(f, `banned phrase "${p}" (allow deliberately via frontmatter lintAllow)`);
  }
  for (const [re, why] of META_LEAK) if (re.test(copy)) err(f, `meta-leak: ${why}`);
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(copy)) warn(f, 'contains an emoji');
  const words = prose.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  if (words < 300) warn(f, `only ${words} words; is this page useful enough to index?`);
}

// ---------------------------------------------------------------------------
// Invisible characters, site-wide (content/, data/, src/app/)
// ---------------------------------------------------------------------------

const TEXT_EXT = /\.(mdx?|json|txt|tsx?|ya?ml|csv)$/;
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : TEXT_EXT.test(d.name) ? [p] : [];
  });
}
for (const file of ['content', 'data', 'src/app'].flatMap((d) => walk(path.join(ROOT, d)))) {
  const rel = path.relative(ROOT, file);
  if (positionals.length && !entries.some((e) => e.file === rel) && rel.startsWith('content/')) continue;
  const text = fs.readFileSync(file, 'utf8');
  const hits = scanInvisible(text);
  if (!hits.length) continue;
  if (values.fix) {
    fs.writeFileSync(file, stripInvisible(text));
    warn(rel, `fixed: stripped ${hits.join('; ')}`);
  } else {
    err(rel, `invisible characters: ${hits.join('; ')} (rerun with --fix)`);
  }
}

// ---------------------------------------------------------------------------
// Release schedule + cadence
// ---------------------------------------------------------------------------

const schedule = loadSchedule();
const mdxPaths = new Set(scanCollections(cfg).map((e) => e.path));
for (const [p, date] of Object.entries(schedule)) {
  if (!p.startsWith('/')) err('content/release-schedule.json', `key "${p}" must be a path starting with /`);
  if (!/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2}))?$/.test(String(date)) || Number.isNaN(Date.parse(String(date).slice(0, 10)))) {
    err('content/release-schedule.json', `"${p}": invalid date "${date}" (YYYY-MM-DD, or a datetime with Z/offset)`);
  }
  // Two dates for one page would publish on the later one while datePublished
  // shows the earlier: a backdate. MDX pages are dated only by publishDate.
  if (mdxPaths.has(p.length > 1 ? p.replace(/\/$/, '') : p)) {
    err('content/release-schedule.json', `"${p}" is an MDX entry; date it with frontmatter publishDate only`);
  }
}

const max = cfg.releaseCadence?.maxEditorialPerWeek ?? 3;
const thisWeek = isoWeek(today);
const perWeek = new Map();
for (const it of releaseItems(cfg)) {
  if (!DATE_RE.test(String(it.date).slice(0, 10)) || isCadenceExempt(it.path, cfg)) continue;
  const w = isoWeek(it.date);
  if (w < thisWeek) continue; // history is history
  perWeek.set(w, [...(perWeek.get(w) ?? []), it.path]);
}
for (const [w, paths] of [...perWeek.entries()].sort()) {
  if (paths.length > max) {
    err('release cadence', `${w} releases ${paths.length} editorial pages (max ${max}): ${paths.join(', ')}. Spread them out (see /kit-release-plan).`);
  }
}

// ---------------------------------------------------------------------------
// No backdating (entries and schedule keys added since --base)
// ---------------------------------------------------------------------------

if (values.base) {
  const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  let added = [];
  let baseSchedule = {};
  try {
    added = git('diff', '--name-only', '--diff-filter=A', `${values.base}...HEAD`).split('\n').filter(Boolean);
    added.push(...git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean));
    try {
      baseSchedule = JSON.parse(git('show', `${values.base}:content/release-schedule.json`));
    } catch {
      baseSchedule = {};
    }
  } catch (e) {
    err('--base', `git failed for "${values.base}": ${String(e.message).split('\n')[0]}`);
  }
  for (const e of scanCollections(cfg).filter((x) => added.includes(x.file))) {
    if (e.publishDate && e.publishDate < today) err(e.file, `new entry backdated to ${e.publishDate}; a new page's publishDate must be today or later`);
  }
  for (const [p, date] of Object.entries(schedule)) {
    if (!(p in baseSchedule) && String(date).slice(0, 10) < today) {
      err('content/release-schedule.json', `new schedule entry "${p}" backdated to ${date}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Verified data (directory listings)
// ---------------------------------------------------------------------------

for (const rel of cfg.verifiedData ?? []) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    err(rel, 'listed in site.config.json verifiedData but missing');
    continue;
  }
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  (Array.isArray(rows) ? rows : []).forEach((r, i) => {
    const who = r?.name ?? r?.id ?? `#${i}`;
    if (!r?.source_url || !/^https?:\/\//.test(r.source_url)) err(rel, `${who}: source_url (the page you verified against) is required`);
    if (!r?.verified_at || !DATE_RE.test(r.verified_at)) err(rel, `${who}: verified_at (YYYY-MM-DD) is required`);
    else if (r.verified_at > today) err(rel, `${who}: verified_at ${r.verified_at} is in the future`);
  });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const errors = results.filter((r) => r.level === 'error');
const warnings = results.filter((r) => r.level === 'warn');
for (const r of results) console[r.level === 'error' ? 'error' : 'warn'](`${r.level === 'error' ? 'ERROR' : 'warn '} ${r.file}: ${r.msg}`);
const failed = new Set(errors.map((r) => r.file));
for (const e of entries) if (!failed.has(e.file)) console.log(`ok    ${e.file}`);
console.log(`\n${entries.length} entries checked: ${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length ? 1 : 0);
