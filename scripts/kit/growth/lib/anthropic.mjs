// site-kit v0.1.0
// Minimal Anthropic Messages API client over fetch (no SDK dependency, so it
// runs the same in every site repo). Cost = usage x configured per-MTok price.
import fs from 'node:fs';
import path from 'node:path';

export function makeAnthropic({ cfg, ledger, fixturesDir = null, env = process.env }) {
  const live = !fixturesDir;
  const { models, maxTokens } = cfg.anthropic;
  const cap = cfg.caps.monthlyUsd.anthropic;

  return {
    live,
    models,
    /** messages: [{role, content}], returns { text, usage, cost, stopReason }. */
    async complete({ system, messages, label = 'draft', fixture = 'draft', rung = 0 }) {
      const { model, pricePerMTok } = models[rung];
      if (!live) {
        const f = path.join(fixturesDir, 'anthropic', `${fixture}.json`);
        if (!fs.existsSync(f)) throw new Error(`no Anthropic fixture ${f}`);
        ledger.record({ service: 'anthropic', endpoint: 'messages', cost: 0, note: `fixture ${label}` });
        return { model: 'fixture', text: fs.readFileSync(f, 'utf8'), usage: { input_tokens: 0, output_tokens: 0 }, cost: 0, stopReason: 'end_turn' };
      }
      if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
      // Stop before the call if a typical draft (~20k in, ~7k out) would pass the monthly cap.
      ledger.assertWithin('anthropic', (20000 * pricePerMTok.input + 7000 * pricePerMTok.output) / 1e6, cap);
      let last;
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
        });
        if (res.status === 429 || res.status >= 500) {
          last = `${res.status} ${(await res.text()).slice(0, 120)}`;
          await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
          continue;
        }
        const j = await res.json();
        if (!res.ok) throw new Error(`Anthropic ${res.status}: ${JSON.stringify(j).slice(0, 300)}`);
        const usage = j.usage ?? {};
        const cost = ((usage.input_tokens ?? 0) * pricePerMTok.input + (usage.output_tokens ?? 0) * pricePerMTok.output) / 1e6;
        ledger.record({ service: 'anthropic', endpoint: 'messages', cost, note: `${label} ${model} in=${usage.input_tokens} out=${usage.output_tokens}` });
        if (j.stop_reason === 'refusal') throw new Error('model refused the request');
        if (j.stop_reason === 'max_tokens') throw new Error('draft hit max_tokens (truncated); dropping');
        return { model, text: (j.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join(''), usage, cost, stopReason: j.stop_reason };
      }
      throw new Error(`Anthropic unavailable after retries: ${last}`);
    },
  };
}

/** Pull the first JSON object out of a model reply (tolerates code fences). */
export function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('no JSON object in model reply');
  return JSON.parse(body.slice(start, end + 1));
}
