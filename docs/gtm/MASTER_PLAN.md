# Dispatch — GTM master plan

*No-cuts inventory of go-to-market work. Mirrors the product-side `docs/dispatch-master-plan.md` structure (numbered sections with sub-items, state labels, blockers, cross-references). Section state labels here go stale once the corresponding `docs/gtm/STATE.md` closure ledger lands an entry — STATE.md overrides this doc whenever they disagree.*

*First action on every new GTM session: read `docs/gtm/STATE.md` for current state, recommended next chases, open partner/customer questions. After STATE.md, read this file (MASTER_PLAN.md) for the no-cuts inventory. Then read any pertinent lane doc in `docs/gtm/lanes/` or brief in `docs/gtm/briefs/`.*

---

## What this is

Dispatch's GTM master plan tracks the lanes of work that get the product from "live-on-Vercel, 1 beta hotel" to "10-100 paying boutique hotels + investor narrative coherent + partnerships set up." Product-side engineering work tracks in the parallel `docs/dispatch-master-plan.md`; this doc is everything OUTSIDE the product surface.

Owner: Bryan Stauder. Co-founder (operator): Jennifer at the Wisconsin boutique partner. Hand-off: GTM execution may move to a specialized Cowork-Claude project / VA / SDR / agency over time; this plan + STATE.md serve as the briefing substrate for whoever picks it up.

---

## Current state (Day 53, 2026-05-09)

*Lanes 1 + 2 (positioning + ICP/pricing) have substantive substrate as of Day 53 chase #4. Lane 5 (partnerships) has the Revify call-2 brief authored. Lanes 3, 4, 6, 7, 8 are stubs queued for upcoming chases. See `docs/gtm/STATE.md` for the closure ledger.*

**Active inventory (8 lanes):**
- I. Positioning — substrate authored (lanes/01-positioning.md); ongoing refinement as more customer signal arrives
- II. ICP + pricing — substrate authored (lanes/02-icp-and-pricing.md); pricing model proposed but not yet market-tested
- III. Outbound — UNBUILT; queued as Day 54+ chase
- IV. Marketing site — UNBUILT; brand decision still open (Refero/Linktree tokens vs operational-aesthetic)
- V. Partnerships — Revify call-2 brief authored (briefs/revify-call-2.md); PMS integration partnerships unscoped
- VI. Funnel + onboarding — UNBUILT; queued for after Lane III lands
- VII. Case studies + social proof — UNBUILT; Jennifer first; pipeline TBD
- VIII. Investor narrative — UNBUILT; angel-seed framing partially explored in Revify brief

**Engineering work surface from product side: zero active** (per `docs/STATE.md` Day 53 close). All product items are either Jennifer-pending KB authoring or post-beta deferred. Product-side beta lives at https://dispatch-app-iota.vercel.app/. GTM is now the rate-limiter.

---

## Section I — Positioning

*Substrate: `docs/gtm/lanes/01-positioning.md`. Day 53 chase #4.*

- **I.A — Competitive landscape map.** AUTHORED. 19 buyer-evaluated URLs categorized into PMS (16, category-orthogonal), adjacent (3, different jobs), with the true head-to-head set (Hotelkit, HelloShift, Optii, Little Hotelier housekeeping module) called out separately.
- **I.B — Path A / B / C strategic fork.** DECIDED. Path A (best-of-breed staff execution layer that complements any PMS). Path B (become a PMS) and Path C (standalone forever) explicitly rejected.
- **I.C — The wedge: orchestration that adapts to variable turnover.** AUTHORED. Multi-dimensional turnover (guest needs, booking changes, housekeeping availability, maintenance state) as the operational problem; live re-planning as the moat.
- **I.D — Category-creation pitch lines.** AUTHORED. "Every other tool gives your team a list. Dispatch re-plans the day as it changes." + "When a guest extends at 10am, your housekeeping shouldn't break. Ours doesn't."
- **I.E — Demo script anchored on the four mutation dimensions.** AUTHORED. Replaces feature-list demos with scenario-driven demos.
- **I.F — ResNexus narrative.** AUTHORED. Jennifer chose Dispatch over ResNexus's built-in housekeeping module → that data point IS the category-creation pitch. Get her quote in writing.
- **I.G — Brand awareness gap mitigation.** UNSCOPED. Dispatch is invisible on HotelTechReport / industry-press surfaces today. Needs an SEO / PR / review-site strategy.
- **I.H — Switching narrative per major PMS.** UNSCOPED. Public-facing "switching guide" docs from each major PMS-bundled competitor — SEO long-tail.

