#!/usr/bin/env node
// site-kit v0.1.0
// Regenerates the offline fixtures (dry-run and tests). Source files are named
// by the sha1 of their normalized URL, exactly as lib/sources.mjs looks them up.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const w = (rel, data) => {
  const f = path.join(here, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, typeof data === 'string' ? data : `${JSON.stringify(data, null, 2)}\n`);
};
const hash = (u) => crypto.createHash('sha1').update(u.replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase()).digest('hex').slice(0, 10);

const SRC1 = 'https://libraries.example/help/renew-your-card';
const SRC2 = 'https://cityreads.example/card-policies';
const SRC3 = 'https://ala.example/guides/library-cards';
const filler = 'Library staff process these requests at the circulation desk and by phone during regular branch hours, and every branch can answer questions about account standing, holds, and fines that may block a renewal. ';
const page = (title, body) => `<html><head><title>${title}</title></head><body><nav>menu</nav><main><h1>${title}</h1>${body}</main><footer>footer</footer></body></html>`;

w(`sources/${hash(SRC1)}.html`, page('Renew your library card', `<p>Library cards expire after 3 years. You can renew online up to 30 days before the expiration date, or at any branch with a photo ID.</p><p>Renewal is free. A replacement for a lost card costs $2 at the circulation desk.</p><p>Renewal is blocked when an account owes more than $10 in fines. Pay the balance first, then renew.</p><p>${filler.repeat(3)}</p>`));
w(`sources/${hash(SRC2)}.html`, page('Card policies', `<p>Cardholders may keep up to 50 items checked out at once. Most books circulate for 21 days and can be renewed 2 times if no one has a hold.</p><p>Digital loans of ebooks last 14 days. Overdue fines for physical items are $0.25 per day, capped at $5 per item.</p><p>${filler.repeat(3)}</p>`));
w(`sources/${hash(SRC3)}.html`, page('Library cards', `<p>More than 16,000 public library outlets in the United States issue cards, and most cards are free to residents.</p><p>Many systems accept a utility bill or lease as proof of address.</p><p>${filler.repeat(3)}</p>`));

w('dfs/suggestions-default.json', {
  status_code: 20000,
  cost: 0.0112,
  tasks: [{ status_code: 20000, result: [{ items: [
    { keyword: 'how to renew library card online', keyword_info: { search_volume: 880, cpc: 0.4 }, keyword_properties: { keyword_difficulty: 12 }, search_intent_info: { main_intent: 'informational' } },
    { keyword: 'library card replacement fee', keyword_info: { search_volume: 320, cpc: 0.3 }, keyword_properties: { keyword_difficulty: 8 }, search_intent_info: { main_intent: 'informational' } },
    { keyword: 'what is a library card number', keyword_info: { search_volume: 1900, cpc: 0.1 }, keyword_properties: { keyword_difficulty: 20 }, search_intent_info: { main_intent: 'informational' } },
    { keyword: 'how to get a library card online', keyword_info: { search_volume: 1300, cpc: 0.2 }, keyword_properties: { keyword_difficulty: 15 }, search_intent_info: { main_intent: 'informational' } },
    { keyword: 'library hours near me', keyword_info: { search_volume: 9000, cpc: 0.2 }, keyword_properties: { keyword_difficulty: 30 }, search_intent_info: { main_intent: 'navigational' } },
  ] }] }],
});

const organic = (urls) => urls.map((u, i) => ({ type: 'organic', rank_group: i + 1, url: u, domain: new URL(u).hostname, title: `Result ${i + 1}` }));
w('dfs/serp-default.json', { status_code: 20000, cost: 0.006, tasks: [{ status_code: 20000, result: [{ item_types: ['organic'], items: organic([SRC1, SRC2, SRC3]) }] }] });
w('dfs/serp-what-is-a-library-card-number.json', { status_code: 20000, cost: 0.006, tasks: [{ status_code: 20000, result: [{ item_types: ['ai_overview', 'organic'], items: [{ type: 'ai_overview', markdown: 'A library card number is the unique identifier printed on your card, usually 14 digits, that you use with a PIN to log in to the catalog, place holds and borrow digital titles. You can find it on the back of the card or in your library account page.', references: [{ domain: 'ala.example' }] }, ...organic([SRC3, SRC1])] }] }] });

