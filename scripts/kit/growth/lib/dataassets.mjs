// site-kit v0.1.0
// Registered data assets as citable sources. A data asset is a JSON array of
// rows (e.g. data/price-index.json). Rows that carry a source URL and a date
// become pseudo-sources: text = the row's own quoted facts, keyed by the page
// the row was observed on. The drafter cites that page; the fact-check then
// verifies each number against what the row actually says. Nothing is derived
// or averaged by the model: a number not in a row fails the gate.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { abs } from './config.mjs';
import { tokens } from './text.mjs';

export const findAsset = (cfg, file) => cfg.content.dataAssets.find((a) => a.file === file);

function loadRows(asset) {
  const f = abs(asset.file);
  if (!fs.existsSync(f)) return [];
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const rows = Array.isArray(j) ? j : Array.isArray(j.rows) ? j.rows : [];
  const keep = asset.rowFilter ?? {};
  return rows.filter((r) => Object.entries(keep).every(([k, v]) => (Array.isArray(v) ? v.includes(r[k]) : r[k] === v)));
}

/** Source URLs a data asset can be cited by. */
export const assetSourceUrls = (asset) => [...new Set(loadRows(asset).map((r) => r[asset.sourceUrlField ?? 'source_url']).filter(Boolean))];

/**
 * @returns pseudo-sources [{url, ok, text, kind:'data', rows, chars, sha256, fetchedAt}]
 * `keyword` narrows to rows that mention the keyword's place/term when any do (e.g. a city), else all rows.
 */
export function dataAssetSources(cfg, asset, keyword, { maxRows = 60 } = {}) {
  const urlField = asset.sourceUrlField ?? 'source_url';
  const dateField = asset.dateField ?? 'observed_at';
  const textFields = asset.textFields ?? Object.keys(loadRows(asset)[0] ?? {}).filter((k) => k !== urlField);
  let rows = loadRows(asset).filter((r) => r[urlField]);
  const kt = new Set(tokens(keyword));
  const hits = (r) => new Set((asset.matchFields ?? []).flatMap((f) => tokens(String(r[f] ?? '').replace(/-/g, ' '))).filter((t) => kt.has(t))).size;
  const best = Math.max(0, ...rows.map(hits));
  if (best) rows = rows.filter((r) => hits(r) === best);
  rows = rows.slice(0, maxRows);
  const by = new Map();
  for (const r of rows) by.set(r[urlField], [...(by.get(r[urlField]) ?? []), r]);
  const fetchedAt = new Date().toISOString();
  return [...by.entries()].map(([url, rs]) => {
    const text = rs.map((r) => `${textFields.filter((k) => r[k] != null && r[k] !== '').map((k) => `${k}: ${r[k]}`).join('; ')}; ${dateField}: ${r[dateField] ?? 'unknown'}`).join('\n');
    return { url, ok: true, kind: 'data', status: 200, chars: text.length, rows: rs.length, sha256: crypto.createHash('sha256').update(text).digest('hex'), fetchedAt, text };
  });
}
