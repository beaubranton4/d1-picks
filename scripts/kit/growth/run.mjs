#!/usr/bin/env node
// site-kit v0.1.0
/**
 * The weekly growth loop: brakes -> measure -> pick topics -> AI-Overview
 * filter -> cannibalization -> draft -> gates -> publish files.
 * The workflow wraps the resulting files in a PR.
 *
 *   node scripts/kit/growth/run.mjs --dry-run            fixtures only, no keys, writes to a scratch dir
 *   node scripts/kit/growth/run.mjs                      live (needs the 5 secrets; otherwise a clear no-op)
 *   node scripts/kit/growth/run.mjs --fixtures DIR       offline replay of saved API responses, writes for real
 */
import fs from 'node:fs';
import path from 'node:path';
import { cli } from './lib/cli.mjs';
import { abs, loadConfig, missingSecrets } from './lib/config.mjs';
import { Ledger, CapError } from './lib/ledger.mjs';
import { makeDfs, parseSerp, parseSuggestions } from './lib/dfs.mjs';
import { makeGoogle } from './lib/google.mjs';
import { makeAnthropic } from './lib/anthropic.mjs';
import { loadState, saveState, scanPosts } from './lib/content.mjs';
import { addDays, isoWeek, todayIso } from './lib/text.mjs';
import { makeWriter } from './io.mjs';
import { evaluateBrakes } from './brakes.mjs';
import { measurePages } from './measure.mjs';
import { aioVerdict, gscOpportunities, rankCandidates, sourceUrls } from './topics.mjs';
import { nextReleaseDate } from './calendar.mjs';
import { draftTopic, readVoice } from './draft.mjs';
import { publishDraft } from './publish.mjs';
import { logLines, weeklyReport } from './report.mjs';

const { values: a } = cli(
  `
Usage: node run.mjs [--dry-run] [--fixtures DIR] [--out DIR] [--keyword "kw"] [--date YYYY-MM-DD]
                    [--stage all|measure|pick] [--max N] [--pr-body FILE] [--resume] [--ledger-add svc,endpoint,cost,note]

  --dry-run     replay fixtures for every API and write nothing to the repo (scratch dir instead). Needs no keys.
  --fixtures    replay saved API responses from DIR (writes for real; no keys needed)
  --keyword     skip discovery and evaluate this one topic (still SERP-checked, drafted and gated)
  --stage pick  stop after topic selection and AI-Overview filtering (no drafting, no Anthropic spend)
  --resume      clear an auto-pause
  --ledger-add  record an API cost made outside the scripts (e.g. via the MCP tool)
`,
  { 'dry-run': { type: 'boolean' }, fixtures: { type: 'string' }, out: { type: 'string' }, keyword: { type: 'string' }, date: { type: 'string' }, stage: { type: 'string' }, max: { type: 'string' }, resume: { type: 'boolean' }, config: { type: 'string' }, 'ledger-add': { type: 'string' }, 'pr-body': { type: 'string' } },
);

const cfg = loadConfig(a.config ? path.resolve(a.config) : undefined);
const dryRun = Boolean(a['dry-run']);
const today = a.date ?? todayIso();
const fixturesDir = a.fixtures ? path.resolve(a.fixtures) : dryRun ? abs(cfg.paths.fixtures ?? 'scripts/kit/growth/fixtures') : null;
const offline = Boolean(fixturesDir);

if (!offline && !a['ledger-add'] && !a.resume) {
  const missing = missingSecrets();
  if (missing.length) {
    console.log(`[growth] not running: missing secret(s) ${missing.join(', ')}. Set them as GitHub Actions secrets (see docs/growth/README.md). Nothing was done and nothing was spent.`);
    process.exit(0);
  }
}

const W = makeWriter({ dryRun, outRoot: a.out ? path.resolve(a.out) : null });
const ledger = Ledger.forConfig(cfg, { persist: !dryRun });
if (a['ledger-add']) {
  const [service, endpoint, cost, ...note] = a['ledger-add'].split(',');
  ledger.record({ service, endpoint, cost: Number(cost), note: note.join(',') || 'recorded from outside the scripts' });
  console.log(`ledger: +$${cost} ${service}`);
  process.exit(0);
}

const state = loadState(cfg);
if (a.resume) {
  state.paused = null;
  saveState(cfg, state);
  console.log('[growth] auto-pause cleared');
  process.exit(0);
}

const run = { dryRun, today, published: [], dropped: [], skipped: [], extend: [], decisions: [], brakes: null };
const google = makeGoogle({ cfg, fixturesDir });
const dfs = makeDfs({ cfg, ledger, fixturesDir });
const anthropic = makeAnthropic({ cfg, ledger, fixturesDir });
const posts = scanPosts(cfg);

