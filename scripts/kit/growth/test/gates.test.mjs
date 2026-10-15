// site-kit v0.1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runGates } from '../gates/index.mjs';
import { factcheckDraft } from '../gates/factcheck.mjs';
import { lintDraft, sanitize } from '../gates/lint.mjs';
import { cfg, ctx, goodBody, mkDraft, SRC1, sources } from './helpers.mjs';

test('a clean, fully cited draft passes every gate', () => {
  const g = runGates(mkDraft(), ctx());
  assert.deepEqual(g.results.filter((r) => !r.pass).map((r) => `${r.name}: ${r.failures}`), []);
  assert.equal(g.pass, true);
});

test('MUST FAIL: an invented number is rejected by the fact-check', () => {
  const body = goodBody.replace('renewal costs $2 there', 'renewal costs $7 there');
  const r = factcheckDraft(mkDraft({ body }), ctx());
  assert.equal(r.pass, false);
  assert.match(r.failures.join('\n'), /"\$7" not found in the saved text/);
  assert.equal(runGates(mkDraft({ body }), ctx()).pass, false);
});

test('MUST FAIL: a number with no source link in its block', () => {
  const body = `${goodBody}\n\nRenewal usually takes 45 days to process at most branches.`;
  const r = factcheckDraft(mkDraft({ body }), ctx());
  assert.equal(r.pass, false);
  assert.match(r.failures.join('\n'), /"45 days".*no fetched source/);
});

test('MUST FAIL: citing a URL that was never fetched', () => {
  const body = goodBody.replace(SRC1, 'https://never-fetched.example/page');
  const r = factcheckDraft(mkDraft({ body }), ctx());
  assert.equal(r.pass, false);
  assert.match(r.failures.join('\n'), /not fetched/);
});

test('a number cited to the wrong fetched source fails', () => {
  const body = goodBody.replace('renewal costs $2 there', 'a late fee of $0.25 per day applies there');
  assert.equal(factcheckDraft(mkDraft({ body }), ctx()).pass, false);
});

test('hypothetical example blocks are exempt but may not carry links', () => {
  const ok = factcheckDraft(mkDraft({ body: `${goodBody}\n\nExample: a family with 4 cards and $40 in fines would pay it off first.` }), ctx());
  assert.equal(ok.pass, true);
  const bad = factcheckDraft(mkDraft({ body: `${goodBody}\n\nExample: a $40 fine from [here](${SRC1}).` }), ctx());
  assert.equal(bad.pass, false);
});

test('the current year and the title year are allowed without a source', () => {
  const body = `${goodBody}\n\nThese rules were checked in 2026.`;
  assert.equal(factcheckDraft(mkDraft({ body }), ctx()).pass, true);
  assert.equal(factcheckDraft(mkDraft({ body: `${goodBody}\n\nThis changed in 2019.` }), ctx()).pass, false);
});

test('table rows may share one source link in the table', () => {
  const body = `${goodBody}\n\n| Rule | Value | Source |\n|---|---|---|\n| Term | 3 years | [one](${SRC1}) |\n| Fee | $2 | [one](${SRC1}) |`;
  assert.equal(factcheckDraft(mkDraft({ body }), ctx()).pass, true);
});

test('lint catches em dashes, H1, banned phrases, invisible chars, first-hand claims, affiliate links', () => {
  const bad = mkDraft({ body: `# Title\n\nWe tested this — it was seamless​. [Buy](https://www.amazon.com/dp/B000?tag=site-20)\n\n## ok\n\ntext` });
  const r = lintDraft(bad, ctx());
  const f = r.failures.join('\n');
  assert.match(f, /body H1/);
  assert.match(f, /em dash/);
  assert.match(f, /banned phrase "seamless"/);
  assert.match(f, /invisible/);
  assert.match(f, /first-hand/);
  assert.match(f, /affiliate/);
});

test('lint enforces meta description length and required frontmatter', () => {
  const r = lintDraft(mkDraft({ frontmatter: { ...mkDraft().frontmatter, excerpt: 'too short', category: 'nope' } }), ctx());
  assert.match(r.failures.join('\n'), /meta description is 9 chars/);
  assert.match(r.failures.join('\n'), /category "nope"/);
});

test('sanitize strips invisible characters and dashes, and reports it', () => {
  const { draft, fixes } = sanitize(mkDraft({ body: 'a​b — c' }));
  assert.equal(draft.body, 'ab, c');
  assert.equal(fixes.length, 1);
});

