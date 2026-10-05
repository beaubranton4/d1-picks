// site-kit v0.1.0
/**
 * Google APIs via a service-account key: Search Console (Search Analytics,
 * URL Inspection, Sitemaps) and GA4 Data API. One copy of the JWT dance
 * instead of one per script.
 *
 * Key path: GSA_KEY_PATH, default ~/.config/gcloud/dugout-edge-sa.json. The
 * key is only read when a request is actually made, never for --help.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const SCOPES = {
  gscRead: 'https://www.googleapis.com/auth/webmasters.readonly',
  gscWrite: 'https://www.googleapis.com/auth/webmasters',
  ga4Read: 'https://www.googleapis.com/auth/analytics.readonly',
};

export const keyPath = () => process.env.GSA_KEY_PATH || path.join(os.homedir(), '.config/gcloud/dugout-edge-sa.json');

export async function getAccessToken(scope) {
  const file = keyPath();
  if (!fs.existsSync(file)) {
    throw new Error(`service-account key not found at ${file} (set GSA_KEY_PATH)`);
  }
  const sa = JSON.parse(fs.readFileSync(file, 'utf8'));
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: sa.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  const jwt = `${unsigned}.${sign.sign(sa.private_key, 'base64url')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`Google auth failed: ${JSON.stringify(j).slice(0, 300)}`);
  return j.access_token;
}

const GSC = 'https://searchconsole.googleapis.com/webmasters/v3';

/** Search Analytics query; `all` pages through results (25k rows per page, 100k cap). */
export async function gscQuery(token, site, body, { all = false } = {}) {
  const rows = [];
  let startRow = 0;
  const limit = body.rowLimit || 25000;
  let capped = false;
  for (;;) {
    const res = await fetch(`${GSC}/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, rowLimit: limit, startRow }),
    });
    if (!res.ok) throw new Error(`GSC ${res.status}: ${(await res.text()).slice(0, 400)}`);
    const got = (await res.json()).rows || [];
    rows.push(...got);
    if (!all || got.length < limit) break;
    startRow += got.length;
    if (startRow >= 100000) {
      capped = true;
      break;
    }
  }
  return Object.assign(rows, { capped });
}

export async function inspectUrl(token, site, url) {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: site }),
  });
  if (!res.ok) return { url, error: `${res.status} ${(await res.text()).slice(0, 200)}` };
  const i = (await res.json()).inspectionResult?.indexStatusResult || {};
  return {
    url,
    verdict: i.verdict,
    coverageState: i.coverageState,
    pageFetchState: i.pageFetchState,
    robotsTxtState: i.robotsTxtState,
    indexingState: i.indexingState,
    googleCanonical: i.googleCanonical,
    userCanonical: i.userCanonical,
    lastCrawlTime: i.lastCrawlTime,
  };
}

export async function gscSitemaps(token, site, { submit } = {}) {
  const base = `${GSC}/sites/${encodeURIComponent(site)}/sitemaps`;
  if (submit) {
    const res = await fetch(`${base}/${encodeURIComponent(submit)}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`sitemap submit ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const res = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`sitemap list ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).sitemap || [];
}

export async function ga4Report(token, property, body) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GA4 ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return res.json();
}

export { pool } from './pool.mjs';
