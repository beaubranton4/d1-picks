// site-kit v0.1.0
// Fetch cited source pages and save their text, so the fact-check gate can
// verify against what was actually fetched (and a reviewer can audit it).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ', '&ndash;': '-', '&mdash;': '-' };

export function htmlToText(html) {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|br|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, g) => {
      if (ENT[m]) return ENT[m];
      if (g[0] === '#') {
        const cp = g[1].toLowerCase() === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
        return Number.isFinite(cp) ? String.fromCodePoint(cp) : ' ';
      }
      return ' ';
    })
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

export const normUrl = (u) => String(u).replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase();

/**
 * @param {string[]} urls
 * @param {{fetchImpl?:Function, fixturesDir?:string|null, minChars?:number}} o
 * @returns manifest entries {url, ok, status, chars, sha256, text?, error?}
 */
export async function fetchSources(urls, { fetchImpl = fetch, fixturesDir = null, minChars = 600 } = {}) {
  const out = [];
  for (const url of [...new Set(urls)]) {
    try {
      let status = 200;
      let body;
      if (fixturesDir) {
        const f = path.join(fixturesDir, 'sources', `${crypto.createHash('sha1').update(normUrl(url)).digest('hex').slice(0, 10)}.html`);
        if (!fs.existsSync(f)) throw new Error(`no source fixture for ${url} (${path.basename(f)})`);
        body = fs.readFileSync(f, 'utf8');
      } else {
        const res = await fetchImpl(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; growth-loop-fact-check)', accept: 'text/html,text/plain' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
        status = res.status;
        const type = res.headers.get('content-type') ?? '';
        if (!res.ok) throw new Error(`HTTP ${status}`);
        if (!/text\/|html|xml/.test(type)) throw new Error(`unsupported content-type ${type}`);
        body = await res.text();
      }
      const text = /<html|<body|<p[ >]/i.test(body) ? htmlToText(body) : body;
      if (text.length < minChars) throw new Error(`only ${text.length} chars of text`);
      out.push({ url, ok: true, status, chars: text.length, sha256: crypto.createHash('sha256').update(text).digest('hex'), fetchedAt: new Date().toISOString(), text });
    } catch (e) {
      out.push({ url, ok: false, error: e.message });
    }
  }
  return out;
}

/** Save source texts under dir and return the manifest (without inline text). */
export function saveSources(dir, sources) {
  fs.mkdirSync(dir, { recursive: true });
  return sources.map((s, i) => {
    if (!s.ok) return { url: s.url, ok: false, error: s.error };
    const file = `${String(i + 1).padStart(2, '0')}-${s.sha256.slice(0, 8)}.txt`;
    fs.writeFileSync(path.join(dir, file), s.text);
    return { url: s.url, ok: true, file, chars: s.chars, sha256: s.sha256, fetchedAt: s.fetchedAt };
  });
}

export function loadSavedSources(dir) {
  const mf = path.join(dir, 'manifest.json');
  if (!fs.existsSync(mf)) return [];
  return JSON.parse(fs.readFileSync(mf, 'utf8')).map((m) => (m.ok ? { ...m, text: fs.readFileSync(path.join(dir, m.file), 'utf8') } : m));
}
