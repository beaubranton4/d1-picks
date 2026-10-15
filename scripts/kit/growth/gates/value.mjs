// site-kit v0.1.0
// Gate 4: every page needs something an AI Overview cannot replace: a working
// tool, original data, or verified facts with citations. Declared in
// draft.value and checked independently.
import fs from 'node:fs';
import { abs } from '../lib/config.mjs';

const links = (body) => [...body.matchAll(/\]\((\/[^)\s#?]*)/g)].map((m) => m[1].replace(/\/$/, '') || '/');

export function valueDraft(draft, ctx) {
  const { cfg, factcheck } = ctx;
  const v = draft.value ?? {};
  const f = [];
  const types = [];
  if (v.type === 'tool') {
    const tool = cfg.content.tools.find((t) => t.path === v.tool);
    if (!tool) f.push(`tool "${v.tool}" is not registered in growth.config.json content.tools`);
    else if (tool.file && !fs.existsSync(abs(tool.file))) f.push(`tool file ${tool.file} does not exist`);
    else if (!links(draft.body).includes(tool.path)) f.push(`body never links to the tool ${tool.path}`);
    else types.push('tool');
  } else if (v.type === 'data') {
    const asset = cfg.content.dataAssets.find((a) => a.file === v.dataFile);
    if (!asset || !fs.existsSync(abs(asset.file))) f.push(`data asset "${v.dataFile}" is not registered or does not exist`);
    else types.push('data');
  } else if (v.type === 'facts') {
    const s = factcheck?.stats;
    if (!s) f.push('facts value needs the fact-check results');
    else if (s.verifiedBlocks < cfg.gates.minVerifiedBlocks) f.push(`only ${s.verifiedBlocks} verified cited fact block(s); need ${cfg.gates.minVerifiedBlocks}`);
    else if (s.domains.length < cfg.gates.minSourceDomains) f.push(`only ${s.domains.length} distinct cited source domain(s); need ${cfg.gates.minSourceDomains}`);
    else types.push('facts');
  } else f.push('draft declares no value type (tool, data or facts)');
  return { name: 'value', pass: f.length === 0, failures: f, stats: { types } };
}
