// site-kit v0.1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withDefaults } from '../lib/config.mjs';
import { Ledger, CapError } from '../lib/ledger.mjs';
import { parseSerp } from '../lib/dfs.mjs';
import { aioVerdict, angleFor, gscOpportunities, rankCandidates, skipReason, sourceUrls } from '../topics.mjs';
import { nextReleaseDate } from '../calendar.mjs';
import { decide, dueCheckpoints } from '../decide.mjs';
import { evaluateBrakes } from '../brakes.mjs';
import { factualTokens, canon } from '../gates/factcheck.mjs';
import { markdownToHtml } from '../lib/html.mjs';
import { isoWeek } from '../lib/text.mjs';
import { cfg } from './helpers.mjs';

const aioSerp = { hasAio: true, aioText: 'A library card number is the unique identifier printed on your card. '.repeat(5), aioRefs: ['ala.example'], organic: [] };

test('MUST SKIP: a topic an AI Overview answers, with no tool/data/facts angle', () => {
  const v = aioVerdict({ keyword: 'what is a library card number' }, aioSerp, cfg);
  assert.equal(v.verdict, 'skip');
  assert.match(v.reason, /AI Overview answers it/);
});

test('an AI Overview topic is kept when a tool angle exists', () => {
  const v = aioVerdict({ keyword: 'library fine calculator' }, aioSerp, cfg);
  assert.equal(v.verdict, 'pass');
  assert.equal(v.angle.type, 'tool');
});

test('no AI Overview passes', () => {
  assert.equal(aioVerdict({ keyword: 'anything goes here' }, { hasAio: false, aioText: '', aioRefs: [], organic: [] }, cfg).verdict, 'pass');
});

test('parseSerp reads ai_overview presence and organic urls', () => {
  const s = parseSerp({ tasks: [{ result: [{ item_types: ['ai_overview', 'organic'], items: [{ type: 'ai_overview', markdown: 'text' }, { type: 'organic', rank_group: 1, url: 'https://a.example/x', domain: 'a.example' }] }] }] });
  assert.equal(s.hasAio, true);
  assert.equal(s.organic.length, 1);
});

test('skip list, short queries and angle detection', () => {
  assert.match(skipReason('library near me today', cfg), /skip pattern/);
  assert.match(skipReason('library card', cfg), /fewer than 3 words/);
  assert.equal(skipReason('how to renew library card', cfg), null);
  assert.equal(angleFor('library fine calculator', cfg).type, 'tool');
  assert.equal(angleFor('random topic words', cfg), null);
});

test('candidates: duplicates dropped, overlaps become extend-not-create, skip reasons recorded', () => {
  const posts = [{ title: 'How to Renew a Library Card', slug: 'renew-card', keywords: [], text: '', path: '/guides/renew-card', released: true }];
  const r = rankCandidates({ dfs: [{ keyword: 'how to renew a library card', volume: 900, kd: 10, intent: 'informational' }, { keyword: 'library borrowing limits by state', volume: 500, kd: 10, intent: 'informational' }, { keyword: 'cheap flights near me', volume: 5000, kd: 5 }], posts, cfg });
  assert.deepEqual(r.candidates.map((c) => c.keyword), ['library borrowing limits by state']);
  assert.equal(r.skipped.length, 2);
  assert.ok(r.skipped.every((s) => s.reason));
});

test('Search Console: striking distance uses page-level position; gaps are queries no page covers', () => {
  const posts = [{ path: '/guides/a', title: 'A', slug: 'a', keywords: [] }];
  const rows = [
    { keys: ['q one two', '/guides/a'], clicks: 2, impressions: 100, position: 12 },
    { keys: ['gap query three words', 'https://test.example/'], clicks: 0, impressions: 80, position: 60 },
  ];
  const { striking, gaps } = gscOpportunities(rows, posts, cfg);
  assert.equal(striking[0].page, '/guides/a');
  assert.equal(gaps[0].keyword, 'gap query three words');
});

test('source urls drop excluded domains', () => {
  const c = withDefaults({ ...cfg, sources: { excludeDomains: ['bad.example'], preferDomains: ['.gov'] } });
  const urls = sourceUrls({ organic: [{ rank: 1, url: 'https://bad.example/x', domain: 'bad.example' }, { rank: 2, url: 'https://x.com/y', domain: 'x.com' }, { rank: 3, url: 'https://a.gov/z', domain: 'a.gov' }] }, c);
  assert.deepEqual(urls, ['https://a.gov/z', 'https://x.com/y']);
});

