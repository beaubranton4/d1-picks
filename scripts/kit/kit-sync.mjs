#!/usr/bin/env node
// site-kit v0.1.0
/**
 * Copy the kit's own files into a site repo: src/kit/, scripts/kit/ and
 * .claude/commands/kit-*.md. Nothing else is touched; site code (src/app,
 * src/site, content, data, site.config.json) is the site's.
 *
 * Dry run by default: prints what would change (with +/- line counts) and the
 * kit version on each side. --write applies it, including deleting kit files
 * the kit no longer ships. Run it from the kit repo (or point --from at it).
 *
 * After --write, in the site: npm install (if deps were flagged), npm test,
 * npm run lint:content, npm run build, then commit "chore: sync site-kit vX".
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cli } from './lib/cli.mjs';
import { KIT_DEPENDENCIES, KIT_DEV_DEPENDENCIES, SITE_CONTRACT, kitFiles, readKitVersion } from './lib/kitfiles.mjs';
import { table } from './lib/md.mjs';

const { values, positionals } = cli(
  `
Usage: node scripts/kit/kit-sync.mjs <path-to-site-repo> [--write] [--from <kit-repo>]

  --write        apply the changes (default is a dry run)
  --from PATH    kit repo to copy from (default: the repo this script lives in)
`,
  { write: { type: 'boolean' }, from: { type: 'string' } },
);

const kitRoot = path.resolve(values.from ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const siteRoot = positionals[0] ? path.resolve(positionals[0]) : null;
if (!siteRoot) {
  console.error('kit-sync: pass the site repo path (see --help)');
  process.exit(2);
}
if (!fs.existsSync(path.join(siteRoot, 'package.json'))) {
  console.error(`kit-sync: ${siteRoot} has no package.json; is it a site repo?`);
  process.exit(2);
}
if (fs.realpathSync(siteRoot) === fs.realpathSync(kitRoot)) {
  console.error('kit-sync: the site and the kit are the same repo');
  process.exit(2);
}

const kitVersion = readKitVersion(kitRoot);
const siteVersion = readKitVersion(siteRoot);
const kitSet = kitFiles(kitRoot);
const siteSet = new Set(kitFiles(siteRoot));

/** +added / -removed line counts, via git when available, else a multiset diff. */
function lineDiff(a, b) {
  try {
    const out = execFileSync('git', ['diff', '--no-index', '--numstat', '--', a, b], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const [add, del] = out.trim().split(/\s+/);
    return `+${add} -${del}`;
  } catch (e) {
    // git diff --no-index exits 1 when files differ; its stdout is still the answer.
    const out = e.stdout?.toString().trim();
    if (out) {
      const [add, del] = out.split(/\s+/);
      return `+${add} -${del}`;
    }
    const count = (s) => s.split('\n').reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
    const ca = count(fs.readFileSync(a, 'utf8'));
    const cb = count(fs.readFileSync(b, 'utf8'));
    let add = 0;
    let del = 0;
    for (const [l, n] of cb) add += Math.max(0, n - (ca.get(l) ?? 0));
    for (const [l, n] of ca) del += Math.max(0, n - (cb.get(l) ?? 0));
    return `+${add} -${del}`;
  }
}

const rows = [];
for (const rel of kitSet) {
  const from = path.join(kitRoot, rel);
  const to = path.join(siteRoot, rel);
  if (!siteSet.has(rel)) rows.push({ rel, action: 'add', diff: `+${fs.readFileSync(from, 'utf8').split('\n').length}` });
  else if (!fs.readFileSync(from).equals(fs.readFileSync(to))) rows.push({ rel, action: 'update', diff: lineDiff(to, from) });
}
const kitSetLookup = new Set(kitSet);
for (const rel of siteSet) if (!kitSetLookup.has(rel)) rows.push({ rel, action: 'delete', diff: `-${fs.readFileSync(path.join(siteRoot, rel), 'utf8').split('\n').length}` });

console.log(`# kit-sync ${values.write ? '(writing)' : '(dry run)'}\n`);
console.log(`Kit:  ${kitRoot} (v${kitVersion ?? '?'})`);
console.log(`Site: ${siteRoot} (v${siteVersion ?? 'none'})\n`);
if (rows.length) {
  console.log(table(['Action', 'File', 'Lines'], rows.map((r) => [r.action, r.rel, r.diff])));
} else {
  console.log('Site already matches the kit.');
}
const unchanged = kitSet.length - rows.filter((r) => r.action !== 'delete').length;
console.log(`\n${rows.filter((r) => r.action === 'add').length} add, ${rows.filter((r) => r.action === 'update').length} update, ${rows.filter((r) => r.action === 'delete').length} delete, ${unchanged} unchanged.`);

// Things a sync cannot fix by copying files.
const pkg = JSON.parse(fs.readFileSync(path.join(siteRoot, 'package.json'), 'utf8'));
const has = (d) => pkg.dependencies?.[d] || pkg.devDependencies?.[d];
const missingDeps = [...KIT_DEPENDENCIES, ...KIT_DEV_DEPENDENCIES].filter((d) => !has(d));
const missingContract = SITE_CONTRACT.filter((f) => !fs.existsSync(path.join(siteRoot, f)));
if (missingDeps.length) console.log(`\nSite package.json lacks kit dependencies: ${missingDeps.join(', ')} (npm install them).`);
if (missingContract.length) console.log(`Site lacks files the kit reads: ${missingContract.join(', ')} (copy them from the kit and edit).`);

if (values.write) {
  for (const r of rows) {
    const to = path.join(siteRoot, r.rel);
    if (r.action === 'delete') fs.rmSync(to);
    else {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(path.join(kitRoot, r.rel), to);
    }
  }
  console.log(`\nWrote ${rows.length} change(s). Next, in the site: npm test && npm run lint:content && npm run build, then commit "chore: sync site-kit v${kitVersion}".`);
} else if (rows.length) {
  console.log('\nDry run only. Re-run with --write to apply.');
}
