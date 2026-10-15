// site-kit v0.1.0
// Writes docs/growth/log.md entries and the weekly report.
import { isoWeek } from './lib/text.mjs';

const f1 = (n) => (n == null ? 'n/a' : Number(n).toFixed(1));

export function logLines({ today, run }) {
  const L = [];
  for (const d of run.decisions ?? []) L.push(`- ${today} \`${d.path}\` @${d.checkpoint}d: **${d.action}**. ${d.reason}`);
  for (const p of run.published ?? []) L.push(`- ${today} published \`${p.path}\` for "${p.keyword}" (${p.angle}, release ${p.publishDate}, cost $${p.cost}).`);
  for (const s of run.skipped ?? []) L.push(`- ${today} skipped "${s.keyword}" at ${s.stage}: ${s.reason}`);
  for (const d of run.dropped ?? []) L.push(`- ${today} dropped draft "${d.keyword}": ${d.reason}`);
  for (const e of run.extend ?? []) L.push(`- ${today} extend-not-create "${e.keyword}" into ${e.page}: ${e.reason}`);
  for (const r of run.brakes?.reasons ?? []) L.push(`- ${today} BRAKE: ${r}`);
  return L;
}

export function weeklyReport({ cfg, today, run, rows, ledger, state }) {
  const wk = isoWeek(today);
  const month = today.slice(0, 7);
  const cap = cfg.caps.monthlyUsd;
  const out = [];
  out.push(`# Growth report ${wk} (${today})`, '');
  out.push(`Status: **${run.halted ? 'HALTED' : 'running'}**${run.brakes?.reasons?.length ? `. ${run.brakes.reasons.join('; ')}` : ''}${run.dryRun ? ' (dry run, fixtures only)' : ''}`, '');
  out.push('## Spend this month', '', '| Service | Spent | Cap |', '|---|---|---|');
  for (const s of ['dataforseo', 'anthropic']) out.push(`| ${s} | $${ledger.spent(s, month).toFixed(4)} | $${cap[s]} |`);
  out.push('');
  out.push('## This run', '');
  out.push(`- Published: ${run.published?.length ?? 0} (${(run.published ?? []).map((p) => `${p.path} on ${p.publishDate}`).join(', ') || 'none'})`);
  out.push(`- Dropped drafts: ${run.dropped?.length ?? 0}`);
  out.push(`- Topics skipped: ${run.skipped?.length ?? 0}`);
  for (const s of (run.skipped ?? []).slice(0, 15)) out.push(`  - "${s.keyword}" (${s.stage}): ${s.reason}`);
  for (const d of run.dropped ?? []) out.push(`  - dropped "${d.keyword}": ${d.reason}`);
  out.push('');
  out.push('## Pages', '');
  if (!rows?.length) out.push('No loop-published page has reached its first measurement yet.');
  else {
    out.push('| Page | Age (d) | Clicks | Impressions | Position | Indexed | Decision |', '|---|---|---|---|---|---|---|');
    for (const r of rows) out.push(r.error ? `| ${r.slug} | ${r.age} | error: ${r.error} | | | | |` : `| ${r.path} | ${r.age} | ${r.clicks} | ${r.impressions} | ${f1(r.position)} | ${r.indexed ?? 'unknown'} | ${r.decision?.action} |`);
  }
  out.push('');
  out.push('## Open actions', '');
  const q = state.refreshQueue ?? [];
  if (!q.length) out.push('None.');
  for (const t of q) out.push(`- **${t.action}** ${t.page ?? t.slug}: ${t.reason}`);
  out.push('');
  return `${out.join('\n')}\n`;
}
