// site-kit v0.1.0
/**
 * The kit boundary: the only files the kit owns. Everything else in a site
 * repo (src/app, src/site, content, data, site.config.json, workflows,
 * CLAUDE.md) is site-owned and never touched by kit-sync.
 */
import fs from 'node:fs';
import path from 'node:path';

export const KIT_DIRS = ['src/kit', 'scripts/kit'];
export const KIT_COMMANDS_DIR = '.claude/commands';
export const isKitCommand = (name) => /^kit-.*\.md$/.test(name);

/** npm packages kit code imports; kit-sync warns when a site lacks one. */
export const KIT_DEPENDENCIES = ['next', 'react', 'react-dom', 'gray-matter', 'next-mdx-remote', '@vercel/analytics', '@vercel/speed-insights'];
export const KIT_DEV_DEPENDENCIES = ['vitest', 'typescript'];

/** Site files kit code reads (the kit <-> site contract). */
export const SITE_CONTRACT = ['site.config.json', 'content/release-schedule.json', 'data/affiliates.json', 'data/seo-taxonomy.json'];

function walk(root, rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((d) => {
    const r = path.join(rel, d.name);
    if (d.name === 'node_modules' || d.name === '.DS_Store') return [];
    return d.isDirectory() ? walk(root, r) : [r];
  });
}

/** Repo-relative paths of every kit-owned file under `root`. */
export function kitFiles(root) {
  const cmdDir = path.join(root, KIT_COMMANDS_DIR);
  const commands = fs.existsSync(cmdDir) ? fs.readdirSync(cmdDir).filter(isKitCommand).map((f) => path.join(KIT_COMMANDS_DIR, f)) : [];
  return [...KIT_DIRS.flatMap((d) => walk(root, d)), ...commands].sort();
}

export function readKitVersion(root) {
  const f = path.join(root, 'src/kit/version.ts');
  if (!fs.existsSync(f)) return null;
  return fs.readFileSync(f, 'utf8').match(/KIT_VERSION = '([^']+)'/)?.[1] ?? null;
}
