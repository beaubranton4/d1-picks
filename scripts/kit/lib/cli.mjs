// site-kit v0.1.0
/**
 * Tiny CLI helper over node:util parseArgs: typed flags, positionals, and a
 * --help that prints the script's usage without touching the network or any
 * credential file.
 */
import { parseArgs } from 'node:util';

/**
 * @param {string} usage  help text printed for --help
 * @param {Record<string, {type: 'string'|'boolean', default?: any, multiple?: boolean, short?: string}>} options
 */
export function cli(usage, options = {}) {
  let parsed;
  try {
    parsed = parseArgs({
      options: { help: { type: 'boolean', short: 'h' }, ...options },
      allowPositionals: true,
      strict: true,
    });
  } catch (e) {
    console.error(`${e.message}\n\n${usage.trim()}`);
    process.exit(2);
  }
  if (parsed.values.help) {
    console.log(usage.trim());
    process.exit(0);
  }
  return { values: parsed.values, positionals: parsed.positionals };
}

/** Integer flag with a default. */
export const int = (v, d) => (v === undefined ? d : Number.parseInt(String(v), 10));
