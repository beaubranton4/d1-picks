---
description: Pre-launch / pre-merge gate. Lints content, runs unit tests, builds, starts the app in production mode, then runs the site audit, the prerender check and the robots check. Reports pass/fail per step. Usage: /kit-preflight
---
<!-- site-kit v0.1.0 -->

# Preflight

Run every automated check the kit has, against a real production build, and
report one table. This is the same sequence CI runs (`.github/workflows/ci.yml`);
run it locally before opening a PR or launching a site.

## Steps

Run from the repo root. Stop at the first failing step only if later steps
depend on it (a failed build means there is nothing to audit); otherwise run
everything and report all failures together.

1. **Kit stamps:** `node scripts/kit/kit-stamp.mjs`
2. **Content lint:** `npm run lint:content` (add `-- --base origin/main` on a branch to catch backdated new pages)
3. **Unit tests:** `npm test`
4. **Build:** `npm run build`. A thrown `[site-kit]` error here is a real content or SEO bug (missing/short meta description, unknown author, unverified listing). Fix the cause; never weaken the check.
5. **Start production server** in the background on a free port, and wait for it:
   ```bash
   VERCEL_ENV=production npx next start -p 3210 > /tmp/preflight-server.log 2>&1 &
   for i in $(seq 1 60); do curl -sf http://localhost:3210/ > /dev/null && break; sleep 1; done
   ```
6. **Site audit:** `node scripts/kit/audit-site.mjs http://localhost:3210`
7. **Prerender check:** `node scripts/kit/prerender-check.mjs --base http://localhost:3210 --all`
8. **Robots in preview mode** (robots.txt is evaluated per request, so the same build answers for both environments):
   ```bash
   VERCEL_ENV=preview npx next start -p 3211 > /tmp/preflight-preview.log 2>&1 &
   for i in $(seq 1 60); do curl -sf http://localhost:3211/ > /dev/null && break; sleep 1; done
   curl -s http://localhost:3211/robots.txt | grep -q '^Disallow: /$' && echo "preview robots: disallow (ok)"
   ```
9. **Stop both servers** (`pkill -f "next start -p 321"`).

## Report

One table, one row per step: step, PASS/FAIL, and the key number (errors,
warnings, URLs audited). Under it, list each failure with the file or URL and
the fix. Do not summarize passing steps beyond the table.

If everything passes, say so in one line. Lighthouse-level checks (LCP < 2s,
CLS < 0.05) need a public URL: after deploy, run
`node scripts/kit/psi.mjs https://<canonicalHost>/ https://<canonicalHost>/<a content page>`.