## Section II — ICP + pricing

*Substrate: `docs/gtm/lanes/02-icp-and-pricing.md`. Day 53 chase #4.*

- **II.A — ICP definition (locked).** AUTHORED. Independent boutique + franchisee, under 100 rooms, sub-4.5-star. Three sub-segments: independent boutiques (8-50 rooms), mid-market franchisees (50-100), independent motels (20-80). Negative ICP: >4.5 stars, >100 rooms, STR/vacation rental, corporate-managed chains.
- **II.B — Variable-turnover pain definition.** AUTHORED. Four mutation dimensions: guest needs, booking changes, housekeeping availability, maintenance state.
- **II.C — Pricing model (proposed, not market-tested).** AUTHORED. $5-7/room/month, $99/month minimum, volume discount at 50/100 rooms, free 30-day pilot for first 10 beta. Transparent published pricing as a wedge against opaque incumbents.
- **II.D — Buyer persona maps.** UNSCOPED. Owner-operator vs GM vs franchise corporate — different sales motions per persona.
- **II.E — Sub-segment prioritization.** PARTIAL. Independent boutiques first, franchisees second (gated on PMS integration cover), motels opportunistic. Needs more detail per sub-segment on entry path.
- **II.F — Competitive pricing benchmark.** PARTIAL. Captured in lane doc; needs deeper instrumentation as more pricing surfaces (Hotelkit + HelloShift via demo requests).
- **II.G — Packaging.** UNSCOPED. Single SKU vs Pro/Standard vs add-ons (Maintenance, Reporting, etc.).

## Section III — Outbound

*Substrate: `docs/gtm/lanes/03-outbound.md`. Authored Day 53 chase #5. Beta motion (2-10 hotels) vs post-beta motion (10-100) explicitly split; both scoped.*

- **III.A — Sourcing layers.** AUTHORED. Three primary (BLLA, state innkeeper associations, AAHOA) + four secondary (Google Maps + PMS detection, LinkedIn, hospitality groups, conferences) with priority order + access notes.
- **III.B — Trigger-language playbook (3 hooks).** AUTHORED. Hook A (diagnostic), Hook B (variable-turnover scenario), Hook C (operator-credibility / Jennifer-as-Wisconsin-innkeeper). All three to be tested in beta.
- **III.C — Sequence design (beta).** AUTHORED. 1-on-1 personalized emails, no automation, 5/day cadence, 2 follow-ups max. ~200 emails over 8 weeks = 10 beta hotels at 5%/50% reply/close rates.
- **III.D — Sequence design (post-beta).** AUTHORED. Three-touch email + LinkedIn warmup, 30-50/day, multi-channel.
- **III.E — CRM choice.** AUTHORED. Airtable for beta ($0-20/mo); Attio or HubSpot Free for post-beta ($0-50/seat/mo). Avoid Salesforce until $1M ARR.
- **III.F — Enrichment stack.** AUTHORED. No tools needed for beta; Apollo.io ($99/mo) for post-beta; Clay.com if Apollo's data quality outgrown.
- **III.G — Human-in-the-loop handoff.** AUTHORED. Beta = Bryan handles every reply personally. Post-beta = SDR qualifies, Bryan engages at demo-request / pricing-question / 3rd-back-and-forth thresholds.
- **III.H — First-list playbook per sub-segment.** AUTHORED. Sub-segment 1 (independent boutiques) → 100 named via BLLA + state associations + Google Maps. Sub-segment 2 (franchisees) → deferred until 5+ independents paying. Sub-segment 3 (motels) → opportunistic.
- **III.I — Beta-stage 8-week timeline.** AUTHORED. Week-by-week schedule with $435 total beta-stack budget; Bryan time ~10 hrs/week.
- **III.J — Post-beta stack cost.** AUTHORED. ~$1,800-3,400/month full stack (Apollo + Clay + Attio + Instantly + SDR/VA). Funded by Revify rev share or seed round.