// 1. Measure + decide (read-only against Search Console) -------------------
let rows = [];
let qpRows = [];
try {
  qpRows = await google.queryPages(addDays(today, -90), addDays(today, -2));
  const m = await measurePages({ cfg, state, google, today, queryPageRows: qpRows });
  rows = m.rows;
  run.decisions = m.decisions;
  for (const [slug, rec] of Object.entries(m.updated)) state.pages[slug] = rec;
  for (const d of m.decisions) {
    if (['expand', 'refresh', 'merge', 'prune', 'investigate-indexing'].includes(d.action)) {
      state.refreshQueue = (state.refreshQueue ?? []).filter((t) => !(t.slug === d.slug && t.action === d.action));
      state.refreshQueue.push({ slug: d.slug, page: d.path, action: d.action, reason: d.reason, since: today });
    }
  }
} catch (e) {
  run.measureError = e.message;
  console.error(`[growth] measure stage failed: ${e.message}`);
}

// 2. Brakes (after measuring, so fresh indexing reads count) ---------------
run.brakes = await evaluateBrakes({ cfg, state, google, today, posts });
const dataBrake = run.brakes.reasons.find((r) => /% of \d+ pages|impressions fell/.test(r));
if (dataBrake && !state.paused && !dryRun) state.paused = { at: today, reason: dataBrake };
// A dry run ignores the kill switch (so the shipped fixtures can exercise the pipeline) but not data brakes.
const halted = run.brakes.halt && !(dryRun && run.brakes.reasons.every((r) => r.startsWith('kill switch')));

// 3-6. Pick, filter, draft, gate, publish ---------------------------------
const stage = a.stage ?? 'all';
if (!halted && stage !== 'measure') {
  try {
    const maxPages = Number(a.max ?? cfg.caps.perRunPages);
    const publishedKeywords = (() => {
      const raw = cfg.content.publishedLog && W.read(cfg.content.publishedLog);
      return raw ? (JSON.parse(raw).published ?? []).map((p) => ({ keyword: p.keyword, slug: p.slug, path: p.slug })) : [];
    })();
    const recentClusters = Object.values(state.pages).sort((x, y) => y.publishDate.localeCompare(x.publishDate)).slice(0, 2).map((p) => p.cluster);

    let dfsRows = [];
    let gscGaps = [];
    if (a.keyword) {
      dfsRows = [{ keyword: a.keyword, volume: 0, kd: null, intent: 'unknown', source: 'manual' }];
    } else {
      const opp = gscOpportunities(qpRows, posts, cfg);
      gscGaps = opp.gaps.slice(0, 15);
      for (const s of opp.striking.slice(0, 10)) {
        state.refreshQueue = (state.refreshQueue ?? []).filter((t) => !(t.page === s.page && t.action === 'refresh'));
        state.refreshQueue.push({ page: s.page, action: 'refresh', reason: `"${s.query}" at position ${s.position.toFixed(1)} with ${s.impressions} impressions`, since: today });
      }
      const seedLog = (state.seedUse ??= {});
      const seeds = cfg.clusters.filter((c) => c.favor !== false).flatMap((c) => c.seeds.map((s) => ({ s, c: c.name, last: seedLog[s] ?? '0' })));
      seeds.sort((x, y) => x.last.localeCompare(y.last));
      const picked = [];
      for (const x of seeds) if (picked.length < cfg.dataforseo.seedsPerRun && !picked.some((p) => p.c === x.c)) picked.push(x);
      for (const x of picked) {
        dfsRows.push(...parseSuggestions(await dfs.suggestions(x.s)));
        seedLog[x.s] = today;
      }
    }
    const ranked = rankCandidates({ dfs: dfsRows, gaps: gscGaps, posts, publishedKeywords, cfg, recentClusters });
    run.skipped.push(...ranked.skipped);
    run.extend.push(...ranked.extend);
    for (const e of ranked.extend) {
      state.refreshQueue = (state.refreshQueue ?? []).filter((t) => !(t.page === e.page && t.action === 'extend' && t.reason.startsWith(e.keyword)));
      state.refreshQueue.push({ page: e.page, slug: e.slug, action: 'extend', reason: `${e.keyword}: ${e.reason}`, since: today });
    }
    run.candidates = ranked.candidates.slice(0, 10).map((c) => ({ keyword: c.keyword, cluster: c.cluster, volume: c.volume, kd: c.kd, score: +c.score.toFixed(3), source: c.source }));

    // SERP + AI-Overview filter on the shortlist only
    const winners = [];
    for (const c of ranked.candidates.slice(0, cfg.dataforseo.serpTopN)) {
      if (winners.length >= maxPages) break;
      const serp = parseSerp(await dfs.serp(c.keyword));
      const v = aioVerdict(c, serp, cfg);
      if (v.verdict === 'skip') {
        run.skipped.push({ keyword: c.keyword, stage: 'ai-overview', reason: v.reason });
        continue;
      }
      winners.push({ ...c, aio: v, serp });
    }
    run.winners = winners.map((w) => ({ keyword: w.keyword, cluster: w.cluster, angle: w.aio.angle.type, aio: w.aio.reason }));

    if (stage !== 'pick') {
      const scheduled = [...posts.filter((p) => p.release).map((p) => ({ release: p.release, cluster: p.data?.cluster ?? null })), ...Object.values(state.pages).map((p) => ({ release: p.publishDate, cluster: p.cluster }))];
      const knownPaths = new Set([...cfg.content.knownPaths, ...cfg.content.tools.map((t) => t.path), ...posts.filter((p) => p.released).map((p) => p.path)]);
      const voice = readVoice(cfg);
      for (const w of winners) {
        const date = nextReleaseDate({ scheduled, cfg, cluster: w.cluster, today });
        if (!date) {
          run.dropped.push({ keyword: w.keyword, reason: 'release calendar is full for the horizon (weekly cap)' });
          continue;
        }
        const ctxBase = { cfg, today, posts, knownPaths, publishedKeywords, reservedSlugs: new Set(posts.map((p) => p.slug)) };
        let r;
        try {
          r = await draftTopic({ cfg, topic: { keyword: w.keyword, cluster: w.cluster, source: w.source }, angle: w.aio.angle, urls: sourceUrls(w.serp, cfg), posts, ctxBase, anthropic, fixturesDir, voice });
        } catch (e) {
          run.dropped.push({ keyword: w.keyword, reason: `draft error: ${e.message}` });
          if (e instanceof CapError) break;
          continue;
        }
        if (!r.draft) {
          run.dropped.push({ keyword: w.keyword, reason: r.dropReason ?? 'gates failed', gates: r.gates?.results?.filter((x) => !x.pass) });
          continue;
        }
        const rec = publishDraft({ cfg, W, draft: r.draft, gates: r.gates, sources: r.sources, date, today, cost: r.cost, attempts: r.attempts, model: r.model ?? 'fixture' });
        state.pages[rec.slug] = rec;
        scheduled.push({ release: date, cluster: w.cluster });
        run.published.push(rec);
      }
    }
  } catch (e) {
    run.error = e.message;
    console.error(`[growth] ${e instanceof CapError ? 'spend cap reached' : 'run failed'}: ${e.message}`);
  }
}

