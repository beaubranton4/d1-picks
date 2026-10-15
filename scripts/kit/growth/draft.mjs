// site-kit v0.1.0
// Stage 4: draft. Fetch the sources first, hand ONLY their text to the model,
// then gate the result. A failed draft gets at most `maxRepairs` repair passes.
import fs from 'node:fs';
import { extractJson } from './lib/anthropic.mjs';
import { abs } from './lib/config.mjs';
import { fetchSources } from './lib/sources.mjs';
import { runGates } from './gates/index.mjs';
import { sanitize } from './gates/lint.mjs';
import { applyRequiredBlocks } from './lib/blocks.mjs';
import { dataAssetSources, findAsset } from './lib/dataassets.mjs';

const SRC_CHARS = 14000;

export function extraRules(cfg) {
  const out = [];
  if (cfg.gates.healthClaims) {
    out.push('Health content is forbidden. Never say or imply that anything treats, cures, prevents, reduces, relieves, heals or detoxes anything; never write "studies show", "research shows", "experts say" or "clinically proven"; never mention recovery, healing time or when to start after surgery; never advise on symptoms, conditions or medical decisions. Describe only licenses, credentials, prices and logistics, stated as what the cited pages say. A script rejects any of these words.');
  }
  if (cfg.content.ext === 'mdx') {
    out.push('This site renders MDX: no tables (use bulleted lists), no curly braces, and no "<" or ">" characters anywhere in the body.');
  }
  if ((cfg.content.requiredBlocks ?? []).length) {
    out.push(`The script inserts these sections itself (${cfg.content.requiredBlocks.map((b) => b.id).join(', ')}); do not write them, a "Sources" section, or any disclaimer.`);
  }
  if ((cfg.content.dataAssets ?? []).length) {
    out.push('When the SOURCE TEXTS are rows of our own data (one row per line, with a source page URL), cite the row\'s page URL for each number. Quote numbers exactly as the row states them; never compute an average, median, range or total yourself.');
  }
  return out.map((t, i) => `${10 + i}. ${t}\n`).join('');
}

export function buildSystem(cfg, voice) {
  return `You write pages for ${cfg.site.name} (${cfg.site.domain}). Voice guide:\n\n${voice}\n\n` +
`HARD RULES (a script checks every one and drops the draft if any fails):
1. Every price, percentage, quantity with a unit, limit, deadline and year that is not the current year must come from the SOURCE TEXTS below. Put it in a paragraph, list item or table that links to the source page it came from, as a markdown link using the exact source URL. The number must appear in that source's text. If the sources do not contain a number, do not state one.
2. Never invent facts, products, specs, prices, people, quotes, ratings or statistics. Product facts come only from the sources.
3. Never claim first-hand experience ("I tested", "we used", "in my experience"). Write as a reference, not a review.
4. No em dashes, en dashes, emojis, hype or filler phrases (unlock, seamless, game changer, delve, in conclusion, it's important to note).
5. No H1 in the body (the template renders the title). Use ## and ### sections. Markdown only; pipe tables allowed unless a later rule says otherwise.
6. Hypothetical illustrations with made-up amounts are allowed only in a paragraph that starts with "Example:" or "For example," and has no link.
7. No affiliate links, no shop links, no calls to buy.
8. Link to at least ${cfg.gates.minInternalLinks} of the INTERNAL PAGES listed (markdown links with the exact path). ${'' }
9. Be useful to someone who already read the top results: lead with the answer, then the specifics, then what to do. Say what the sources do not cover.
${extraRules(cfg)}Reply with ONE JSON object and nothing else.`;
}

export function buildUser({ cfg, topic, angle, sources, internal }) {
  const src = sources.filter((s) => s.ok).map((s, i) => `### SOURCE ${i + 1}: ${s.url}\n${s.text.slice(0, SRC_CHARS)}`).join('\n\n');
  const tools = cfg.content.tools.map((t) => `- ${t.path}`).join('\n');
  return `TOPIC (target keyword): ${topic.keyword}
CLUSTER: ${topic.cluster}
PAGE VALUE TO DELIVER: ${angle.type}${angle.tool ? ` (link the tool ${angle.tool} prominently and tell the reader how to use it for this question)` : ''}${angle.dataFile ? ` (cite the data file ${angle.dataFile})` : ''}
CATEGORIES (pick one): ${cfg.content.categories.join(', ') || '(none)'}
WORD COUNT: at least ${cfg.gates.minWords} words of body.
TITLE: 50-60 characters, includes the keyword${cfg.content.titleMustIncludeYear ? ' and the year' : ''}.
META DESCRIPTION ("excerpt"): ${cfg.gates.descriptionMin}-${cfg.gates.descriptionMax} characters.

INTERNAL PAGES you may link (use these exact paths):
${internal.map((p) => `- ${p.path} : ${p.title}`).join('\n')}
${tools}

SOURCE TEXTS (the only place facts may come from):
${src}

JSON shape:
{"title":"","slug":"kebab-case","category":"","excerpt":"","keywords":["target keyword","2-4 secondary"],"body":"markdown","value":{"type":"${angle.type}"${angle.tool ? `,"tool":"${angle.tool}"` : ''}${angle.dataFile ? `,"dataFile":"${angle.dataFile}"` : ''}},"sources_used":["url",...]}`;
}

