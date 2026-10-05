---
description: Size up a competitor site from public signals only. Revenue proxy, distribution (one DataForSEO call), shipped vs marketed, who is behind it, and a verdict with re-check triggers. Usage: /kit-competitor-recon [domain]
---
<!-- site-kit v0.1.0 -->

# Competitor recon

One question: **is this site actually taking our searchers or customers, or does it just have a website?**
Target: `$ARGUMENTS`. Compare against this site (`site.config.json` `domain`) and the segment leaders.

## Scope rules

- **Public signals only:** public pages, public JS bundles, public registries, public APIs.
- **Never probe authentication, admin routes, exposed database rules or anything access-controlled.** Seeing a Firebase/Supabase config in a client bundle is normal; testing whether its rules are open is unauthorized testing. Do not.
- **Ask before creating an account** on the target (it uses the owner's identity).
- **One DataForSEO call per target.**

> This file is a slash command: a dollar sign followed by a digit is replaced by
> invocation arguments. Write money as "USD 12" in this file.

## Phase 1: is anyone paying them?

Read the pricing page first; published tiers with an annual discount and trial
length are the strongest signal. Then the bundle check:

```bash
cd "$(mktemp -d)" && curl -s -m 20 "https://TARGET" -o home.html
grep -oE '<script[^>]*src="[^"]+"' home.html | sed 's/.*src="//;s/"//' | grep -E '^/' | sort -u > chunks.txt
wc -l < chunks.txt   # zero means the check did not run; it is not a clean result
while read c; do curl -s -m 20 "https://TARGET$c" -o "chunk_$(echo "$c" | md5 -q).js"; done < chunks.txt
cat chunk_*.js home.html > all_js.txt
for p in 'js\.stripe' 'stripe\.com' 'pk_live' 'pk_test' 'paddle\.com' 'braintree' 'chargebee' 'lemonsqueezy' 'checkout\.session' 'revenuecat'; do
  n=$(grep -oiE "$p" all_js.txt | wc -l); [ "$n" -gt 0 ] && echo "PAYMENT $p: $n"
done
grep -oE 'G-[A-Z0-9]{8,}|GTM-[A-Z0-9]{6,}|ca-pub-[0-9]+|tag=[a-z0-9-]+-20' all_js.txt home.html | sort -u
```

- `pk_live_` key: charging real money client-side.
- `pk_test_` only: billing built, not launched.
- Published prices but no payment SDK: says little (hosted checkout and in-app purchase leave bundles clean). Do not report "no revenue".
- Ad/affiliate IDs (`ca-pub-`, Amazon `tag=...-20`): monetized content site.
- No pricing, no SDK, no app listing, no ad/affiliate IDs: now you can say pre-revenue.

## Phase 2: distribution

```bash
whois DOMAIN | grep -iE "creation date|registrar:|registrant organization|registrant state"
curl -s -o /dev/null -w "sitemap:%{http_code}\n" https://DOMAIN/sitemap.xml
curl -s "https://web.archive.org/cdx/search/cdx?url=DOMAIN&output=json&fl=timestamp&collapse=digest&limit=40"
```

Count sitemap URLs (true page count) and look at how fast they appeared:
hundreds of near-identical pages in a week is a programmatic drop that may not
last. One DataForSEO call, always including us and a known leader for scale:

```
POST /v3/dataforseo_labs/google/bulk_traffic_estimation/live
[{"targets":["TARGET","<our domain>","<segment leader>"],"location_code":2840,"language_code":"en","item_types":["organic"]}]
```

`etv` is a model (ranking keywords x volume x expected CTR, US Google organic
only), not measured traffic. Below about 100 estimated visits a month its
precision is fake: report the ranking-keyword count and say "effectively no
organic search presence" instead of quoting a visit number. Never infer "no
users" from a low etv.

## Phase 3: shipped vs marketed

Count what the homepage claims against what is reachable. For content and
directory sites: are listings verified and sourced, or scraped and stale?
Check five listings against the businesses' own sites. Fabricated or stale
listings are a weakness to beat, never a pattern to copy.

## Phase 4: who is behind it

whois registrant, governing-law clause and effective date in /terms, the
founder's public profile, the state business registry. Crunchbase only if
there is a funding rumor.

## Output

1. One-line verdict: real threat / watch / ignore.
2. Revenue proxy finding, stated plainly.
3. Distribution table vs our domain and the leader.
4. Overlap with our plans, and whether each overlapping item has independent evidence to build it (a competitor's page list is never evidence).
5. Re-check triggers (pricing published, organic keywords over 500, a named customer, funding, a big sitemap jump).
6. Cost line: the number of DataForSEO calls and the cost the API reported. Never invent a figure.

Save the findings with the date to `docs/competitors/<domain>.md` so the next check is a diff.

## Do not

Re-plan around a competitor's marketing page, pay for SimilarWeb-style
estimates on small targets, name competitors in site copy, or run more than
one DataForSEO call per target.
