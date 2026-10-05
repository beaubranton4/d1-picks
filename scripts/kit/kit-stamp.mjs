#!/usr/bin/env node
// site-kit v0.1.0
/**
 * Every kit-owned file carries a version stamp in its first lines:
 *   // site-kit vX.Y.Z        (.ts .tsx .mjs .js; after a shebang if present)
 *   <!-- site-kit vX.Y.Z -->  (.md; right after the frontmatter block)
 * matching KIT_VERSION in src/kit/version.ts. --check verifies (CI runs it);
 * --set X.Y.Z bumps KIT_VERSION and rewrites every stamp.
 */
import fs from 'node:fs';
import path from 'node:path';
import { cli } from './lib/cli.mjs';
import { kitFiles, readKitVersion } from './lib/kitfiles.mjs';

const { values } = cli(
  `
Usage: node scripts/kit/kit-stamp.mjs [--check] [--set X.Y.Z]

  --check       (default) fail if any kit file lacks the current stamp
  --set X.Y.Z   bump src/kit/version.ts and restamp every kit file
`,
  { check: { type: 'boolean' }, set: { type: 'string' } },
);

const root = process.cwd();
const STAMP_RE = /(\/\/|<!--) site-kit v(\d+\.\d+\.\d+)( -->)?/;

if (values.set) {
  if (!/^\d+\.\d+\.\d+$/.test(values.set)) {
    console.error('kit-stamp: --set needs a semver like 0.2.0');
    process.exit(2);
  }
  const vf = path.join(root, 'src/kit/version.ts');
  fs.writeFileSync(vf, fs.readFileSync(vf, 'utf8').replace(/KIT_VERSION = '[^']+'/, `KIT_VERSION = '${values.set}'`));
}
const version = readKitVersion(root);
if (!version) {
  console.error('kit-stamp: src/kit/version.ts not found; run from a repo that contains the kit');
  process.exit(2);
}

const stampFor = (file) => (file.endsWith('.md') ? `<!-- site-kit v${version} -->` : `// site-kit v${version}`);

const bad = [];
let changed = 0;
for (const rel of kitFiles(root)) {
  if (!/\.(ts|tsx|mjs|js|md)$/.test(rel)) continue;
  const abs = path.join(root, rel);
  const text = fs.readFileSync(abs, 'utf8');
  const head = text.split('\n').slice(0, 12).join('\n');
  const m = head.match(STAMP_RE);
  if (values.set) {
    let next;
    if (m) next = text.replace(STAMP_RE, stampFor(rel));
    else if (rel.endsWith('.md') && text.startsWith('---\n')) {
      const end = text.indexOf('\n---\n', 4) + 5;
      next = `${text.slice(0, end)}${stampFor(rel)}\n${text.slice(end)}`;
    } else if (text.startsWith('#!')) {
      const nl = text.indexOf('\n') + 1;
      next = `${text.slice(0, nl)}${stampFor(rel)}\n${text.slice(nl)}`;
    } else next = `${stampFor(rel)}\n${text}`;
    if (next !== text) {
      fs.writeFileSync(abs, next);
      changed++;
    }
  } else if (!m) bad.push(`${rel}: no stamp`);
  else if (m[2] !== version) bad.push(`${rel}: stamped v${m[2]}, kit is v${version}`);
}

if (values.set) {
  console.log(`Kit is now v${version}; restamped ${changed} file(s).`);
} else if (bad.length) {
  console.error(bad.join('\n'));
  console.error(`\n${bad.length} kit file(s) out of step with v${version}. Fix with: node scripts/kit/kit-stamp.mjs --set ${version}`);
  process.exit(1);
} else {
  console.log(`All kit files stamped v${version}.`);
}