// The reply the model would give for "how to renew library card online".
const body = `Renewing a library card takes a few minutes when the account is in good standing. This page walks through the renewal rules, what blocks a renewal, and what it costs to replace a lost card, using the policy pages of public library systems.

## When a library card expires

Many systems issue cards that last a fixed term. At the [Libraries Example help center](${SRC1}), cards expire after 3 years, and renewal opens 30 days before the expiration date. Renewing early does not shorten the new term, so there is no reason to wait for the last day.

Check the date on your account page, not the date printed on a plastic card, because some systems extend a card automatically when you borrow a digital title.

## How to renew online

Online renewal is the fastest route when your library offers it. [Libraries Example](${SRC1}) lets cardholders renew online during the 30 day window, or in person at any branch with a photo ID.

1. Sign in to your library account with your card number and PIN.
2. Open the account or profile page and look for a renew card or update account link.
3. Confirm your address and contact details. Libraries use these to verify residency.
4. Submit the form and watch for a confirmation email.

If the option is missing, your library may require an in-person visit. Call the main branch and ask what the renewal rule is for your card type.

## What blocks a renewal

Fines are the most common blocker. At [Libraries Example](${SRC1}), renewal is blocked when an account owes more than $10 in fines. Pay the balance on the account page or at the desk, then renew.

Other common blockers are an expired address verification and long overdue items that were never returned. Both are usually cleared at the circulation desk in a single visit.

## What it costs

Renewal itself is usually free. The [same help center](${SRC1}) lists a $2 fee for a replacement of a lost card at the circulation desk. A library system with a different fee schedule will publish it on its own card policy page, so confirm the figure with your own library before you go.

## Loan limits that come with the card

A renewed card carries the same borrowing rules as before. According to the [City Reads card policies](${SRC2}), cardholders may keep up to 50 items checked out at once, and most books circulate for 21 days with 2 renewals when nobody has a hold.

Digital loans work differently. The [same policy page](${SRC2}) says ebook loans last 14 days. Overdue fines on physical items are $0.25 per day, capped at $5 per item, which matters because accrued fines are what block a renewal.

| Rule | Value | Source |
|---|---|---|
| Card term | 3 years | [Libraries Example](${SRC1}) |
| Renewal window | 30 days before expiry | [Libraries Example](${SRC1}) |
| Replacement fee | $2 | [Libraries Example](${SRC1}) |
| Checkout limit | 50 items | [City Reads](${SRC2}) |
| Ebook loan | 14 days | [City Reads](${SRC2}) |

## Proof of address when you renew

Some systems ask for proof of address at renewal even when you already hold a card. The [ALA guide to library cards](${SRC3}) notes that many systems accept a utility bill or a lease as proof of address. Bring one document with your name and current address so a single trip is enough.

If you have moved to a new city, you may need a new card for the new library system instead of a renewal. Residency rules differ, and a card from one system rarely works at another. Our guide to [getting a library card](/guides/how-to-get-a-library-card) covers the first application, and the [guides index](/guides) lists the rest of our library help.

## A short checklist before you renew

- Look at your account page for the real expiration date.
- Clear any fines on the account first.
- Have a photo ID and one proof of address ready if you go in person.
- Update your email address so renewal reminders reach you.
- Ask whether your library extends the card when you borrow digital titles.

## What these sources do not tell you

The policies above belong to specific library systems. Your own library may use a different term, fee or fine rule, and the numbers here should be treated as examples of how systems write these rules rather than a national standard. The page for your library's card services is the final word, and a call to the circulation desk settles anything unclear.

For a library with a fine-free policy, the fines section does not apply, and renewal depends mostly on the address check. Fine-free systems still charge for lost or damaged items, which can block an account until the balance is cleared.

## Common questions about renewing

People often ask whether a renewed card keeps the same number. In most systems it does, which keeps holds and reading history intact. Others reissue a number when the card type changes, so read the confirmation email carefully and note any new number it lists. Another frequent question is whether a child's card renews on its own. Policies vary, and many systems ask a parent or guardian to confirm the address once the child reaches a certain age.

If you travel often, check whether the digital collection keeps working after the physical card expires. Some libraries pause digital access on the expiration date, while others allow a short grace period. When in doubt, renew a few days before you leave, and keep the confirmation email until the new card or the updated account page shows the new date.`;
w('anthropic/draft.json', JSON.stringify({
  title: 'How to Renew a Library Card Online: Rules and Fees',
  slug: 'how-to-renew-a-library-card-online',
  category: 'guides',
  excerpt: 'How library card renewal works, when the renewal window opens, what blocks a renewal and what a replacement costs, from public library policy pages.',
  keywords: ['how to renew library card online', 'library card renewal', 'library card replacement fee'],
  body,
  value: { type: 'facts' },
  sources_used: [SRC1, SRC2, SRC3],
}, null, 2));

w('google/query-pages.json', [
  { keys: ['how to get a library card', '/guides/how-to-get-a-library-card'], clicks: 12, impressions: 480, ctr: 0.025, position: 11.4 },
  { keys: ['library card replacement fee', 'https://example.com/'], clicks: 0, impressions: 140, ctr: 0, position: 52 },
  { keys: ['library card requirements by state', '/guides/how-to-get-a-library-card'], clicks: 1, impressions: 90, ctr: 0.01, position: 24 },
]);
w('google/page-totals.json', {});
w('google/site-totals.json', { default: { clicks: 40, impressions: 1200 } });
w('google/inspect.json', {});
w('google/ga4.json', {});
console.log('fixtures written');
