// site-kit v0.1.0
// Runs all gates. Everything must pass or the draft is dropped and logged.
import { dupesDraft } from './dupes.mjs';
import { factcheckDraft } from './factcheck.mjs';
import { lintDraft } from './lint.mjs';
import { sizeDraft } from './size.mjs';
import { valueDraft } from './value.mjs';

/**
 * ctx: {cfg, today, posts, sources, knownPaths:Set, queued?, publishedKeywords?, reservedSlugs?:Set}
 */
export function runGates(draft, ctx) {
  const lint = lintDraft(draft, ctx);
  const factcheck = factcheckDraft(draft, ctx);
  const dupes = dupesDraft(draft, ctx);
  const size = sizeDraft(draft, ctx);
  const value = valueDraft(draft, { ...ctx, factcheck });
  const results = [lint, factcheck, dupes, size, value];
  return { pass: results.every((r) => r.pass), results };
}

export const summarize = (g) => g.results.map((r) => `${r.pass ? 'PASS' : 'FAIL'} ${r.name}${r.failures.length ? `\n    - ${r.failures.join('\n    - ')}` : ''}`).join('\n');
