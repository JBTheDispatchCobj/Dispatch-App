# Dispatch — GTM state ledger

*Canonical state-of-affairs for go-to-market work. Closure ledger, current active inventory, recommended next chases, open partner/customer questions, standing-tabled items.*

*Update this doc inline as items close. Add new entries to "Open partner/customer questions" and "Standing tabled" as discovered. Do not recreate the daily chase narrative as separate docs — STATE.md carries the per-chase ledger inline.*

---

## What the GTM lane is

Dispatch's go-to-market track, parallel to the product engineering track at `docs/STATE.md`. Where product STATE.md tracks the code-side beta to launch, this GTM STATE.md tracks: positioning, ICP, pricing, outbound, marketing site, partnerships, funnel, case studies, investor narrative.

The two tracks meet at: ICP-informed product priorities, marketing-site content sourced from KB substrate, customer success informing the product backlog. But the operational cadences are separate — product chases close in commits; GTM chases close in customer-facing artifacts + decisions.

---

## What ships today (GTM)

- Competitive positioning substrate authored — `docs/gtm/lanes/01-positioning.md`
- ICP locked + pricing model proposed — `docs/gtm/lanes/02-icp-and-pricing.md`
- Outbound system scoped (beta + post-beta motions) + 8-channel sourcing framework with Bryan verdicts + automation backlog — `docs/gtm/lanes/03-outbound.md`
- Marketing site planning doc with 6 decisions surfaced + recommendations — `docs/gtm/lanes/04-marketing-site.md`
- Prospect list pass 1 (15 hotels WI + VT, PMS-detection trick load-bearing) — `docs/gtm/prospect-list.md`
- Revify call-2 brief authored — `docs/gtm/briefs/revify-call-2.md`
- Jennifer extract call brief authored (Lane VII.A; execution deprioritized to bottom of stack) — `docs/gtm/briefs/jennifer-extract-call.md`
- GTM master plan + STATE.md scaffolding — this doc + `docs/gtm/MASTER_PLAN.md`

## What's NOT yet authored (cross-reference MASTER_PLAN.md)

- Lane VI — funnel + onboarding
- Lane VIII — investor narrative

---

## Closure ledger — GTM items closed (Day 53)

- ✓ **Lane I (Positioning) — substrate authored** Day 53 chase #4. Competitive landscape map (19 buyer-evaluated URLs categorized + true head-to-head set identified), Path A/B/C strategic fork (Path A locked), wedge defined as orchestration that adapts to variable turnover, category-creation pitch lines drafted, demo script anchored on four mutation dimensions, ResNexus narrative codified, brand-awareness-gap risk surfaced. Sub-items I.G + I.H still open (SEO foundation + per-PMS switching guides).
- ✓ **Lane II (ICP + pricing) — substrate authored** Day 53 chase #4. ICP locked (independent boutique + franchisee, under 100 rooms, sub-4.5-star). Variable-turnover pain defined (four mutation dimensions). Pricing model proposed ($5-7/room/month, $99/month minimum, transparent published). Sub-items II.D-II.G partial (buyer personas, sub-segment prioritization detail, pricing benchmark instrumentation, packaging).
- ✓ **Lane V.A (Revify partnership eval) — call-2 brief authored** Day 53 chase #4. Decoded operating model (dual-pricing surcharge + ISO + rebate). Identified boutique-hospitality fit concern. Built 3-block call agenda (operating model, partnership economics, dealbreaker test). Angel-check angle analyzed (real, wrong timing on call-2; seed-plant for call-3).
- ✓ **GTM master plan scaffolding** Day 53 chase #4. `docs/gtm/MASTER_PLAN.md` + this STATE.md + folder structure (lanes/, briefs/) shipped. Mirrors product-side `docs/dispatch-master-plan.md` + `docs/STATE.md` structure.
- ✓ **Lane VII.A — Jennifer extract call brief authored** Day 53 chase #5. `docs/gtm/briefs/jennifer-extract-call.md` — 60-min interview structure (warm-up / quote extraction / metrics / wrap), pre-call setup checklist, post-call action plan, candidate-quote approval-back flow. Designed to extract Jennifer's operator voice not co-founder voice. Call execution itself deprioritized per Bryan — moved to bottom of recommended-next-chases stack pending other-lane forward motion.
- ✓ **Lane III — Outbound system scoped** Day 53 chase #5. `docs/gtm/lanes/03-outbound.md` — beta motion (2-10 hotels: hand-curated, founder-led, no tools needed, ~$435 budget over 8 weeks) explicitly split from post-beta motion (10-100 hotels: Apollo + Clay + Attio + SDR/VA stack, ~$1,800-3,400/month). Three trigger-language hooks (diagnostic / variable-turnover / operator-credibility) ready to A/B test in beta. Three sub-segment first-list playbooks. Beta-stage 8-week timeline with week-by-week actions.
- ✓ **Recommended-chases reprioritization** Day 53 chase #5. Lane VII.A moved from position #2 to position #5; Lane III promoted to position #2 (highest priority chase we can advance without waiting on Bryan-side execution).
- ✓ **Lane III prospect list pass 1 authored** Day 53 chase #6. `docs/gtm/prospect-list.md` — 15 hotels sourced (8 WI Door County + 7 VT), 4 fully enriched with PMS detection + contact paths, 11 named but un-enriched. **Load-bearing find: PMS-detection-from-booking-widget-URL trick** — every hotel's PMS is detectable by clicking "Book Now" and parsing the redirect subdomain. Single highest-leverage outbound insight surfaced this session. Inn at Montpelier flagged as highest-priority cold outreach (on RezStream — same PMS as Jennifer's hotel; natural narrative fit, zero PMS-fit objection). On The River Inn deprioritized (Imprint Hospitality-managed = corporate-managed, negative ICP).
- ✓ **Lane III multi-channel sourcing framework + Bryan-validated channel verdicts** Day 53 chase #7. Lane III doc restructured around 8 sourcing channels organized by Bryan's priority verdicts. **Tier 1 GOLD (automate):** job postings (operational-pain trigger) + negative review mining (leading-indicator). **Tier 2 hybrid:** AAHOA franchisee directory (approved $295/year), hospitality consultants (automate discovery + outreach, hand off to Bryan after reply). **Tier 3 Bryan-manual:** supplier partnerships, conferences. **Tier 4 deferred:** state innkeeper association paid memberships (scrape public directories pre-funding). **Dropped:** co-founder operator network referrals. Plus automation backlog ordered (PMS-detection agent first, then job-posting scraper, negative review monitor, consultant outreach sequencer, AAHOA scraper, state association scrapers). Foundation principle: all channels funnel into the same enriched prospect-list CSV.
- ✓ **Lane IV marketing site planning doc authored** Day 53 chase #8. `docs/gtm/lanes/04-marketing-site.md` — Six decisions surfaced for Bryan to lock before any site build: (A) brand reference (recommendation: hybrid hospitality-color + B2B-SaaS-typography; Linktree-style explicitly rejected), (B) content scope (4 minimum-viable pages: Homepage / Pricing / Demo Request / Privacy+Terms), (C) tech stack (recommendation: Next.js in new `dispatch-marketing` repo), (D) domain (recommendation: dispatchhq.com primary, dispatchhotels.com fallback), (E) demo video (pair with Lane VII.A extract trip), (G) launch sequencing (recommendation: Option 3 phased — ship in ~2 weeks with placeholder hero, enrich progressively). SEO foundation (IV.F) deferred to post-first-case-study. Plan mode — no build started.

