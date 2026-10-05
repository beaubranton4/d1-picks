#!/usr/bin/env node
// site-kit v0.1.0
/**
 * The release calendar: every gated page by ISO week, released or upcoming,
 * with the weekly editorial cap applied. Read it before scheduling anything
 * (/kit-release-plan) and after, to confirm the plan.
 */
import { cli } from './lib/cli.mjs';
import { loadConfig } from './lib/config.mjs';
import { isCadenceExempt, isoWeek, releaseItems, releaseTime } from './lib/content.mjs';
import { table } from './lib/md.mjs';

const { values } = cli(
  `
Usage: node scripts/kit/release-calendar.mjs [--past]

Shows upcoming releases by ISO week (add --past to include released pages).
Verified-directory paths (releaseCadence.exemptPaths) do not count toward the cap.
`,
  { past: { type: 'boolean' } },
);

const cfg = loadConfig();
const max = cfg.releaseCadence?.maxEditorialPerWeek ?? 3;
const now = Date.now();
const items = releaseItems(cfg)
  .filter((it) => values.past || releaseTime(it.date) > now)
  .sort((a, b) => String(a.date).localeCompare(String(b.date)));

const weeks = new Map();
for (const it of items) weeks.set(isoWeek(it.date), [...(weeks.get(isoWeek(it.date)) ?? []), it]);

console.log(`# Release calendar (max ${max} editorial pages per week)\n`);
if (!items.length) console.log('Nothing scheduled.');
for (const [w, list] of weeks) {
  const editorial = list.filter((it) => !isCadenceExempt(it.path, cfg)).length;
  console.log(`## ${w}: ${editorial} editorial${editorial > max ? ` (OVER CAP by ${editorial - max})` : ''}\n`);
  console.log(
    table(
      ['Date', 'Path', 'Source', 'Status'],
      list.map((it) => [
        it.date,
        it.path,
        it.kind === 'mdx' ? it.file : 'release-schedule.json',
        `${releaseTime(it.date) <= now ? 'released' : 'scheduled'}${isCadenceExempt(it.path, cfg) ? ', exempt' : ''}`,
      ]),
    ),
  );
  console.log('');
}
