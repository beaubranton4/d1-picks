// site-kit v0.1.0
/**
 * Health-claim gate for YMYL sites. Finds copy that claims something treats,
 * cures, prevents, reduces or detoxes, that cites "studies show", or that gives
 * recovery or post-surgery timelines. Deliberately blunt: a false positive on a
 * licensing or pricing page costs one rewrite; a false negative on a health
 * page is the exact thing the site's editorial policy forbids.
 *
 * Opt in per site: site.config.json `contentRules.healthClaims: true` (content
 * lint) and growth.config.json `gates.healthClaims: true` (growth lint gate).
 */
const N = '(?:\\d+|an?|one|two|three|four|five|six|seven|eight|nine|ten|twelve|several|few|couple)';
const SPAN = '(?:day|week|month|year|hour)s?';

export const HEALTH_RULES = [
  ['treats', /\b(?:treat(?:s|ed|ing)?|cure[sd]?|curing)\b/i],
  ['prevents', /\bprevent(?:s|ed|ing)?\b/i],
  ['reduces', /\b(?:reduc(?:e|es|ed|ing)|lessen(?:s|ed|ing)?|alleviat(?:e|es|ed|ing)|relie(?:ve|ves|ved|ving)|ease[sd]? (?:pain|swelling|inflammation|symptoms))\b/i],
  ['detoxes', /\b(?:detox\w*|flush(?:es|ed|ing)? (?:out )?(?:toxins|waste)|(?:remov|drain|eliminat)(?:e|es|ed|ing) toxins?)\b/i],
  ['heals', /\bheal(?:s|ed|ing)?\b/i],
  ['studies show', new RegExp(`\\b(?:studies|research|trials?|evidence|science|scientists|clinical (?:studies|research|trials?)|experts?|doctors?|physicians?|surgeons?|therapists?) (?:show|shows|showed|suggest|suggests|suggested|indicate|indicates|found|find|prove[sd]?|confirm(?:s|ed)?|demonstrate[sd]?|agree|recommend(?:s|ed)?)\\b`, 'i')],
  ['studies show', /\b(?:according to (?:a |one |recent |several |the )?(?:stud(?:y|ies)|research|trials?)|(?:a|one|recent|several|clinical) stud(?:y|ies) (?:of|on|in|from)|clinically (?:proven|shown|tested)|scientifically (?:proven|shown)|proven to|backed by (?:science|research|studies))\b/i],
  ['recovery', /\brecover(?:y|ies|ing|ed|s)?\b/i],
  ['recovery timeline', new RegExp(`\\b(?:within|after|for|about|around|up to|at least|first|next) ${N}(?:[- ]to[- ]${N})? ${SPAN}? ?(?:of|after|following|post)[- ]?(?:surgery|op\\b|operation|procedure|treatment)|\\b${N} ${SPAN} (?:after|post)[- ]?(?:surgery|op\\b|operation|procedure)|\\b(?:healing|downtime) (?:time|timeline|period|window)|\\bwait ${N} ${SPAN} (?:before|after)|\\bhow soon (?:can|should) you (?:start|begin|resume)`, 'i')],
];

const strip = (s) => String(s ?? '').replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ').replace(/\]\([^)\s]*\)/g, ']');

/** @returns {{rule:string, match:string, line:number}[]} one entry per hit, deduped per rule and phrase */
export function findHealthClaims(text) {
  const clean = strip(text);
  const hits = [];
  const seen = new Set();
  for (const [rule, re] of HEALTH_RULES) {
    const g = new RegExp(re.source, 'gi');
    for (const m of clean.matchAll(g)) {
      const key = `${rule}:${m[0].toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ rule, match: m[0], line: clean.slice(0, m.index).split('\n').length });
    }
  }
  return hits;
}

export const describeHealthClaims = (text) => findHealthClaims(text).map((h) => `health claim (${h.rule}): "${h.match}"`);