test('calendar: never more than the weekly cap, never backdated, clusters interleaved', () => {
  const today = '2026-10-05';
  const scheduled = [];
  const got = [];
  for (let i = 0; i < 8; i++) {
    const d = nextReleaseDate({ scheduled, cfg, cluster: `c${i % 4}`, today });
    assert.ok(d >= '2026-10-08', `not before the lead time: ${d}`);
    scheduled.push({ release: d, cluster: `c${i % 4}` });
    got.push(d);
  }
  const perWeek = {};
  for (const d of got) perWeek[isoWeek(d)] = (perWeek[isoWeek(d)] ?? 0) + 1;
  assert.ok(Object.values(perWeek).every((n) => n <= 3), JSON.stringify(perWeek));
  assert.equal(new Set(got).size, got.length);
});

test('calendar: a week already at the cap pushes the next page to a later week', () => {
  const scheduled = [{ release: '2026-10-06' }, { release: '2026-10-08' }, { release: '2026-10-10' }];
  assert.ok(nextReleaseDate({ scheduled, cfg, today: '2026-10-05' }) >= '2026-10-12');
});

test('calendar: same cluster is not scheduled twice in one week', () => {
  const d = nextReleaseDate({ scheduled: [{ release: '2026-10-08', cluster: 'a' }], cfg, cluster: 'a', today: '2026-10-05' });
  assert.notEqual(isoWeek(d), isoWeek('2026-10-08'));
});

test('ledger enforces the monthly cap before a call', () => {
  const l = new Ledger({ persist: false });
  l.record({ service: 'dataforseo', cost: 2.99 });
  assert.throws(() => l.assertWithin('dataforseo', 0.05, 3), CapError);
  assert.doesNotThrow(() => l.assertWithin('dataforseo', 0.005, 3));
});

const rec = { publishDate: '2026-08-01' };
test('decide: waits before the first checkpoint', () => {
  assert.equal(decide({ record: rec, today: '2026-08-10', metrics: { clicks: 0, impressions: 0, position: null }, indexed: null }, cfg).action, 'wait');
});
test('decide: prune at 60 days with no traction', () => {
  assert.equal(decide({ record: rec, today: '2026-10-05', metrics: { clicks: 0, impressions: 3, position: 60 }, indexed: true }, cfg).action, 'prune');
});
test('decide: expand when ranking top 10 with clicks; refresh in striking distance', () => {
  assert.equal(decide({ record: rec, today: '2026-08-20', metrics: { clicks: 9, impressions: 300, position: 6 }, indexed: true }, cfg).action, 'expand');
  assert.equal(decide({ record: rec, today: '2026-08-20', metrics: { clicks: 1, impressions: 200, position: 14 }, indexed: true }, cfg).action, 'refresh');
});
test('decide: merge when a stronger page of ours wins the same queries', () => {
  const d = decide({ record: rec, today: '2026-08-20', metrics: { clicks: 0, impressions: 40, position: 30 }, indexed: true, rivals: [{ page: '/guides/x', clicks: 5, impressions: 400 }] }, cfg);
  assert.equal(d.action, 'merge');
});
test('decide: unindexed at 28 days is investigated', () => {
  assert.equal(decide({ record: rec, today: '2026-08-30', metrics: { clicks: 0, impressions: 0, position: null }, indexed: false }, cfg).action, 'investigate-indexing');
});
test('checkpoints are only due once', () => {
  assert.deepEqual(dueCheckpoints({ publishDate: '2026-08-01', measurements: [{ checkpoint: 14 }] }, '2026-09-01', cfg), [28]);
});

