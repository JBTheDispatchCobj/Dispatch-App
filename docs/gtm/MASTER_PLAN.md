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

*UNBUILT. Queued as Day 54+ chase. Pre-scoping context lives in the Lane I + II briefs (ICP precision, trigger language, sourcing layers all sketched there).*

- **III.A — Sourcing layers.** SCOPED IN LANE I. BLLA, AAHOA, state innkeeper associations, LinkedIn search, Google Maps + PMS detection.
- **III.B — Enrichment stack.** UNSCOPED. Tools (Apollo, Clay, Instantly, Hunter, etc.) + budget needed.
- **III.C — Sequence design.** UNSCOPED. Email cadence, LinkedIn approach, phone fallback.
- **III.D — Trigger-language playbook.** SKETCHED IN LANE I. Three opening hooks proposed; needs A/B testing.
- **III.E — CRM choice.** UNSCOPED. HubSpot vs Attio vs Airtable vs custom.
- **III.F — Human-in-the-loop handoff.** UNSCOPED. When does Bryan get the call? Demo-booked threshold? Reply quality?
- **III.G — Beta-stage hand-curated approach.** PROPOSED IN LANE I. For 2-10 beta hotels, hand-curation likely beats automation. System scales post-beta.

## Section IV — Marketing site

*UNBUILT. Brand decision is the gating question. Refero/Linktree tokens (Bryan-explored Day 53) are aesthetically aggressive playful-pop; Dispatch's existing app aesthetic is operational cream/sage muted. They clash.*

- **IV.A — Brand reference selection.** OPEN QUESTION. Linktree-style (vibrant pop, content-creator vibe) vs operator-grade (hospitality-warm, trust-signal-heavy, screenshot-credible). Recommendation pending.
- **IV.B — Content scope.** UNSCOPED. Homepage + pricing + demo request + case study + about + blog at minimum. Marketing-site as a 10-page Next.js or Webflow build.
- **IV.C — Tech stack.** UNSCOPED. Next.js (matches product stack; shared deploy) vs Webflow (no-dev, faster iteration) vs Squarespace (cheapest).
- **IV.D — Domain + hosting.** UNSCOPED. dispatch.app? dispatchhq.com? dispatchhotels.com? Coordination with the existing dispatch-app-iota.vercel.app/ product domain.
- **IV.E — Demo video.** UNSCOPED. 90-second shift-on-Dispatch video at Jennifer's hotel — proposed in Lane I; production unscoped.
- **IV.F — SEO foundation.** UNSCOPED. Keyword targets (boutique hotel housekeeping app, mobile housekeeping app, etc.), content cadence.

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
