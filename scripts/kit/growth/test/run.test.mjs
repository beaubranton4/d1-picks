// site-kit v0.1.0
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RUN = path.join(here, '..', 'run.mjs');
const ROOT = process.cwd();
const TEST_CFG = path.join(here, 'growth.test.config.json');

test('--dry-run needs no keys, publishes one gated post to a scratch dir and leaves the repo alone', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'growth-test-'));
  const env = { ...process.env };
  for (const k of ['DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD', 'GSC_SA_KEY_BASE64', 'ANTHROPIC_API_KEY', 'GA4_PROPERTY_ID']) delete env[k];
  const stdout = execFileSync('node', [RUN, '--config', TEST_CFG, '--dry-run', '--date', '2026-10-05', '--out', out], { cwd: ROOT, env, encoding: 'utf8' });
  const j = JSON.parse(stdout);
  assert.equal(j.dryRun, true);
  assert.equal(j.published.length, 1);
  assert.ok(j.published[0].publishDate > '2026-10-05', 'future publishDate');
  assert.equal(j.spend.dataforseo, 0);
  assert.ok(fs.existsSync(path.join(out, 'scripts/kit/growth/test/state/log.md')));
  assert.ok(j.skipped.some((s) => /cannibalization|skip-list/.test(s)), 'skips carry reasons');
});

test('live mode with no secrets is a clear no-op', () => {
  const env = { ...process.env };
  for (const k of ['DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD', 'GSC_SA_KEY_BASE64', 'ANTHROPIC_API_KEY', 'GA4_PROPERTY_ID']) delete env[k];
  const stdout = execFileSync('node', [RUN, '--config', TEST_CFG], { cwd: ROOT, env, encoding: 'utf8' });
  assert.match(stdout, /not running: missing secret\(s\) DATAFORSEO_LOGIN/);
});