---

## Recommended next chases (priority-ordered)

1. **Lane V.A close — Revify call-2 outcome + decision.** TIME-SENSITIVE (call this week). Outcome of the call → either close the partnership question with "yes-on-fit, negotiate-economics" or "no-on-fit, walk away cleanly" or "open: needs more info." Brief lives at briefs/revify-call-2.md. Bryan-side execution.
2. **Lane III — Outbound system scoping.** Define ICP precision exercise (room count, PMS-in-use, geography), pick sourcing layers, propose stack (sourcing + enrichment + sequencing + CRM + handoff), size for hand-curated 2-10 beta + post-beta scale. Plan first, build second. **AUTHORED Day 53 chase #5 — see `lanes/03-outbound.md`.**
3. **Lane IV.A — Marketing site brand reference selection.** Decide Linktree-style (Refero tokens) vs operational-hospitality-warm (mirror app aesthetic) vs hybrid. Gates Lane IV.B-F.
4. **Lane VIII — Investor narrative scaffold.** Strategic angel list, TAM/SAM/SOM model skeleton, seed-round sizing. Pairs with Revify angel-seed-plant outcome.
5. **Lane VII.A — Jennifer case study production.** *(Deprioritized Day 53 chase #5 per Bryan — fine idea, moved to bottom of active stack pending forward motion on other lanes.)* Get her quote in writing + pre/post-Dispatch metrics. Brief authored at `briefs/jennifer-extract-call.md` — call execution scheduled when Bryan's bandwidth allows.

---

## Open partner/customer questions

*Mirror of product-side "Open Jennifer questions" but for GTM. Anything we need answered by a customer / partner / external party.*

- **Revify operating model (call-2 to resolve).** Underlying processor name, surcharge UX in hospitality, state legality coverage, PMS integrations, all-in cost stack, non-surcharge tier existence. See `briefs/revify-call-2.md`.
- **Revify partnership economics (call-2 to resolve).** Exact definition of "50/50 split on bps," contract length, exclusivity, termination, ongoing rev share, implementation timeline.
- **Jennifer's switching-narrative quote.** The sentence explaining why she chose Dispatch over the ResNexus housekeeping module. Needed for Lane I + Lane VII. Bryan to extract on a scheduled call.
- **Jennifer's metrics.** Pre-Dispatch baselines (paper-printout time, communication chaos incidents, training time per new hire, turnover rate) and post-Dispatch deltas. Needed for the Lane VII case study + Lane VIII investor narrative.
- **Beta-cohort outreach response.** Lane III outbound first-100 launch will surface: which sourcing layer converts, which trigger language hooks, which sub-segment responds first. Not a question to ask anyone — a question the market answers via reply rates.

---

## Standing tabled — surfaced but not active

- **Brand-awareness gap mitigation (Lane I.G).** Dispatch invisible on HotelTechReport, G2, Capterra, SoftwareAdvice today. Submission + review solicitation + ranking targets. Defer to post-Lane VII.
- **Per-PMS switching guide content (Lane I.H).** Long-tail SEO. "Switching from Cloudbeds housekeeping to Dispatch" / "How to replace Little Hotelier housekeeping module" / etc. Defer until 5+ hotels have actually switched and we know the real story per PMS.
- **Hospitality trade press strategy (Lane VII.E).** Hotel News Now, Skift, Hospitality.net. Press-worthy story shapes (founder-operator pair, AI-orchestration for boutique, first-of-its-kind UX). Defer until Lane VII.A Jennifer case study ships.
- **Multi-property franchisee corporate-approval motion (Lane II.E).** Hilton / IHG / Best Western / Choice all have approved-vendor lists. Targeting franchisees may require corporate-track sales motion. Defer until 5-10 independent hotels are paying customers (establishes minimum reference base for corporate review).
- **Reseller / agency channel (Lane V.E).** Hospitality consultants and IT-services firms as channel partners. Defer until direct-sale motion is proven.

---

## Bryan working style (GTM-side notes)

- Product side has the "live and die by the master plan" rule. GTM side mirrors it — chase queue in STATE.md, work top-down by priority, don't skip lanes.
- Plain English: same as product. Bryan reads English, not technical jargon. GTM jargon (CAC, LTV, ICP, MQL/SQL) used sparingly; defined when introduced.
- Brutal honest reads on competitive + investor work. Hedging is the failure mode. If something is weak (brand awareness gap, beta-stage credibility), say it directly.
- Chases as units of work. Each Cowork session closes a GTM chase (substrate authoring, brief production, decision codification) with a closure ledger entry here.

---

## Last session close (Day 53, 2026-05-09)

**1 chase, 4 GTM artifacts shipped, master plan scaffolding stood up.** Chase #4 (GTM Lane 1) — pivoted from product engineering (Day 53 chases #1-#3) to GTM scope after Bryan asked to move on to non-product items. Sequence:

- Revify partnership eval memo drafted (call-2 prep, three-block agenda, dealbreaker test, angel-check seed-plant analysis).
- Competitive landscape researched (4 WebSearch passes, 1 WebFetch on Revify + Lighthouse) — initial 5-7 competitors expanded after Bryan dropped 19 buyer-evaluated URLs.
- Re-mapping with Bryan's URLs: most are category-orthogonal PMSs; Path A vs B vs C strategic fork named; Path A (best-of-breed staff layer) locked.
- ICP sharpened via Bryan's pain reframe: variable turnover = four mutation dimensions (guest needs, booking changes, housekeeping availability, maintenance state); orchestration is the wedge, not just phone-native UX.
- Pricing thesis proposed: $5-7/room/month, transparent, $99/month minimum, free 30-day pilot for beta.
- GTM master plan structure proposed → Bryan approved → scaffolded.

**Files shipped Day 53 chase #4:**
- `docs/gtm/MASTER_PLAN.md` — new
- `docs/gtm/STATE.md` — new (this file)
- `docs/gtm/lanes/01-positioning.md` — new
- `docs/gtm/lanes/02-icp-and-pricing.md` — new
- `docs/gtm/briefs/revify-call-2.md` — new

**Engineering work surface remaining (product side): zero active.** GTM lanes are now the rate-limiter for the company's forward motion.

**Carry-forward still pending Bryan-solo:**
- Revify call-2 this week (use `docs/gtm/briefs/revify-call-2.md` as your prep doc + agenda).
- UI verifications on phones for product Day 52 chases #2/#3/#4 + Day 53 chase #2 (per `docs/STATE.md` Day 53 carry-forward).
- Jennifer's case study quote — schedule an extract call.

**Bryan apply steps (Day 53 chase #4):** zero — all markdown-only, no SQL, no UI.

📊 GTM Inventory: 0 → 8 lanes (3 substrate-authored + 5 stubs) | Day 53 chase #4 sealed (GTM bootstrap) | HEAD `2f0a5cc`

📊 GTM Inventory: 8 lanes (5 substrate-authored: I + II + III + IV plan + V.A; + prospect list pass 1 + 8-channel sourcing framework + Lane VII.A brief; 3 stubs: V.B-E + VI + VIII) | Day 53 chases #5 + #6 + #7 + #8 bundled sealed (Jennifer brief + Lane III outbound + reprioritization + prospect-list-pass-1 + multi-channel sourcing framework w/ Bryan verdicts + automation backlog + Lane IV marketing site planning doc) | HEAD `<pending CC commit>`