test('MUST FAIL: a duplicate topic is rejected', () => {
  const posts = [{ title: 'How to Renew a Library Card Online', slug: 'renew-library-card', keywords: [], text: 'unrelated text here', path: '/guides/renew-library-card', released: true }];
  const g = runGates(mkDraft(), ctx({ posts }));
  assert.equal(g.pass, false);
  assert.match(g.results.find((r) => r.name === 'duplicates').failures.join('\n'), /overlaps existing page/);
});

test('MUST FAIL: near-duplicate content is rejected even under a new topic', () => {
  const posts = [{ title: 'Something Else Entirely', slug: 'other', keywords: [], text: goodBody, path: '/guides/other', released: true }];
  const g = runGates(mkDraft({ topic: { keyword: 'zebra stripes pattern origin' } }), ctx({ posts }));
  assert.match(g.results.find((r) => r.name === 'duplicates').failures.join('\n'), /5-word phrases already appear/);
});

test('value gate: facts need enough verified blocks and source domains; tool must be registered and linked', () => {
  const thin = `Short intro that is not very long but is fine.\n\n## A\n\nCards expire after 3 years per [one](${SRC1}).\n\nRead the [guides](/guides) and [home](/).`;
  const g = runGates(mkDraft({ body: thin }), ctx());
  assert.match(g.results.find((r) => r.name === 'value').failures.join('\n'), /verified cited fact block/);
  const noTool = runGates(mkDraft({ value: { type: 'tool', tool: '/tools/calc' } }), ctx());
  assert.match(noTool.results.find((r) => r.name === 'value').failures.join('\n'), /never links to the tool/);
  const withTool = runGates(mkDraft({ value: { type: 'tool', tool: '/tools/calc' }, body: `${goodBody}\n\nTry the [calculator](/tools/calc).` }), ctx());
  assert.equal(withTool.results.find((r) => r.name === 'value').pass, true);
  assert.equal(runGates(mkDraft({ value: undefined }), ctx()).results.find((r) => r.name === 'value').pass, false);
});

test('size gate: word and internal-link minimums, dead internal links', () => {
  const g = runGates(mkDraft({ body: `Tiny.\n\n## A\n\nSee [x](/guides/ghost) and [one](${SRC1}).` }), ctx());
  const f = g.results.find((r) => r.name === 'size').failures.join('\n');
  assert.match(f, /words; need at least 50/);
  assert.match(f, /\/guides\/ghost does not resolve/);
  assert.match(f, /distinct internal link/);
});

test('sanity: unused sources import keeps the helpers honest', () => {
  assert.equal(sources.length, 2);
  assert.equal(cfg.gates.minWords, 50);
});

test('bodyIsMdx: braces and "<" in prose fail lint, code spans are exempt, and sites that do not compile MDX are unaffected', async () => {
  const { withDefaults } = await import('../lib/config.mjs');
  const mdx = withDefaults({ ...cfg, content: { ...cfg.content, bodyIsMdx: true } });
  const risky = mkDraft({ body: `${goodBody}\n\nCosts <$100 and uses {braces}.` });
  assert.match(lintDraft(risky, ctx({ cfg: mdx })).failures.join(), /MDX/);
  assert.equal(lintDraft(risky, ctx()).failures.some((x) => /MDX/.test(x)), false);
  const safe = mkDraft({ body: `${goodBody}\n\nUse \`<b>\` literally.` });
  assert.equal(lintDraft(safe, ctx({ cfg: mdx })).failures.some((x) => /MDX/.test(x)), false);
});

test('requiredLinkPrefixes: the body must link a page under each prefix', async () => {
  const { withDefaults } = await import('../lib/config.mjs');
  const need = withDefaults({ ...cfg, gates: { ...cfg.gates, requiredLinkPrefixes: ['/guides/'] } });
  const known = new Set(['/', '/guides', '/guides/a']);
  const no = runGates(mkDraft(), ctx({ cfg: need, knownPaths: known }));
  assert.match(no.results.find((r) => r.name === 'size').failures.join(), /under \/guides\//);
  const yes = runGates(mkDraft({ body: `${goodBody}\n\nSee [A](/guides/a).` }), ctx({ cfg: need, knownPaths: known }));
  assert.equal(yes.results.find((r) => r.name === 'size').failures.some((x) => /under/.test(x)), false);
});
