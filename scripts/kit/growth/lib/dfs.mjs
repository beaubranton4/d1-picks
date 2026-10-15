// site-kit v0.1.0
// DataForSEO client: live REST (basic auth) or fixture replay. Every call is
// priced from the API's own `cost` field and written to the ledger, and checked
// against the monthly cap BEFORE it is made.
import fs from 'node:fs';
import path from 'node:path';
import { slugify } from './text.mjs';

const BASE = 'https://api.dataforseo.com/';

export function makeDfs({ cfg, ledger, fixturesDir = null, env = process.env }) {
  const cap = cfg.caps.monthlyUsd.dataforseo;
  const live = !fixturesDir;

  async function call(kind, apiPath, body, { fixtureKey, estimate = 0.02 } = {}) {
    if (!live) {
      const tryFiles = [`${kind}-${fixtureKey}.json`, `${kind}-default.json`].map((f) => path.join(fixturesDir, 'dfs', f));
      const f = tryFiles.find((x) => fs.existsSync(x));
      if (!f) throw new Error(`no DataForSEO fixture for ${kind}/${fixtureKey} in ${fixturesDir}/dfs`);
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      ledger.record({ service: 'dataforseo', endpoint: apiPath, cost: 0, note: `fixture ${path.basename(f)}` });
      return j;
    }
    ledger.assertWithin('dataforseo', estimate, cap);
    const login = env.DATAFORSEO_LOGIN;
    const password = env.DATAFORSEO_PASSWORD;
    if (!login || !password) throw new Error('DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD not set');
    const res = await fetch(BASE + apiPath.replace(/^\/+/, ''), {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([body]),
    });
    const j = await res.json();
    const cost = Number(j.cost ?? 0);
    ledger.record({ service: 'dataforseo', endpoint: apiPath, cost, note: JSON.stringify(body).slice(0, 120) });
    if (j.status_code !== 20000) throw new Error(`DataForSEO ${j.status_code}: ${j.status_message}`);
    const task = j.tasks?.[0];
    if (!task || task.status_code !== 20000) throw new Error(`DataForSEO task ${task?.status_code}: ${task?.status_message}`);
    return j;
  }

  const loc = { location_code: cfg.dataforseo.locationCode, language_code: cfg.dataforseo.languageCode };

  return {
    live,
    balance: async () => {
      if (!live) return { fixture: true };
      const res = await fetch(`${BASE}v3/appendix/user_data`, { headers: { Authorization: `Basic ${Buffer.from(`${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`).toString('base64')}` } });
      const j = await res.json();
      return j.tasks?.[0]?.result?.[0]?.money ?? null;
    },
    /** Real keyword difficulty comes from labs, never the Ads competition score. */
    suggestions: (seed) =>
      call('suggestions', 'v3/dataforseo_labs/google/keyword_suggestions/live', {
        keyword: seed,
        ...loc,
        limit: cfg.dataforseo.suggestionsLimit,
        filters: [['keyword_info.search_volume', '>', cfg.dataforseo.minVolume], 'and', ['keyword_properties.keyword_difficulty', '<', cfg.dataforseo.maxKd]],
        order_by: ['keyword_info.search_volume,desc'],
      }, { fixtureKey: slugify(seed), estimate: cfg.dataforseo.estimates.keyword_suggestions }),
    serp: (keyword) =>
      call('serp', 'v3/serp/google/organic/live/advanced', { keyword, ...loc, depth: 10, load_async_ai_overview: true }, { fixtureKey: slugify(keyword), estimate: cfg.dataforseo.estimates.serp_advanced_aio }),
  };
}

/** Flatten a labs keyword_suggestions response into candidate rows. */
export function parseSuggestions(resp) {
  const items = resp?.tasks?.[0]?.result?.[0]?.items ?? resp?.items ?? [];
  return items.map((it) => ({
    keyword: it.keyword,
    volume: it.keyword_info?.search_volume ?? 0,
    kd: it.keyword_properties?.keyword_difficulty ?? null,
    cpc: it.keyword_info?.cpc ?? null,
    intent: it.search_intent_info?.main_intent ?? 'unknown',
  }));
}

/** Pull what the pipeline needs from a SERP advanced response. */
export function parseSerp(resp) {
  const r = resp?.tasks?.[0]?.result?.[0] ?? resp?.result?.[0] ?? resp;
  const items = r?.items ?? [];
  const aio = items.find((i) => i.type === 'ai_overview');
  const organic = items.filter((i) => i.type === 'organic');
  const aioText = aio ? (aio.markdown ?? (aio.items ?? []).map((x) => x.text).filter(Boolean).join('\n') ?? '') : '';
  return {
    hasAio: Boolean(aio) || (r?.item_types ?? []).includes('ai_overview'),
    aioText: aioText || '',
    aioRefs: (aio?.references ?? []).map((x) => x.domain ?? x.source ?? x.url).filter(Boolean),
    organic: organic.map((o) => ({ rank: o.rank_group, url: o.url, domain: o.domain, title: o.title })),
  };
}
