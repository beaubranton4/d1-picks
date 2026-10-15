// site-kit v0.1.0
// Search Console, URL Inspection and GA4 via a service account. The key comes
// from GSC_SA_KEY_BASE64 (decoded in memory, never written to disk) or from
// GSA_KEY_PATH. With `fixturesDir` set every call replays JSON from disk, so
// dry runs need no key and touch no live property.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCOPES = {
  gsc: 'https://www.googleapis.com/auth/webmasters.readonly',
  ga4: 'https://www.googleapis.com/auth/analytics.readonly',
};

function loadKey(env) {
  if (env.GSC_SA_KEY_BASE64) return JSON.parse(Buffer.from(env.GSC_SA_KEY_BASE64, 'base64').toString('utf8'));
  const file = env.GSA_KEY_PATH || path.join(os.homedir(), '.config/gcloud/dugout-edge-sa.json');
  if (!fs.existsSync(file)) throw new Error('no service-account key: set GSC_SA_KEY_BASE64 (or GSA_KEY_PATH)');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function token(scope, env) {
  const sa = loadKey(env);
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`Google auth failed: ${JSON.stringify(j).slice(0, 200)}`);
  return j.access_token;
}

export function makeGoogle({ cfg, fixturesDir = null, env = process.env }) {
  const live = !fixturesDir;
  const fx = (name) => {
    const f = path.join(fixturesDir, 'google', `${name}.json`);
    if (!fs.existsSync(f)) throw new Error(`no Google fixture ${f}`);
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  };
  const site = cfg.site.gscProperty;

  async function sa(body) {
    const t = await token(SCOPES.gsc, env);
    const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GSC ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return (await res.json()).rows ?? [];
  }

  return {
    live,
    /** Rows {keys:[query,page], clicks, impressions, ctr, position}. */
    queryPages: async (startDate, endDate, rowLimit = 5000) => (live ? sa({ startDate, endDate, dimensions: ['query', 'page'], rowLimit }) : fx('query-pages')),
    /** Per-page totals since `startDate` for one URL. */
    pageTotals: async (url, startDate, endDate) => {
      if (!live) return fx('page-totals')[url] ?? { clicks: 0, impressions: 0, position: null, ctr: 0 };
      const rows = await sa({ startDate, endDate, dimensions: ['page'], dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'equals', expression: url }] }], rowLimit: 1 });
      return rows[0] ? { clicks: rows[0].clicks, impressions: rows[0].impressions, position: rows[0].position, ctr: rows[0].ctr } : { clicks: 0, impressions: 0, position: null, ctr: 0 };
    },
    /** Site-wide daily-window totals for the impression-drop brake. */
    siteTotals: async (startDate, endDate) => {
      if (!live) return fx('site-totals')[`${startDate}`] ?? fx('site-totals').default;
      const rows = await sa({ startDate, endDate, rowLimit: 1 });
      return rows[0] ? { clicks: rows[0].clicks, impressions: rows[0].impressions } : { clicks: 0, impressions: 0 };
    },
    /** URL Inspection: { indexed: bool|null, verdict, coverageState }. */
    inspect: async (url) => {
      if (!live) return fx('inspect')[url] ?? { indexed: null, verdict: 'UNKNOWN', coverageState: 'fixture has no entry' };
      const t = await token(SCOPES.gsc, env);
      const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionUrl: url, siteUrl: site }),
      });
      if (!res.ok) throw new Error(`Inspect ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const r = (await res.json()).inspectionResult?.indexStatusResult ?? {};
      return { indexed: r.verdict === 'PASS', verdict: r.verdict ?? 'UNKNOWN', coverageState: r.coverageState ?? '' };
    },
    /** GA4 engaged sessions per landing page (best effort; null when unavailable). */
    ga4Landing: async (pagePath, startDate, endDate) => {
      if (!live) return fx('ga4')[pagePath] ?? null;
      const prop = env.GA4_PROPERTY_ID || cfg.site.ga4PropertyId;
      if (!prop) return null;
      const t = await token(SCOPES.ga4, env);
      const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${prop}:runReport`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'landingPage' }],
          metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }],
          dimensionFilter: { filter: { fieldName: 'landingPage', stringFilter: { matchType: 'EXACT', value: pagePath } } },
        }),
      });
      if (!res.ok) return null;
      const r = (await res.json()).rows?.[0]?.metricValues;
      return r ? { sessions: Number(r[0].value), engagedSessions: Number(r[1].value) } : { sessions: 0, engagedSessions: 0 };
    },
  };
}
