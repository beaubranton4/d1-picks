// site-kit v0.1.0
// Stage 6: write the post (future publishDate), its sidecar record and saved
// sources. The workflow opens the PR; this only writes files.
import path from 'node:path';
import matter from 'gray-matter';
import { markdownToHtml } from './lib/html.mjs';
import { postPath } from './lib/config.mjs';
import { saveSources } from './lib/sources.mjs';

export function renderPost(cfg, draft, date, today) {
  const c = cfg.content;
  const fm = {
    title: draft.frontmatter.title,
    slug: draft.frontmatter.slug,
    category: draft.frontmatter.category,
    ...(c.dateField ? { [c.dateField]: date } : {}),
    ...((c.lastUpdatedField ?? (c.dateField === 'date' ? 'lastUpdated' : false)) ? { [c.lastUpdatedField ?? 'lastUpdated']: date } : {}),
    [c.descriptionField]: draft.frontmatter.excerpt,
    [c.keywordsField]: draft.frontmatter.keywords,
    ...Object.fromEntries(Object.entries(c.frontmatterCopy ?? {}).map(([k, from]) => [k, draft.frontmatter[from]])),
    ...Object.fromEntries(Object.entries(c.frontmatterExtras ?? {}).map(([k, v]) => [k, String(v).replaceAll('{slug}', draft.frontmatter.slug)])),
    ...(c.author ? { author: c.author } : {}),
    [c.publishDateField]: date,
  };
  void today;
  const body = c.bodyFormat === 'html' ? markdownToHtml(draft.body) : draft.body.trim();
  return matter.stringify(`\n${body}\n`, fm);
}

/** Write post + sidecar + sources through the writer; returns the record. */
export function publishDraft({ cfg, W, draft, gates, sources, date, today, cost, attempts, model }) {
  const slug = draft.frontmatter.slug;
  const file = path.join(cfg.content.dir, `${slug}.${cfg.content.ext}`);
  W.write(file, renderPost(cfg, draft, date, today));
  W.write(path.join(cfg.paths.dir, 'pages', `${slug}.body.md`), `${draft.body.trim()}\n`); // the exact markdown the gates saw
  const srcDir = path.join(cfg.paths.dir, 'sources', slug);
  const manifest = saveSources(path.join(W.root, srcDir), sources);
  W.write(path.join(srcDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const record = {
    slug,
    category: draft.frontmatter.category,
    path: postPath(cfg, draft.frontmatter),
    file,
    keyword: draft.topic.keyword,
    cluster: draft.topic.cluster,
    source: draft.topic.source,
    angle: draft.value?.type,
    angleTool: draft.value?.tool,
    angleData: draft.value?.dataFile,
    publishDate: date,
    draftedAt: today,
    model,
    cost: +cost.toFixed(4),
    attempts,
    autofixes: draft.autofixes ?? [],
    gates: Object.fromEntries(gates.results.map((r) => [r.name, { pass: r.pass, stats: r.stats ? { ...r.stats, verified: undefined } : undefined }])),
    verifiedFacts: gates.results.find((r) => r.name === 'factcheck')?.stats?.verified ?? [],
    measurements: [],
  };
  W.write(path.join(cfg.paths.dir, 'pages', `${slug}.json`), `${JSON.stringify(record, null, 2)}\n`);
  if (cfg.content.publishedLog) {
    const raw = W.read(cfg.content.publishedLog);
    if (raw) {
      const j = JSON.parse(raw);
      (j.published ??= []).push({ keyword: draft.topic.keyword, slug, category: record.category, date, title: draft.frontmatter.title, growthLoop: true });
      W.write(cfg.content.publishedLog, `${JSON.stringify(j, null, 2)}\n`);
    }
  }
  return record;
}