test('brakes: kill switch, low indexed share, impression drop, pause file semantics', async () => {
  const state = { pages: {} };
  const off = await evaluateBrakes({ cfg: withDefaults({ ...cfg, enabled: false }), state, google: null, today: '2026-10-05' });
  assert.match(off.reasons[0], /kill switch/);
  for (let i = 0; i < 4; i++) state.pages[`p${i}`] = { publishDate: '2026-08-01', measurements: [{ indexed: i === 0 }] };
  const idx = await evaluateBrakes({ cfg, state, google: null, today: '2026-10-05' });
  assert.match(idx.reasons.join(), /25% of 4 pages/);
  const drop = await evaluateBrakes({ cfg, state: { pages: {} }, google: { siteTotals: async (s) => (s < '2026-09-08' ? { impressions: 1000 } : { impressions: 300 }) }, today: '2026-10-05' });
  assert.match(drop.reasons.join(), /impressions fell 70%/);
  const manual = await evaluateBrakes({ cfg, state: { pages: {} }, google: null, today: '2026-10-05', env: { GROWTH_MANUAL_ACTION: '1' } });
  assert.match(manual.reasons.join(), /manual action/);
  const paused = await evaluateBrakes({ cfg, state: { pages: {}, paused: { at: '2026-10-01', reason: 'x' } }, google: null, today: '2026-10-05' });
  assert.match(paused.reasons.join(), /auto-paused/);
});

test('number tokens and canonical forms', () => {
  assert.equal(canon('$5.25k'), '5250');
  assert.equal(canon('1,500 days'), '1500');
  assert.deepEqual(factualTokens('Pay $2 or 10% of 5,250 items in 2031', { allowYears: [] }).map((t) => t.raw), ['$2', '10%', '5,250', '2031']);
});

test('markdown to html: headings get ids, tables and links render, text is escaped', () => {
  const h = markdownToHtml('## A heading\n\nText with <b> & [link](https://x.example).\n\n| a | b |\n|---|---|\n| 1 | 2 |');
  assert.match(h, /<h2 id="a-heading">/);
  assert.match(h, /&lt;b&gt; &amp; <a href="https:\/\/x.example">link<\/a>/);
  assert.match(h, /<table>.*<td>1<\/td>/);
});

test('model ladder: cheapest model first, escalates only when gates fail, cost ledgered', async () => {
  const { draftTopic } = await import('../draft.mjs');
  const { goodBody, SRC1, SRC2, ctx, mkDraft } = await import('./helpers.mjs');
  const { fetchSources } = await import('../lib/sources.mjs');
  void fetchSources;
  const good = JSON.stringify({ ...mkDraft().frontmatter, body: goodBody, value: { type: 'facts' }, sources_used: [SRC1, SRC2] });
  const bad = JSON.stringify({ ...mkDraft().frontmatter, body: goodBody.replace('$2', '$9'), value: { type: 'facts' } });
  const used = [];
  const replies = { 0: [bad, bad], 1: [good] };
  const counters = { 0: 0, 1: 0 };
  const anthropic = { async complete({ rung }) { used.push(cfg.anthropic.models[rung].model); return { model: cfg.anthropic.models[rung].model, text: replies[rung][counters[rung]++], cost: 0.01 }; } };
  const fetchImpl = async (url) => ({ ok: true, status: 200, headers: { get: () => 'text/plain' }, text: async () => (url === SRC1 ? 'Cards expire after 3 years. Renewal costs $2 and opens 30 days before expiry. '.repeat(10) : 'Patrons may borrow 50 items for 21 days. The late fee is $0.25 per day. '.repeat(10)) });
  const r = await draftTopic({ cfg, topic: { keyword: 'how to renew library card online', cluster: 'a' }, angle: { type: 'facts' }, urls: [SRC1, SRC2], posts: [], ctxBase: ctx(), anthropic, fixturesDir: null, fetchImpl, voice: 'plain' });
  assert.ok(r.draft, r.dropReason);
  assert.deepEqual(used, ['claude-haiku-4-5', 'claude-haiku-4-5', 'claude-sonnet-5-5']);
});

test('the Anthropic cap stops a call before it is made', async () => {
  const { makeAnthropic } = await import('../lib/anthropic.mjs');
  const l = new Ledger({ persist: false });
  l.record({ service: 'anthropic', cost: 1.99 });
  const c = withDefaults({ ...cfg, caps: { ...cfg.caps, monthlyUsd: { dataforseo: 3, anthropic: 2 } } });
  const a = makeAnthropic({ cfg: c, ledger: l, env: { ANTHROPIC_API_KEY: 'x' } });
  await assert.rejects(() => a.complete({ system: 's', messages: [] }), CapError);
});
