#!/usr/bin/env node
// site-kit v0.1.0
/**
 * CI re-verification of loop-published pages, independent of the run that
 * wrote them: re-runs every gate from the saved markdown body and the saved
 * source texts, and checks the post file still matches that body, the release
 * date is in the future of the draft date, and the weekly cap holds.
 *
 *   node verify.mjs [--base origin/main]   only pages added/changed since the ref (default: all)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { cli } from './lib/cli.mjs';
import { abs, loadConfig, ROOT } from './lib/config.mjs';
import { scanPosts } from './lib/content.mjs';
import { loadSavedSources } from './lib/sources.mjs';
import { markdownToHtml } from './lib/html.mjs';
import { isoWeek } from './lib/text.mjs';
import { runGates, summarize } from './gates/index.mjs';

const { values: a } = cli('Usage: node verify.mjs [--base <git-ref>]', { base: { type: 'string' } });
const cfg = loadConfig();
const pagesDir = abs(cfg.paths.dir, 'pages');
if (!fs.existsSync(pagesDir)) {
  console.log('[verify] no growth pages');
  process.exit(0);
}
let only = null;
if (a.base) {
  const out = execFileSync('git', ['diff', '--name-only', `${a.base}...HEAD`], { cwd: ROOT, encoding: 'utf8' });
  only = new Set(out.split('\n').filter((f) => f.startsWith(`${cfg.paths.dir}/pages/`) && f.endsWith('.json')).map((f) => path.basename(f, '.json')));
}
const records = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(pagesDir, f), 'utf8'))).filter((r) => !only || only.has(r.slug));
const allPosts = scanPosts(cfg);
let failed = 0;
for (const rec of records) {
  const errs = [];
  const bodyFile = path.join(pagesDir, `${rec.slug}.body.md`);
  const postFile = abs(rec.file);
  if (!fs.existsSync(bodyFile) || !fs.existsSync(postFile)) {
    console.log(`FAIL ${rec.slug}: missing body.md or post file`);
    failed++;
    continue;
  }
  const body = fs.readFileSync(bodyFile, 'utf8');
  const post = matter(fs.readFileSync(postFile, 'utf8'));
  const rendered = cfg.content.bodyFormat === 'html' ? markdownToHtml(body) : body.trim();
  if (post.content.trim() !== rendered.trim()) errs.push('post body differs from the gated markdown (hand edit or drift)');
  if (rec.publishDate <= rec.draftedAt) errs.push(`publishDate ${rec.publishDate} is not after the draft date ${rec.draftedAt} (backdated)`);
  if (String(post.data[cfg.content.publishDateField]).slice(0, 10) !== rec.publishDate) errs.push('frontmatter publishDate differs from the record');
  const week = isoWeek(rec.publishDate);
  const inWeek = allPosts.filter((p) => p.release && isoWeek(p.release) === week).length;
  if (inWeek > cfg.caps.weeklyPages) errs.push(`${inWeek} pages release in ${week}; the weekly cap is ${cfg.caps.weeklyPages}`);
  const sources = loadSavedSources(path.join(abs(cfg.paths.dir), 'sources', rec.slug));
  const posts = allPosts.filter((p) => p.slug !== rec.slug);
  const knownPaths = new Set([...cfg.content.knownPaths, ...cfg.content.tools.map((t) => t.path), ...posts.filter((p) => p.released).map((p) => p.path), ...posts.filter((p) => p.release && p.release <= rec.publishDate).map((p) => p.path)]);
  const draft = { topic: { keyword: rec.keyword }, frontmatter: { title: post.data.title, slug: rec.slug, category: post.data.category ?? cfg.content.defaultCategory, excerpt: post.data[cfg.content.descriptionField], keywords: post.data[cfg.content.keywordsField] }, body, value: { type: rec.angle, tool: rec.angleTool, dataFile: rec.angleData } };
  const g = runGates(draft, { cfg, today: rec.draftedAt, posts, sources, knownPaths, reservedSlugs: new Set() });
  if (!g.pass) errs.push(`gates failed:\n${summarize(g)}`);
  if (errs.length) {
    failed++;
    console.log(`FAIL ${rec.slug}\n  - ${errs.join('\n  - ')}`);
  } else console.log(`PASS ${rec.slug} (${g.results.map((r) => r.name).join(', ')})`);
}
console.log(`[verify] ${records.length} page(s), ${failed} failed`);
process.exit(failed ? 1 : 0);
