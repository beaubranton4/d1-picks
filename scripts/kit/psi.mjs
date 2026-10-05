#!/usr/bin/env node
// site-kit v0.1.0
/**
 * PageSpeed Insights (mobile) for one or more URLs: lab LCP and CLS from
 * Lighthouse, plus field LCP, CLS and INP from the Chrome UX Report when the
 * URL has enough real traffic. Thresholds: LCP < 2.0s, CLS < 0.05, INP < 200ms.
 *
 * Keyless requests share one global Google quota that is often exhausted;
 * set PSI_API_KEY (a free Google Cloud API key with PageSpeed Insights API
 * enabled) for reliable runs.
 * Exits non-zero when any measured metric misses its threshold.
 */
import { cli } from './lib/cli.mjs';
import { table } from './lib/md.mjs';

const { values, positionals } = cli(
  `
Usage: node scripts/kit/psi.mjs <url...> [--strategy mobile|desktop]

  PSI_API_KEY   optional PageSpeed Insights API key (env)

PSI needs public URLs; it cannot reach localhost.
`,
  { strategy: { type: 'string', default: 'mobile' } },
);
if (!positionals.length) {
  console.error('psi: pass at least one URL (see --help)');
  process.exit(2);
}

const LIMITS = { lcp: 2000, cls: 0.05, inp: 200 };

async function run(url) {
  const q = new URLSearchParams({ url, strategy: values.strategy, category: 'performance' });
  if (process.env.PSI_API_KEY) q.set('key', process.env.PSI_API_KEY);
  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`, { signal: AbortSignal.timeout(120000) });
  const j = await res.json();
  if (!res.ok) {
    const quota = /quota/i.test(j.error?.message ?? '') && !process.env.PSI_API_KEY;
    return { url, error: `${j.error?.message ?? `HTTP ${res.status}`}${quota ? ' (keyless PSI shares a global daily quota; set PSI_API_KEY)' : ''}` };
  }
  const audits = j.lighthouseResult?.audits ?? {};
  const field = j.loadingExperience?.metrics ?? {};
  return {
    url,
    score: Math.round((j.lighthouseResult?.categories?.performance?.score ?? 0) * 100),
    labLcp: audits['largest-contentful-paint']?.numericValue,
    labCls: audits['cumulative-layout-shift']?.numericValue,
    fieldLcp: field.LARGEST_CONTENTFUL_PAINT_MS?.percentile,
    fieldCls: field.CUMULATIVE_LAYOUT_SHIFT_SCORE ? field.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100 : undefined,
    fieldInp: field.INTERACTION_TO_NEXT_PAINT?.percentile,
  };
}

const results = [];
for (const u of positionals) results.push(await run(u).catch((e) => ({ url: u, error: e.message }))); // sequential: PSI rate-limits keyless use

const fails = [];
const check = (r, key, v, limit, fmt) => {
  if (v === undefined) return 'n/a';
  if (v >= limit) fails.push(`${r.url} ${key} ${fmt(v)}`);
  return `${fmt(v)}${v >= limit ? ' FAIL' : ''}`;
};
const ms = (v) => `${(v / 1000).toFixed(2)}s`;
const cls = (v) => v.toFixed(3);
const inp = (v) => `${Math.round(v)}ms`;

console.log(`# PageSpeed Insights (${values.strategy})\n`);
console.log(
  table(
    ['URL', 'Score', 'Lab LCP', 'Lab CLS', 'Field LCP', 'Field CLS', 'Field INP'],
    results.map((r) =>
      r.error
        ? [r.url, 'ERROR', r.error, '', '', '', '']
        : [
            r.url,
            r.score,
            check(r, 'lab LCP', r.labLcp, LIMITS.lcp, ms),
            check(r, 'lab CLS', r.labCls, LIMITS.cls, cls),
            check(r, 'field LCP', r.fieldLcp, LIMITS.lcp, ms),
            check(r, 'field CLS', r.fieldCls, LIMITS.cls, cls),
            check(r, 'field INP', r.fieldInp, LIMITS.inp, inp),
          ],
    ),
  ),
);
console.log('\nThresholds: LCP < 2.0s, CLS < 0.05, INP < 200ms. Field data (CrUX) appears only for URLs with enough Chrome traffic; INP is field-only.');
const errored = results.filter((r) => r.error);
if (fails.length || errored.length) {
  console.log(`\n${fails.length} metric(s) over threshold, ${errored.length} URL(s) errored.`);
  process.exit(1);
}