/**
 * @returns {{draft, gates, sources, cost, attempts}} draft is null when dropped.
 */
export async function draftTopic({ cfg, topic, angle, urls, posts, ctxBase, anthropic, fixturesDir, fetchImpl, voice, fixtureName = 'draft' }) {
  const toolUrls = angle?.tool ? cfg.content.tools.find((t) => t.path === angle.tool)?.sourceUrls ?? [] : [];
  const sources = await fetchSources([...new Set([...urls, ...toolUrls, ...(cfg.sources.extraUrls ?? [])])], { fixturesDir, fetchImpl });
  const asset = angle.type === 'data' ? findAsset(cfg, angle.dataFile) : null;
  if (asset) sources.push(...dataAssetSources(cfg, asset, topic.keyword));
  const okSources = sources.filter((s) => s.ok);
  const domains = new Set(okSources.map((s) => new URL(s.url).hostname.replace(/^www\./, '')));
  if (domains.size < cfg.gates.minSourceDomains) {
    return { draft: null, sources, gates: null, cost: 0, attempts: 0, dropReason: `only ${domains.size} source domain(s) fetched cleanly; need ${cfg.gates.minSourceDomains}` };
  }
  const internal = posts.filter((p) => p.released).slice(0, 40).map((p) => ({ path: p.path, title: p.title }));
  const system = buildSystem(cfg, voice);
  const messages = [{ role: 'user', content: buildUser({ cfg, topic, angle, sources: okSources, internal }) }];
  let cost = 0;
  let attempts = 0;
  let last = null;
  let usedModel = null;
  const rungs = fixturesDir ? 1 : cfg.anthropic.models.length;
  for (let rung = 0; rung < rungs; rung++) {
    const base = [messages[0]];
    messages.length = 0;
    messages.push(...base);
    for (let i = 0; i <= cfg.anthropic.maxRepairs; i++) {
    attempts++;
    let r;
    try {
      r = await anthropic.complete({ system, messages, label: i ? 'repair' : 'draft', fixture: i ? `${fixtureName}-repair` : fixtureName, rung });
    } catch (e) {
      if (!last) throw e;
      return { draft: null, sources, gates: last.gates, cost, attempts, dropReason: `failed gates; repair unavailable (${e.message})`, failedDraft: last.draft };
    }
    cost += r.cost;
    usedModel = r.model;
    let parsed;
    try {
      parsed = extractJson(r.text);
    } catch (e) {
      break; // unparseable: escalate to the next model
    }
    const raw = {
      topic,
      frontmatter: { title: parsed.title, slug: parsed.slug, category: parsed.category ?? cfg.content.defaultCategory, excerpt: parsed.excerpt, keywords: parsed.keywords },
      body: parsed.body ?? '',
      value: parsed.value,
      sourcesUsed: parsed.sources_used ?? [],
    };
    const clean = sanitize(raw);
    const fixes = clean.fixes;
    const draft = applyRequiredBlocks(clean.draft, cfg, ctxBase.today);
    draft.autofixes = fixes;
    const gates = runGates(draft, { ...ctxBase, sources: okSources });
    last = { draft, gates };
    if (gates.pass) return { draft, gates, sources, cost, attempts, model: usedModel };
    messages.push({ role: 'assistant', content: r.text }, { role: 'user', content: `The draft failed these automated checks. Fix every one and return the full JSON again. Do not add facts that are not in the sources; remove any claim you cannot cite.\n\n${gates.results.filter((x) => !x.pass).map((x) => `${x.name}:\n- ${x.failures.join('\n- ')}`).join('\n\n')}` });
    }
  }
  return { gates: last?.gates ?? null, sources, cost, attempts, draft: null, dropReason: 'failed gates on every model rung', failedDraft: last?.draft };
}

export const readVoice = (cfg) => {
  const f = abs(cfg.voiceGuide);
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : 'Plain, specific, calm. Short sentences. No hype.';
};