## Section IV — Marketing site

*Substrate: `docs/gtm/lanes/04-marketing-site.md`. Authored Day 53 chase #8. Six decisions to lock before any build (plan mode).*

- **IV.A — Brand reference selection.** **Recommendation: Option C hybrid** (hospitality-color-reference + B2B-SaaS-typography). Specifically: Mr & Mrs Smith or Tablet Hotels (color); Linear or Notion (typography). Linktree-style explicitly rejected (clash with buyer + product aesthetic). PENDING BRYAN CONFIRMATION.
- **IV.B — Content scope.** AUTHORED. Four minimum-viable pages: Homepage / Pricing / Demo Request / Privacy+Terms. Blog + features + about deferred. Homepage hero gated on Jennifer extract quote (Lane VII.A) or launches with placeholder.
- **IV.C — Tech stack.** **Recommendation: Next.js in new `dispatch-marketing` repo.** $0 incremental cost; CC can iterate via prompts; Vercel deploy pipeline already established. Alternatives surveyed (Webflow, Framer, Astro, Squarespace) and rejected. PENDING BRYAN CONFIRMATION.
- **IV.D — Domain + hosting.** **Recommendation: dispatchhq.com (primary), dispatchhotels.com (fallback).** Bryan availability-check + lock required.
- **IV.E — Demo video.** AUTHORED. Pair with Lane VII.A Jennifer extract — same trip captures quote + video + metrics. Fallback: Loom screen-recording of staff app (60-90 sec, ~30 min produce).
- **IV.F — SEO foundation.** AUTHORED. Three keyword tiers prioritized; long-tail competitor alternatives (e.g., "Hotelkit alternative sub-30-room") feasible at launch. Plausible Analytics or Fathom recommended ($9-19/mo, privacy-friendly).
- **IV.G — Launch sequencing.** **Recommendation: Option 3 phased launch.** Site ships in ~2 weeks with placeholder hero; enriched progressively as Jennifer extract + video + case studies land. Avoids "perfect blocks live."

## Section V — Partnerships

