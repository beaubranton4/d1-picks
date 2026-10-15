// site-kit v0.1.0
import { parseArgs } from 'node:util';
export function cli(usage, options = {}) {
  let parsed;
  try {
    parsed = parseArgs({ options: { help: { type: 'boolean', short: 'h' }, ...options }, allowPositionals: true, strict: true });
  } catch (e) {
    console.error(`${e.message}\n\n${usage.trim()}`);
    process.exit(2);
  }
  if (parsed.values.help) {
    console.log(usage.trim());
    process.exit(0);
  }
  return parsed;
}
