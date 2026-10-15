// site-kit v0.1.0
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { findHealthClaims } from '../../lib/health-claims.mjs';
import { applyRequiredBlocks, missingBlocks } from '../lib/blocks.mjs';
import { runGates } from '../gates/index.mjs';
import { lintDraft } from '../gates/lint.mjs';
import { skipReason, aioVerdict, sourceUrls } from '../topics.mjs';
import { withDefaults } from '../lib/config.mjs';
import { cfg as baseCfg, ctx, goodBody, mkDraft, SRC1 } from './helpers.mjs';

const rules = (t) => findHealthClaims(t).map((h) => h.rule);

test('MUST FAIL: treat / cure / prevent / reduce / detox claims', () => {
  for (const [text, rule] of [
    ['Manual drainage treats lymphedema in most patients.', 'treats'],
    ['This technique can cure swelling.', 'treats'],
    ['Regular sessions prevent fibrosis after surgery.', 'prevents'],
    ['It reduces swelling and puffiness.', 'reduces'],
    ['A good therapist helps relieve pain.', 'reduces'],
    ['Lymphatic massage helps to detoxify the body.', 'detoxes'],
    ['It flushes toxins out of tissue.', 'detoxes'],
    ['Drainage helps tissue heal faster.', 'heals'],
  ]) assert.ok(rules(text).includes(rule), `${text} -> ${rule}`);
});

test('MUST FAIL: "studies show" style evidence claims', () => {
  for (const t of [
    'Studies show that drainage helps.',
    'Research suggests a benefit.',
    'According to a study, clients improve.',
    'The method is clinically proven.',
    'Doctors recommend it for every patient.',
    'It is backed by science.',
  ]) assert.ok(rules(t).includes('studies show'), t);
});

test('MUST FAIL: recovery and post-surgery timelines', () => {
  for (const t of [
    'Most people recover in two weeks.',
    'Recovery time is about 6 weeks.',
    'Start sessions within 7 days after surgery.',
    'You can begin 3 weeks post-op.',
    'Wait 2 weeks before booking.',
    'Healing timeline varies.',
  ]) assert.ok(findHealthClaims(t).length > 0, t);
});

test('licensing and pricing copy passes', () => {
  for (const t of [
    'Check a massage therapist license on the state board website, then confirm the license number and status.',
    'A CLT-LANA certificate requires a 135-hour course, according to the certifying body.',
    'Austin Lymphatic lists a 60 minute session at $130 on its own pricing page. Ask what the session includes and how cancellations work.',
    'Vodder and Klose are training schools. Ask which school the practitioner attended and request a certificate number.',
    'We checked these pages on 2026-10-14. This site is not medical advice.',
  ]) assert.deepEqual(findHealthClaims(t), [], t);
});

test('health claims are ignored inside code and link URLs', () => {
  assert.deepEqual(findHealthClaims('See [the board](https://example.gov/treat-and-cure) and `reduces`.'), []);
});

const hcfg = withDefaults({ ...baseCfg, gates: { ...baseCfg.gates, healthClaims: true } });
const hctx = (o = {}) => ctx({ cfg: hcfg, ...o });

test('growth lint gate: off by default, on with gates.healthClaims, and a clean page still passes', () => {
  const bad = mkDraft({ body: `${goodBody}\n\nStudies show that drainage reduces swelling and most people recover within 2 weeks.` });
  assert.equal(lintDraft(bad, ctx()).failures.some((f) => /health claim/.test(f)), false);
  const r = lintDraft(bad, hctx());
  assert.equal(r.pass, false);
  assert.match(r.failures.join('\n'), /health claim \(studies show\)/);
  assert.match(r.failures.join('\n'), /health claim \(reduces\)/);
  assert.match(r.failures.join('\n'), /health claim \(recovery\)/);
  assert.equal(runGates(bad, hctx()).pass, false);
  assert.equal(lintDraft(mkDraft(), hctx()).pass, true);
});

test('health claims in the title or meta description fail too', () => {
  const d = mkDraft({ frontmatter: { ...mkDraft().frontmatter, title: 'Lymphatic Massage That Cures Swelling', excerpt: 'How library card renewal works, when the window opens, what it costs and which rules apply, from public library policy pages.' } });
  assert.match(lintDraft(d, hctx()).failures.join('\n'), /health claim \(treats\): "Cures"/);
});

const bcfg = withDefaults({
  ...baseCfg,
  content: {
    ...baseCfg.content,
    requiredBlocks: [
      { id: 'disclaimer', position: 'start', markdown: '*This page is not medical advice.*', test: 'not medical advice' },
      { id: 'sources', position: 'end', markdown: '## Sources checked\n\nChecked {today}.\n\n{sources}', test: 'Checked \\d{4}-\\d{2}-\\d{2}' },
      { id: 'age', position: 'end', markdown: '*Adults 21 and over only.*', test: '21 and over', when: '\\bodds\\b' },
    ],
  },
});