*Mixed state — Revify call-2 brief authored (briefs/revify-call-2.md, Day 53 chase #4); other partnerships unscoped.*

- **V.A — Revify (payments).** BRIEF AUTHORED. Second conversation prep covering operating model, partnership economics, boutique-hospitality fit concern. Decision needed post-call.
- **V.B — Angel-check angle for Revify.** AUTHORED IN BRIEF. Seed-plant approach (not direct ask on call-2); deferred to call-3 if partnership fit validates.
- **V.C — PMS integration partnerships.** UNSCOPED. Top targets: ResNexus (in-progress per product post-beta roadmap), Cloudbeds, Little Hotelier, WebRezPro, Mews. Each PMS that integrates becomes a distribution channel + buyer-environment defender.
- **V.D — Industry association partnerships.** UNSCOPED. BLLA, AAHOA, state innkeeper associations as channel partners + lead sources.
- **V.E — Reseller / agency partnerships.** UNSCOPED. Hospitality consultants / IT-services-to-hotels firms as channel partners.

## Section VI — Funnel + onboarding

*UNBUILT. Queued for after Lane III lands. The funnel shape depends on outbound motion + demo conversion + trial conversion.*

- **VI.A — First-message-to-demo-booked flow.** UNSCOPED.
- **VI.B — Demo motion.** UNSCOPED. Self-guided video vs live demo vs hybrid.
- **VI.C — Pilot/trial structure.** PROPOSED IN LANE II. Free 30-day pilot, auto-convert unless canceled.
- **VI.D — Onboarding flow.** UNSCOPED. Self-serve setup vs done-with-you vs done-for-you.
- **VI.E — Activation metrics.** UNSCOPED. What signals "this hotel will retain"?
- **VI.F — Churn signal monitoring.** UNSCOPED.

## Section VII — Case studies + social proof

*UNBUILT. Jennifer's hotel is case study #1; pipeline beyond that depends on Lane III outbound landing customers.*

- **VII.A — Jennifer case study.** UNSCOPED. Quote in writing (per Lane I I.F), shift-day video (per Lane IV IV.E), metrics (turnover-time reduction, paper-to-phone migration, etc.).
- **VII.B — Case study pipeline.** UNSCOPED. Process for converting hotels 2-10 into named case studies.
- **VII.C — HotelTechReport listing.** UNSCOPED. Submission, review solicitation, ranking targets.
- **VII.D — Third-party validation.** UNSCOPED. G2, Capterra, SoftwareAdvice listings.
- **VII.E — Press / earned media.** UNSCOPED. Hospitality trade press (Hotel News Now, Skift, Hospitality.net).

## Section VIII — Investor narrative

*UNBUILT. Partially explored in Revify brief (angel seed-plant). Seed-round prep is the real scope.*

- **VIII.A — Deck shape.** UNSCOPED. Standard 10-12 slide structure or narrative-first.
- **VIII.B — Strategic angel list.** UNSCOPED. Revify is one; other strategic angels (payments, PMS, hospitality operators) TBD.
- **VIII.C — TAM/SAM/SOM model.** UNSCOPED. Sub-100-room boutique + franchisee US count, addressable share, year-1-3 targets.
- **VIII.D — Financial model.** UNSCOPED. Unit economics, CAC, LTV, retention assumptions.
- **VIII.E — Use of funds.** UNSCOPED. Pre-revenue → seed bridge sized for Lane III outbound build + Lane VII case studies.

---

## What ships today (high-level GTM-side)

- Product live at https://dispatch-app-iota.vercel.app/
- 1 beta hotel (Jennifer, Wisconsin)
- Code-side beta locked (`docs/STATE.md` Day 52/53 confirms zero active engineering inventory)
- Competitive positioning substrate authored
- ICP locked
- Pricing model proposed
- Revify call-2 brief ready

## What's NOT yet authored

- Outbound system (Section III)
- Marketing site (Section IV)
- PMS integration partnerships beyond ResNexus (Section V.C+)
- Funnel + onboarding (Section VI)
- Case study production (Section VII)
- Investor narrative beyond Revify angel-seed (Section VIII)

## Recommended next chases

See `docs/gtm/STATE.md` for priority-ordered queue. Currently:
1. Lane IV.A — brand reference selection (gates marketing site build)
2. Lane III — outbound system scoping for hand-curated 2-10 beta
3. Lane VII.A — Jennifer case study production (quote + video)
4. Lane V.A close — Revify call-2 outcome + decision
5. Lane VIII — investor narrative scaffold

## Cross-references to product side

- `docs/STATE.md` — product state ledger; canonical for "what's shipping in the app."
- `docs/dispatch-master-plan.md` — product no-cuts inventory.
- `docs/CLAUDE.md` — product operating manual; product-engineering-only scope.
- `docs/kb/` — Jennifer's KB substrate; some of these become marketing-site content (e.g., the Deep Clean variant doc becomes "feature: variant-aware checklists" copy).
- `docs/kb/jennifer-rules-extraction.md` — Day 52 chase #5 mining; sub-segment intelligence baked into the rules table.

## Operating conventions (mirror product side)

- Every chase gets a STATE.md ledger entry inline (no daily handoff narrative recreation).
- Every closure carries through to MASTER_PLAN.md inventory state — section labels stay in sync.
- Plain-English close on every chase: what changed, files touched, what's queued next.
- Use TodoList tool for multi-step GTM chases (Cowork renders as widget).
- File-write commits use the two-commit pattern (work commit + SHA-backfill commit) per Day 53 chase #1 post-mortem codification.
