// site-kit v0.1.0
// All file writes go through a Writer so --dry-run can redirect every
// would-be write into a scratch dir instead of the repo.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from './lib/config.mjs';

export function makeWriter({ dryRun = false, outRoot = null } = {}) {
  const root = dryRun ? outRoot ?? path.join(os.tmpdir(), 'growth-dry-run') : ROOT;
  if (dryRun) fs.rmSync(root, { recursive: true, force: true });
  const full = (rel) => path.join(root, rel);
  return {
    dryRun,
    root,
    write(rel, text) {
      fs.mkdirSync(path.dirname(full(rel)), { recursive: true });
      fs.writeFileSync(full(rel), text);
      return rel;
    },
    append(rel, text) {
      fs.mkdirSync(path.dirname(full(rel)), { recursive: true });
      fs.appendFileSync(full(rel), text);
    },
    read(rel) {
      const f = fs.existsSync(full(rel)) ? full(rel) : path.join(ROOT, rel);
      return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
    },
  };
}