test('required blocks are inserted deterministically, cite sources with the date checked, and are re-checked', () => {
  const out = applyRequiredBlocks(mkDraft(), bcfg, '2026-10-05');
  assert.match(out.body, /^\*This page is not medical advice\.\*/);
  assert.match(out.body, /## Sources checked\n\nChecked 2026-10-05\.\n\n- \[one\.example\]\(https:\/\/one\.example\/policy\)/);
  assert.doesNotMatch(out.body, /21 and over/); // `when` not met
  assert.deepEqual(missingBlocks(out.body, bcfg), []);
  assert.equal(applyRequiredBlocks(out, bcfg, '2026-10-05').body, out.body); // idempotent
  const withOdds = applyRequiredBlocks(mkDraft({ body: `${goodBody}\n\nThe odds of a bid depend on the committee.` }), bcfg, '2026-10-05');
  assert.match(withOdds.body, /21 and over/);
});

test('MUST FAIL: a page missing a required block fails lint (so growth:verify fails it too)', () => {
  const r = lintDraft(mkDraft(), ctx({ cfg: bcfg }));
  assert.equal(r.pass, false);
  assert.match(r.failures.join('\n'), /required block "disclaimer" is missing/);
  assert.match(r.failures.join('\n'), /required block "sources" is missing/);
  const odds = applyRequiredBlocks(mkDraft({ body: `${goodBody}\n\nThe odds of a bid depend on the committee.` }), bcfg, '2026-10-05');
  const stripped = { ...odds, body: odds.body.replace('*Adults 21 and over only.*', '') };
  assert.match(lintDraft(stripped, ctx({ cfg: bcfg })).failures.join('\n'), /required block "age" is missing/);
});

const acfg = withDefaults({ ...baseCfg, allow: { patterns: ['\\blicens(e|ing)\\b', '\\bhow much\\b'], reasons: {} }, skip: { patterns: ['\\bsymptoms?\\b'], reasons: {} } });

test('MUST FAIL: an allowlist skips everything outside the allowed clusters', () => {
  assert.equal(skipReason('verify massage therapist license texas', acfg), null);
  assert.match(skipReason('lymphatic massage for cellulite', acfg), /outside the allowed clusters/);
  assert.match(skipReason('license symptoms of swelling', acfg), /./); // skip pattern still wins
});

test('value types: a site can require a tool or own data, and AI-Overview filtering skips fact-only queries early', () => {
  const tcfg = withDefaults({ ...baseCfg, gates: { ...baseCfg.gates, valueTypes: ['tool', 'data'] } });
  const serp = { hasAio: false, aioText: '', aioRefs: [], organic: [] };
  assert.equal(aioVerdict({ keyword: 'library card renewal rules' }, serp, tcfg).verdict, 'skip');
  assert.equal(aioVerdict({ keyword: 'reading time calculator for novels' }, serp, tcfg).verdict, 'pass');
  assert.equal(aioVerdict({ keyword: 'library card renewal rules' }, serp, baseCfg).verdict, 'pass');
  const v = runGates(mkDraft(), ctx({ cfg: tcfg }));
  assert.match(v.results.find((r) => r.name === 'value').failures.join('\n'), /value type "facts" is not allowed/);
});

test('sources.requireDomains: SERP sources and outbound links are limited to primary domains', () => {
  const rcfg = withDefaults({ ...baseCfg, sources: { requireDomains: ['one.example', '.gov'] } });
  const serp = { organic: [
    { url: 'https://blog.example/post', domain: 'blog.example', rank: 1 },
    { url: 'https://www.one.example/policy', domain: 'www.one.example', rank: 2 },
    { url: 'https://tx.gov/board', domain: 'tx.gov', rank: 3 },
  ] };
  assert.deepEqual(sourceUrls(serp, rcfg), ['https://www.one.example/policy', 'https://tx.gov/board']);
  const g = runGates(mkDraft(), ctx({ cfg: rcfg }));
  assert.match(g.results.find((r) => r.name === 'size').failures.join('\n'), /two\.example is outside sources\.requireDomains/);
  assert.equal(g.pass, false);
});

test('lint-content applies contentRules.healthClaims to MDX entries (and ignores it when off)', () => {
  const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../lint-content.mjs');
  const run = (healthClaims, body) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-health-'));
    fs.mkdirSync(path.join(dir, 'content/guides'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'site.config.json'), JSON.stringify({ authors: [{ slug: 'editorial-team', name: 'T' }], collections: { guides: { dir: 'content/guides', basePath: '/guides', label: 'Guides' } }, contentRules: { healthClaims } }));
    fs.writeFileSync(path.join(dir, 'content/guides/a.mdx'), `---\ntitle: How to verify a license\ndescription: How to check a massage therapist license on a state board website and what the status on the record means for you.\npublishDate: 2099-01-01\nauthor: editorial-team\n---\n\n## Check\n\n${body}\n`);
    const r = spawnSync(process.execPath, [kit], { cwd: dir, encoding: 'utf8' });
    fs.rmSync(dir, { recursive: true, force: true });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  const bad = run(true, 'Studies show drainage reduces swelling.');
  assert.equal(bad.code, 1);
  assert.match(bad.out, /health claim \(studies show\)/);
  assert.match(bad.out, /health claim \(reduces\)/);
  assert.equal(run(false, 'Studies show drainage reduces swelling.').code, 0);
  assert.equal(run(true, 'Look up the license number on the state board website.').code, 0);
});

test('keeps SRC1 import honest', () => assert.match(SRC1, /^https:/));

import { dataAssetSources } from '../lib/dataassets.mjs';

const asset = { file: 'scripts/kit/growth/test/content/prices.json', keywords: ['price'], sourceUrlField: 'source_url', dateField: 'observed_at', matchFields: ['metro'], rowFilter: { listing_status: ['verified'] }, textFields: ['listing_name', 'item', 'price', 'quote_text'] };
const dcfg = withDefaults({ ...baseCfg, content: { ...baseCfg.content, dataAssets: [asset] } });

test('data assets become citable pseudo-sources: verified rows only, narrowed by place, dated', () => {
  const all = dataAssetSources(dcfg, asset, 'massage price by city');
  assert.deepEqual(all.map((s) => s.url).sort(), ['https://alpha.example/pricing', 'https://beta.example/rates']);
  const houston = dataAssetSources(dcfg, asset, 'lymphatic massage cost houston tx');
  assert.deepEqual(houston.map((s) => s.url), ['https://beta.example/rates']);
  assert.match(houston[0].text, /price: 150; quote_text: Session \$150; observed_at: 2026-10-03/);
});

test('data page: numbers verify against the row, an invented number fails, and it must cite a row page', () => {
  const sources = dataAssetSources(dcfg, asset, 'massage price');
  const body = `Prices differ by practitioner, so compare what each one posts before you book.\n\n## Posted rates\n\nAlpha Studio lists a 60 minute session at $130 on [its pricing page](https://alpha.example/pricing).\n\nBeta Clinic lists a session at $150 on [its rates page](https://beta.example/rates).\n\n## What to ask\n\nRead the [guides index](/guides) and the [home page](/) first.`;
  const d = mkDraft({ body, value: { type: 'data', dataFile: asset.file } });
  const ok = runGates(d, ctx({ cfg: dcfg, sources }));
  assert.deepEqual(ok.results.filter((r) => !r.pass && r.name !== 'size').map((r) => `${r.name}: ${r.failures}`), []);
  const invented = runGates({ ...d, body: body.replace('$150', '$145') }, ctx({ cfg: dcfg, sources }));
  assert.match(invented.results.find((r) => r.name === 'factcheck').failures.join('\n'), /"\$145" not found/);
  const noCite = runGates({ ...d, body: 'Prices differ.\n\n## Rates\n\nPrices vary by city and by practitioner.\n\n[guides](/guides) [home](/)' }, ctx({ cfg: dcfg, sources }));
  assert.match(noCite.results.find((r) => r.name === 'value').failures.join('\n'), /must cite at least 1 source page/);
});

test('MUST FAIL: MDX sites reject pipe tables, braces and angle brackets (they break the build or render as raw pipes)', () => {
  const mcfg = withDefaults({ ...baseCfg, content: { ...baseCfg.content, ext: 'mdx' } });
  for (const bad of ['| a | b |\n|---|---|\n| 1 | 2 |', 'Sessions under {price} dollars.', 'Cost <$150 at most places.']) {
    const r = lintDraft(mkDraft({ body: `${goodBody}\n\n${bad}` }), ctx({ cfg: mcfg }));
    assert.equal(r.pass, false, bad);
  }
  assert.equal(lintDraft(mkDraft(), ctx({ cfg: mcfg })).pass, true);
  assert.equal(lintDraft(mkDraft({ body: `${goodBody}\n\n| a | b |\n|---|---|\n| 1 | 2 |` }), ctx()).failures.some((f) => /pipe table/.test(f)), false);
});

import { domainMatches } from '../lib/text.mjs';

test('domain rules match on a label boundary, not a bare string suffix', () => {
  assert.equal(domainMatches('tdlr.texas.gov', '.gov'), true);
  assert.equal(domainMatches('mygov', '.gov'), false);
  assert.equal(domainMatches('www.clt-lana.org', 'clt-lana.org'), true);
  assert.equal(domainMatches('notclt-lana.org', 'clt-lana.org'), false);
});
