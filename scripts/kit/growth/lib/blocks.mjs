// site-kit v0.1.0
// Required blocks: boilerplate every page must carry (a "not medical advice"
// line, a "sources checked" list, a 21+ line). The script inserts them
// deterministically BEFORE the gates run, so a model never has to remember
// them, and the lint gate re-checks their presence (so growth:verify does too).
//
// content.requiredBlocks: [{ id, position: "start"|"end", markdown, test, when? }]
//   markdown  text to insert; {today} -> draft date, {sources} -> a bullet list
//             of the external links already in the body (host + link)
//   test      regex source the final body must match (checked by the lint gate)
//   when      optional regex source; the block applies only if the body matches it

const externalLinks = (body) => {
  const seen = new Map();
  for (const m of body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
    try {
      const u = new URL(m[1]);
      if (!seen.has(m[1])) seen.set(m[1], u.hostname.replace(/^www\./, ''));
    } catch { /* skip */ }
  }
  return [...seen.entries()];
};

export const applies = (b, body) => !b.when || new RegExp(b.when, 'i').test(body);

export function applyRequiredBlocks(draft, cfg, today) {
  let body = (draft.body ?? '').trim();
  const base = body;
  const parts = { start: [], end: [] };
  for (const b of cfg.content.requiredBlocks ?? []) {
    if (!applies(b, base) || new RegExp(b.test, 'i').test(body)) continue;
    const links = externalLinks(base);
    const md = b.markdown
      .replaceAll('{today}', today)
      .replaceAll('{sources}', links.map(([url, host]) => `- [${host}](${url})`).join('\n'));
    parts[b.position === 'start' ? 'start' : 'end'].push(md.trim());
  }
  body = [...parts.start, body, ...parts.end].join('\n\n');
  return { ...draft, body };
}

export function missingBlocks(body, cfg) {
  const out = [];
  for (const b of cfg.content.requiredBlocks ?? []) {
    // `when` is judged on the body as written, which includes the block itself; the test is what must hold.
    if (!applies(b, body)) continue;
    if (!new RegExp(b.test, 'i').test(body)) out.push(`required block "${b.id}" is missing (body must match /${b.test}/)`);
  }
  return out;
}
