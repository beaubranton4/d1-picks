// site-kit v0.1.0
// Gate 2: fact-check. Every factual number in the body (prices, percentages,
// quantities with units, large figures, non-current years) must sit in a block
// that links to a source we actually fetched, and that number must appear in
// the saved text of one of the linked sources. Hypothetical example blocks are
// exempt but may not carry links.
import { normUrl } from '../lib/sources.mjs';

const UNITS = 'lbs?|pounds?|kg|oz|inch(?:es)?|ft|feet|cm|mm|mph|dB|watts?|W|GB|TB|MB|mg|%|percent|days?|weeks?|months?|years?|hours?';
const TOKEN_RES = [
  /\$\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:k|K|M|B|million|billion|thousand))?/g, // currency
  new RegExp(`\\b\\d[\\d,]*(?:\\.\\d+)?\\s?(?:${UNITS})(?![A-Za-z])`, 'g'), // number + unit
  /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g, // 5,250
  /\b(?:19|20)\d\d\b/g, // years
];
const HYPOTHETICAL = /^\s*(example:|for example,|for instance,|say you|suppose|imagine|let's say)/i;

/** Canonical numeric value as a string without commas: "$5.25k" -> "5250". */
export function canon(raw) {
  const m = String(raw).replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s?(k|K|M|B|million|billion|thousand)?/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  const mult = { k: 1e3, K: 1e3, thousand: 1e3, M: 1e6, million: 1e6, B: 1e9, billion: 1e9 }[m[2]];
  if (mult) n *= mult;
  return String(Number.isInteger(n) ? n : +n.toFixed(4));
}

export function factualTokens(text, { allowYears = [] } = {}) {
  const out = [];
  const seen = new Set();
  for (const re of TOKEN_RES) {
    for (const m of text.matchAll(re)) {
      const raw = m[0].trim();
      const c = canon(raw);
      if (c == null) continue;
      if (/^(19|20)\d\d$/.test(raw) && allowYears.includes(raw)) continue;
      const key = `${m.index}:${raw}`;
      if (seen.has(key)) continue;
      // Skip a bare number already covered by a longer token at the same spot (e.g. "$500" and "500").
      if (out.some((o) => m.index >= o.index && m.index < o.index + o.raw.length && o.raw.length >= raw.length)) continue;
      seen.add(key);
      out.push({ raw, canon: c, index: m.index });
    }
  }
  return out;
}

export function numberSet(text) {
  const set = new Set();
  for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?\s?(?:k\b|K\b|million|billion|thousand)?/g)) {
    const c = canon(m[0]);
    if (c) set.add(c);
    const plain = m[0].replace(/,/g, '').match(/\d+(?:\.\d+)?/)?.[0];
    if (plain) set.add(String(parseFloat(plain)));
  }
  return set;
}

const LINK_RE = /\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/g;

/** Split markdown into checkable blocks, tables keep a shared link set. */
export function blocks(body) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let para = [];
  let table = null;
  const flushPara = () => { if (para.length) out.push({ text: para.join(' '), kind: 'p' }); para = []; };
  const flushTable = () => {
    if (!table) return;
    const links = [...table.join('\n').matchAll(LINK_RE)].map((m) => m[1]);
    for (const row of table) out.push({ text: row, kind: 'row', extraLinks: links });
    table = null;
  };
  for (const l of lines) {
    if (/^\|/.test(l)) { flushPara(); (table ??= []).push(l); continue; }
    flushTable();
    if (!l.trim()) flushPara();
    else if (/^#{1,6}\s/.test(l)) { flushPara(); out.push({ text: l, kind: 'h' }); }
    else if (/^\s*([-*]|\d+\.)\s+/.test(l)) { flushPara(); out.push({ text: l, kind: 'li' }); }
    else para.push(l);
  }
  flushPara();
  flushTable();
  return out;
}

/**
 * @param draft  {body, frontmatter}
 * @param ctx    {sources: [{url, ok, text}], today}
 * @returns gate result with stats {verifiedBlocks, domains, unverified[]}
 */
export function factcheckDraft(draft, ctx) {
  const year = Number((ctx.today ?? new Date().toISOString()).slice(0, 4));
  const titleYears = [...String(draft.frontmatter?.title ?? '').matchAll(/\b(?:19|20)\d\d\b/g)].map((m) => m[0]);
  const allowYears = [String(year), String(year + 1), ...titleYears];
  const bySource = new Map();
  for (const s of ctx.sources ?? []) if (s.ok && s.text) bySource.set(normUrl(s.url), { url: s.url, nums: numberSet(s.text) });
  const allNums = new Set([...bySource.values()].flatMap((s) => [...s.nums]));

  const failures = [];
  const verified = [];
  const domains = new Set();
  let hypothetical = 0;

  for (const b of blocks(draft.body ?? '')) {
    const toks = factualTokens(b.text.replace(LINK_RE, (m) => m.replace(/\(https?:\/\/[^)]+\)/, '')), { allowYears });
    const links = [...[...b.text.matchAll(LINK_RE)].map((m) => m[1]), ...(b.extraLinks ?? [])];
    for (const l of links) {
      try { domains.add(new URL(l).hostname.replace(/^www\./, '')); } catch { /* ignore */ }
    }
    if (!toks.length) continue;
    const label = b.text.replace(LINK_RE, (m) => m.slice(1, m.indexOf(']'))).slice(0, 80);
    if (HYPOTHETICAL.test(b.text)) {
      if (links.length) failures.push(`hypothetical example carries a link; examples must be plain illustrations: "${label}"`);
      hypothetical++;
      continue;
    }
    if (b.kind === 'h') {
      for (const t of toks) if (!allNums.has(t.canon)) failures.push(`unverified number "${t.raw}" in heading "${label}"`);
      continue;
    }
    const linked = [...new Set(links.map(normUrl))].map((u) => bySource.get(u)).filter(Boolean);
    const unfetched = links.filter((u) => !bySource.has(normUrl(u)));
    if (!linked.length) {
      failures.push(`number(s) ${toks.map((t) => `"${t.raw}"`).join(', ')} with no fetched source${unfetched.length ? ` (linked ${unfetched[0]} was not fetched)` : ' linked in the same block'}: "${label}"`);
      continue;
    }
    const bad = toks.filter((t) => !linked.some((s) => s.nums.has(t.canon)));
    if (bad.length) failures.push(`${bad.map((t) => `"${t.raw}"`).join(', ')} not found in the saved text of the cited source(s): "${label}"`);
    else verified.push({ text: label, tokens: toks.map((t) => t.raw), sources: linked.map((s) => s.url) });
  }
  return { name: 'factcheck', pass: failures.length === 0, failures, stats: { verifiedBlocks: verified.length, domains: [...domains], hypotheticalBlocks: hypothetical, verified } };
}
