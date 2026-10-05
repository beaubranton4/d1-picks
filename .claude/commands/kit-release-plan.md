---
description: Assign future publishDates to drafted pages at no more than 3 editorial pages per week, interleaving topic clusters, never backdating. Verified directory pages may ship together. Usage: /kit-release-plan [new files or a cluster name]
---
<!-- site-kit v0.1.0 -->

# Release plan

Bulk drops of similar pages look programmatic to Google's helpful-content and
spam systems. The kit gates every page on a date; this command picks the dates.

## Rules

- **At most `releaseCadence.maxEditorialPerWeek` (default 3) editorial pages per ISO week**, counting MDX entries and `content/release-schedule.json` paths together. `lint-content` enforces it.
- **Never backdate.** A new page's date is today or later. `publishDate` becomes the Article `datePublished`; a past date is a false statement. (`lint-content --base origin/main` fails a backdated new page.)
- **Interleave clusters.** Do not release three pages on the same topic in one week; alternate clusters so each week reads as normal editorial output.
- **Space releases at least 2 days apart** within a week (e.g. Mon/Wed/Fri).
- **Verified directories may ship together.** Directory pages whose every listing has `source_url` + `verified_at` match `releaseCadence.exemptPaths` and can share one date. Unverified listings never ship.
- **Do not reschedule released pages.** Changing a past date rewrites history.
- **Updates are not releases.** A material update sets `updatedDate` on the day it ships; it does not move `publishDate`.

## Steps

1. Show the current calendar: `npm run release:calendar` (add `-- --past` for history).
2. List the pages to schedule: the files named in `$ARGUMENTS`, or every MDX entry with no `publishDate`, or a date in the past that has not shipped yet (check `git log` for whether it was ever live), plus new routes not yet in `content/release-schedule.json`.
3. Group them by cluster (shared topic/tags). Rank within a cluster by the opportunity score from the latest content-gap brief in `docs/content-briefs/` if one exists; otherwise by search volume.
4. Fill weeks from the first week with capacity, round-robin across clusters, up to the cap, on spaced weekdays. Directory pages backed by verified data may go out together on one date.
5. Write the dates: MDX gets `publishDate: "YYYY-MM-DD"` (quoted) in frontmatter; non-MDX routes get a `content/release-schedule.json` entry. Hub pages that would be empty until their first child releases get the date of that first child.
6. Verify: `npm run lint:content` and `npm run release:calendar` show no week over the cap.
7. Commit with a message listing each path and its date, so the cadence is legible in history.

## Report

The resulting calendar as a table (week, date, path, cluster), and the commit hash.
