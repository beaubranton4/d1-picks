// site-kit v0.1.0
// Gate 3 + shared topic check: duplicate topic and near-duplicate content.
import { containment, jaccard, shingleSimilarity, tokens } from '../lib/text.mjs';

const MODIFIERS = new Set(['online', 'free', 'guide', 'new', 'cheap', 'complete', 'calculator', 'tool', 'template', 'near', 'app', 'step', 'tip', 'idea', 'list', 'example', 'meaning', 'definition', 'explained', 'work', 'process']);

/**
 * How much does `keyword` overlap an existing page? Compares against title,
 * slug and the page's own keywords; takes the best score.
 * Returns {score, page, kind: 'duplicate'|'extend'|'new'}.
 */
export function topicOverlap(keyword, posts, cfg, extraKeywords = []) {
  const kt = tokens(keyword);
  let best = { score: 0, page: null };
  const consider = (label, cand, page, weight = 1) => {
    const ct = tokens(cand);
    if (!ct.length) return;
    // Jaccard, plus full containment: every keyword token already inside a specific title/slug.
    // A differing entity token ("target tuition reimbursement" vs "tuition reimbursement") is NOT contained.
    // Entity specialization: the page's whole topic sits inside the keyword plus ONE new non-modifier
    // token ("target" + "tuition reimbursement"). That is a new page about a specific entity, not a competitor.
    const ctSet = new Set(ct);
    const added = kt.filter((t) => !ctSet.has(t));
    const specialization = ct.length >= 2 && ct.every((t) => kt.includes(t)) && added.length === 1 && !MODIFIERS.has(added[0]);
    const score = (specialization ? 0.8 : 1) * weight * Math.max(jaccard(kt, ct), ct.length >= 3 && containment(kt, ct) === 1 ? 0.9 : 0);
    if (score > best.score) best = { score, page, matched: label };
  };
  for (const p of posts) {
    consider('title', p.title, p);
    consider('slug', p.slug.replace(/-/g, ' '), p);
    for (const k of p.keywords) consider('keyword', k, p, 0.8); // tags/keywords are broad topics; weigh below the title
  }
  for (const e of extraKeywords) consider('published', e.keyword, { slug: e.slug, path: e.path, title: e.keyword });
  const { duplicate, extend } = cfg.gates.topicOverlap;
  const kind = best.score >= duplicate ? 'duplicate' : best.score >= extend ? 'extend' : 'new';
  return { ...best, kind };
}

export function dupesDraft(draft, ctx) {
  const { cfg, posts, queued = [] } = ctx;
  const f = [];
  const kw = draft.topic?.keyword ?? draft.frontmatter?.title ?? '';
  const t = topicOverlap(kw, posts, cfg, ctx.publishedKeywords ?? []);
  if (t.kind !== 'new') f.push(`topic "${kw}" overlaps existing page "${t.page?.title ?? t.page?.slug}" (${t.score.toFixed(2)}, ${t.kind}); extend that page instead`);
  const titleHit = topicOverlap(draft.frontmatter?.title ?? '', posts, cfg);
  if (titleHit.kind === 'duplicate' && !f.length) f.push(`title is near-identical to "${titleHit.page?.title}"`);
  const max = cfg.gates.maxSimilarity;
  let worst = { sim: 0, page: null };
  for (const p of [...posts, ...queued]) {
    const sim = shingleSimilarity(draft.body ?? '', p.text ?? '', 5);
    if (sim > worst.sim) worst = { sim, page: p };
  }
  if (worst.sim > max) f.push(`${(worst.sim * 100).toFixed(0)}% of 5-word phrases already appear in "${worst.page?.title ?? worst.page?.slug}" (limit ${(max * 100).toFixed(0)}%)`);
  return { name: 'duplicates', pass: f.length === 0, failures: f, stats: { topic: t, worstSimilarity: worst.sim } };
}
