// site-kit v0.1.0
// Cost ledger (JSONL) and per-service monthly spend caps. Costs are always the
// figure the API reported (DataForSEO `cost`, Anthropic `usage` x price), never a guess.
import fs from 'node:fs';
import path from 'node:path';
import { growthDir } from './config.mjs';

export class CapError extends Error {}

export class Ledger {
  /** @param {{persist:boolean,file:string}} o  persist=false keeps entries in memory (dry runs) */
  constructor({ persist = true, file } = {}) {
    this.persist = persist;
    this.file = file;
    this.entries = [];
    if (persist && file && fs.existsSync(file)) {
      this.entries = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    }
  }
  static forConfig(cfg, { persist = true } = {}) {
    return new Ledger({ persist, file: path.join(growthDir(cfg), 'ledger.jsonl') });
  }
  record(entry) {
    const e = { ts: new Date().toISOString(), ...entry };
    this.entries.push(e);
    if (this.persist && this.file) {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.appendFileSync(this.file, `${JSON.stringify(e)}\n`);
    }
    return e;
  }
  spent(service, month = new Date().toISOString().slice(0, 7)) {
    return this.entries.filter((e) => e.service === service && e.ts.startsWith(month)).reduce((s, e) => s + (e.cost || 0), 0);
  }
  /** Throws CapError when `estimate` more would pass the monthly cap. */
  assertWithin(service, estimate, cap) {
    const spent = this.spent(service);
    if (cap != null && spent + estimate > cap) {
      throw new CapError(`${service} monthly cap $${cap} would be exceeded (spent $${spent.toFixed(4)}, next call ~$${estimate})`);
    }
  }
}
