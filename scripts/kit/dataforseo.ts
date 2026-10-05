#!/usr/bin/env node
// site-kit v0.1.0
/**
 * Thin DataForSEO REST wrapper for scripts and slash commands.
 *
 * Runs on Node 22.18+ directly (`node scripts/kit/dataforseo.ts ...`): the
 * file uses only erasable TypeScript, so no tsx or build step is needed.
 *
 * Auth: DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD from the environment, or from
 * .env.local in the current directory if present.
 *
 * Output: tasks[0].result as JSON on stdout; cost + status on stderr. POST
 * bodies may be a single object (auto-wrapped to [{...}] as the API requires).
 * Every call costs money: one targeted call beats a speculative batch.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const USAGE = `
Usage: node scripts/kit/dataforseo.ts [--get] <path> [json-body]

Examples:
  node scripts/kit/dataforseo.ts --get v3/appendix/user_data
  node scripts/kit/dataforseo.ts v3/dataforseo_labs/google/keyword_suggestions/live \\
    '{"keyword":"library card","location_code":2840,"language_code":"en","limit":50}'
  node scripts/kit/dataforseo.ts v3/serp/google/organic/live/advanced \\
    '{"keyword":"how to get a library card","location_code":2840,"language_code":"en","depth":10}'

Env: DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD (or .env.local)
`.trim();

const args = process.argv.slice(2);
if (!args.length || args.includes('--help') || args.includes('-h')) {
  console.log(USAGE);
  process.exit(args.length ? 0 : 2);
}

const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const login = process.env.DATAFORSEO_LOGIN;
const password = process.env.DATAFORSEO_PASSWORD;
if (!login || !password) {
  console.error('Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD (env or .env.local)');
  process.exit(1);
}

const isGet = args[0] === '--get';
const apiPath = (isGet ? args[1] : args[0])?.replace(/^\/+/, '');
const body = isGet ? undefined : args[1];
if (!apiPath) {
  console.error(USAGE);
  process.exit(2);
}

let payload: string | undefined;
if (body) {
  const parsed: unknown = JSON.parse(body);
  payload = JSON.stringify(Array.isArray(parsed) ? parsed : [parsed]);
}

type ApiResponse = {
  status_code: number;
  status_message: string;
  cost: number;
  tasks?: Array<{ status_code: number; status_message: string; cost: number; result_count: number; result: unknown }>;
};

const res = await fetch(`https://api.dataforseo.com/${apiPath}`, {
  method: isGet ? 'GET' : 'POST',
  headers: {
    Authorization: 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64'),
    'Content-Type': 'application/json',
  },
  body: payload,
});
const data = (await res.json()) as ApiResponse;
if (data.status_code !== 20000) {
  console.error(`API error: ${data.status_code} ${data.status_message}`);
  process.exit(1);
}
const task = data.tasks?.[0];
console.error(`[dataforseo] $${(data.cost ?? 0).toFixed(4)} | ${task?.status_message ?? 'ok'} | ${task?.result_count ?? 0} results`);
if (task && task.status_code !== 20000) {
  console.error(`Task error: ${task.status_code} ${task.status_message}`);
  process.exit(1);
}
console.log(JSON.stringify(task?.result ?? null, null, 2));
