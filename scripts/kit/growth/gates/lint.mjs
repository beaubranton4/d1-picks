// site-kit v0.1.0
// Gate 1: content lint. Same rule set as the kit's lint-content (frontmatter,
// no body H1, dashes, invisible characters, banned phrases, meta leaks) plus
// the growth loop's own: no affiliate links, no fake first-hand claims.
const BANNED = [
  'level up', 'game changer', 'game-changer', 'unlock', 'unleash', 'next level', 'revolutionize', 'supercharge', 'elevate your',
  "in today's fast-paced", 'look no further', 'dive in', 'dive into', 'the secret', 'secrets',
  'delve', 'tapestry', 'a testament to', "it's important to note", 'it is important to note', 'in conclusion', 'embark on',
  'in the realm of', 'ever-evolving', 'navigate the complexities', 'harness the power', "in today's digital age", 'seamless',
];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const phraseRe = (p) => new RegExp(`\\b${esc(p)}(s|es|ed|d|ing)?\\b`, 'i');

const META_LEAK = [
  [/^\s*(HOLD|NOTE|TODO|TBD|WAIT|FLAG|CAVEAT|FIXME)\b/m, 'line opens with a status label'],
  [/awaiting confirmation|before (drafting|building|proceeding)/i, 'narrates its own process'],
  [/\bas an ai\b|\bas a (large )?language model\b/i, 'speaks as the model'],
  [/\bI hope this helps\b|\bhere(?:'s| is) (the|your) (article|draft|post)\b/i, 'chat-reply framing'],
  [/\[(insert|citation needed|source)[^\]]*\](?!\()/i, 'unfilled placeholder'],
];

const FIRST_HAND = /\b(I|we)\s+(tested|tried|used|bought|reviewed hands-on|measured|spent \d+|ran|visited|called|emailed)\b|\bin my (experience|testing)\b|\bour (testing|hands-on)\b|\bwe(?:'ve| have) (tested|used)\b|\bI(?:'ve| have) (tested|used|owned)\b/i;

const AFFILIATE = /amazon\.[a-z.]+\/(dp|gp)\/|[?&]tag=[a-z0-9-]+-\d{2}\b|amzn\.to|shareasale|awin1\.com|impact\.com\/|impactradius|go\.skimresources|rakuten|partnerize|[?&](aff|affiliate|ref)=/i;

// Zero-width, bidi, soft hyphen, invisible operators, exotic spaces, tag chars, variation selectors.
export const INVISIBLE_RE = /[​-‏⁠-⁤﻿­؜᠎   - 　\u{e0000}-\u{e007f}︀-️\u{e0100}-\u{e01ef}]/u;

export const proseOnly = (body) => body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');

export function lintDraft(draft, ctx) {
  const { cfg, today } = ctx;
  const f = [];
  const fm = draft.frontmatter ?? {};
  const body = draft.body ?? '';
  const g = cfg.gates;

  for (const k of ['title', 'slug', 'category', 'excerpt']) if (!fm[k] || !String(fm[k]).trim()) f.push(`missing frontmatter "${k}"`);
  if (cfg.content.categories.length && !cfg.content.categories.includes(fm.category)) f.push(`category "${fm.category}" is not one of ${cfg.content.categories.join(', ')}`);
  if (fm.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.slug)) f.push(`slug "${fm.slug}" must be lowercase kebab-case`);
  if (!Array.isArray(fm.keywords) || !fm.keywords.length) f.push('keywords must be a non-empty list');
  if (fm.excerpt) {
    const n = fm.excerpt.trim().length;
    if (n < g.descriptionMin || n > g.descriptionMax) f.push(`meta description is ${n} chars; keep it ${g.descriptionMin}-${g.descriptionMax}`);
  }
  if (fm.title && fm.title.length > 65) f.push(`title is ${fm.title.length} chars; keep it at or under 65`);
  if (cfg.content.titleMustIncludeYear && fm.title && !/\b20\d\d\b/.test(fm.title)) f.push('title must include the year');

  const prose = proseOnly(body);
  const h1s = prose.split('\n').filter((l) => /^#\s+/.test(l)).length + (prose.match(/<h1[\s>]/gi) ?? []).length;
  if (h1s) f.push(`${h1s} body H1(s); the template renders the title as the page's one H1, use ## sections`);
  if (!/^#{2}\s+/m.test(prose)) f.push('no ## sections');
  if (/!\[[^\]]*\]\([^)]*\)|<img\b/i.test(prose)) f.push('raw image in body (drafts ship text and tables only)');

  const copy = `${fm.title ?? ''}\n${fm.excerpt ?? ''}\n${prose}`;
  if (/—/.test(copy)) f.push('contains an em dash');
  if (/–/.test(copy)) f.push('contains an en dash');
  if (/(^|\s)--(\s|$)/m.test(copy)) f.push('contains a spaced double hyphen');
  if (INVISIBLE_RE.test(`${copy}\n${JSON.stringify(fm)}`)) f.push('contains invisible or exotic-space characters');
  for (const p of [...BANNED, ...g.bannedPhrases]) if (phraseRe(p).test(copy)) f.push(`banned phrase "${p}"`);
  for (const [re, why] of META_LEAK) if (re.test(copy)) f.push(`meta-leak: ${why}`);
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(copy)) f.push('contains an emoji');
  if (!g.allowFirstHand && FIRST_HAND.test(copy)) f.push('first-hand claim ("I tested", "we used"); only operator-supplied experience may be stated as first-hand');
  if (g.forbidAffiliateLinks && AFFILIATE.test(body)) f.push('affiliate link in body (this pipeline does not add affiliate links)');
  if (/<script|<iframe|javascript:|on[a-z]+\s*=/i.test(body)) f.push('script/iframe/inline handler in body');
  if (fm.slug && ctx.reservedSlugs?.has(fm.slug)) f.push(`slug "${fm.slug}" already exists`);
  void today;
  return { name: 'lint', pass: f.length === 0, failures: f };
}

/** Deterministic fixes the loop applies before gating; every fix is reported. */
export function sanitize(draft) {
  const fixes = [];
  const strip = (s) => {
    let t = String(s ?? '');
    const before = t;
    t = t.replace(/[​-‏⁠-⁤﻿­؜᠎\u{e0000}-\u{e007f}︀-️]/gu, '').replace(/[   - 　]/g, ' ');
    t = t.replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, '-');
    if (t !== before) fixes.push('normalized dashes/invisible characters');
    return t;
  };
  const out = { ...draft, body: strip(draft.body), frontmatter: { ...draft.frontmatter } };
  for (const k of ['title', 'excerpt']) if (out.frontmatter[k]) out.frontmatter[k] = strip(out.frontmatter[k]);
  return { draft: out, fixes: [...new Set(fixes)] };
}