run.halted = halted;
// 7. Persist log, report, state ---------------------------------------------
state.lastRun = today;
const lines = logLines({ today, run });
const logRel = path.join(cfg.paths.dir, 'log.md');
const existing = W.read(logRel) ?? '# Growth log\n\nEvery decision the loop makes, newest last.\n';
W.write(logRel, `${existing.trimEnd()}\n${lines.length ? `\n## ${today}\n\n${lines.join('\n')}\n` : ''}`);
W.write(path.join(cfg.paths.dir, `report-${isoWeek(today).replace('-W', '-')}.md`), weeklyReport({ cfg, today, run, rows, ledger, state }));
W.write(path.join(cfg.paths.dir, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);

if (a['pr-body'] && run.published.length) {
  const w = run.winners ?? [];
  const body = run.published.map((p) => {
    const win = w.find((x) => x.keyword === p.keyword);
    return `### ${p.path}\n\n- Target keyword: ${p.keyword} (cluster ${p.cluster}, source ${p.source})\n- Release date: ${p.publishDate} (future-dated; unreleased URLs 404)\n- Page value: ${p.angle}\n- AI Overview verdict: ${win?.aio ?? 'n/a'}\n- Gates: ${Object.entries(p.gates).map(([k, v]) => `${k} ${v.pass ? 'pass' : 'FAIL'}`).join(', ')}; ${p.verifiedFacts.length} verified fact blocks\n- Cost: $${p.cost}\n- Sources and gate inputs: \`${cfg.paths.dir}/sources/${p.slug}/\`\n`;
  });
  fs.writeFileSync(a['pr-body'], `Automated growth-loop page. Every gate passed (lint, fact-check against saved sources, duplicates, value, size). CI re-runs them from the saved sources.\n\n${body.join('\n')}\nKill switch: \`enabled\` in growth.config.json.\n`);
}

console.log(
  JSON.stringify(
    {
      dryRun,
      writtenTo: W.root,
      halted,
      brakes: run.brakes.reasons,
      measured: rows.length,
      decisions: run.decisions.map((d) => `${d.path}: ${d.action}`),
      candidates: run.candidates,
      skipped: run.skipped.map((s) => `${s.keyword} [${s.stage}]: ${s.reason}`),
      winners: run.winners,
      published: run.published.map((p) => ({ path: p.path, publishDate: p.publishDate, cost: p.cost })),
      dropped: run.dropped,
      spend: { dataforseo: ledger.spent('dataforseo'), anthropic: ledger.spent('anthropic') },
    },
    null,
    2,
  ),
);
