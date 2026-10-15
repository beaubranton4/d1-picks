// site-kit v0.1.0
// Gate 5: word-count and internal-link minimums.
import { assetSourceUrls } from '../lib/dataassets.mjs';
import { domainMatches, wordCount } from '../lib/text.mjs';

export function sizeDraft(draft, ctx) {
  const { cfg, knownPaths } = ctx;
  const f = [];
  const words = wordCount(draft.body ?? '');
  if (words < cfg.gates.minWords) f.push(`${words} words; need at least ${cfg.gates.minWords}`);
  const host = cfg.site.domain;
  const internal = new Set();
  const external = new Set();
  for (const m of (draft.body ?? '').matchAll(/\]\(([^)\s]+)\)/g)) {
    let href = m[1];
    if (href.startsWith('http')) {
      try {
        const u = new URL(href);
        if (u.hostname.replace(/^www\./, '') === host) href = u.pathname;
        else { external.add(u.hostname); continue; }
      } catch { continue; }
    }
    href = href.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
    if (knownPaths.has(href)) internal.add(href);
    else f.push(`internal link ${href} does not resolve to a released page`);
  }
  for (const pre of cfg.gates.requiredLinkPrefixes ?? []) if (![...internal].some((h) => h.startsWith(pre))) f.push(`body must link at least one internal page under ${pre}`);
  if (internal.size < cfg.gates.minInternalLinks) f.push(`${internal.size} distinct internal link(s); need ${cfg.gates.minInternalLinks}`);
  if (!external.size) f.push('no external source link');
  const only = (cfg.sources?.requireDomains ?? []).map((d) => d.toLowerCase());
  if (only.length) {
    const own = new Set(cfg.content.dataAssets.flatMap((a) => assetSourceUrls(a)).map((u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } }));
    for (const h of external) {
      const host = h.replace(/^www\./, '').toLowerCase();
      if (!only.some((d) => domainMatches(host, d)) && !own.has(host)) f.push(`external link to ${host} is outside sources.requireDomains (primary sources only on this site)`);
    }
  }
  return { name: 'size', pass: f.length === 0, failures: f, stats: { words, internal: [...internal], external: [...external] } };
}
