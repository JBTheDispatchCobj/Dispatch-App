# GTM Lane II — ICP + pricing

*Substrate: ICP locked, pricing model proposed, sub-segment prioritization sketched. Authored Day 53 chase #4.*

---

## II.A — ICP definition (LOCKED Day 53)

**Who buys Dispatch:** independent boutique + franchisee, under 100 rooms, sub-4.5-star (mid-market not luxury).

### Three sub-segments

1. **Independent boutiques and inns — 8-50 rooms, owner-operated.**
   - Typical PMS: ResNexus / Little Hotelier / RezStream / WebRezPro / Cloudbeds
   - Buyer: owner-operator or owner+GM duo
   - Pain shape: ops chaos + staff turnover + paper printouts
   - Decision velocity: fast (owner can sign)
   - Beta-cohort priority: HIGHEST. Jennifer is in this segment.

2. **Mid-market franchisees — 50-100 rooms.**
   - Brands: Hampton Inn / Holiday Inn Express / Best Western / Quality Inn / Comfort Inn family
   - PMS often corporate-mandated (Choice CRS, IHG Holidex, Hilton OnQ) — basic on housekeeping
   - Buyer: GM with franchisee-owner sign-off
   - Pain shape: turnover + corporate compliance audits + housekeeping cost pressure
   - Decision velocity: slower (corporate approval may be required for IT-adjacent tools)
   - Beta-cohort priority: SECOND. Worth targeting after independents land.

3. **Independent motels in tourism corridors — 20-80 rooms, seasonal.**
   - Often family-owned, often AAHOA member (American Asian Hotel Owners Association)
   - PMS: budget tier (Cloudbeds, ResNexus, RoomMaster)
   - Pain shape: seasonal turnover surges, English-as-second-language staff, training friction
   - Decision velocity: fast (owner-operator), but cost-sensitive
   - Beta-cohort priority: OPPORTUNISTIC. Don't lead with this segment but happy to land them inbound.

### Negative ICP (do NOT pursue)

- **Above 4.5 stars / luxury / lifestyle hotels.** Bespoke ops, willing to pay 10x but doesn't scale to product-led growth.
- **Over 100 rooms.** Optii's territory, different sales motion (longer cycle, IT-procurement-heavy).
- **Vacation rental / STR (Airbnb-style).** Hostaway / Guesty / Lodgify territory. Different ops shape (no front desk, no daily ops cycle).
- **Corporate-managed chains.** Centralized procurement, multi-year cycles, RFP processes. Wrong motion for a beta-stage company.

---

## II.B — Variable-turnover pain (the operational thesis)

**Bryan's framing (Day 53):** "high variable turnover" isn't just staff churn. It's the mutability of every input the property faces in a day.

**Four mutation dimensions:**

1. **Guest needs.** Preferences, special requests, late-checkout, turn-down service, extras retail, dietary accommodation, ADA accessibility.
2. **Booking changes.** Extends, swaps, cancellations, walk-ins, group additions, no-shows, late additions to existing reservations.
3. **Housekeeping availability.** Call-outs (sick, family emergency), late arrivals, extra hands on busy days, training a new hire, end-of-shift overtime decisions.
4. **Maintenance state.** Urgent issues (broken AC in 38), rooms blocked for repair, downstream cascade (38 blocked → 39 has to take 38's guest → 38's deep-clean reschedules).

**Why incumbents can't handle this:** their data model is "rooms with statuses." Each mutation requires a manual edit somewhere — admin updates the room table, manager re-prints printouts, housekeepers get verbal instructions during shift handover. The plan from 9am is stale by 11am.

**Why Dispatch can handle it:** the data model is "tasks with rules + events + reassignment graph." Mutations are system events. The Section IV rule engine items (most post-beta-deferred per product Day 51 chase #8, but architecturally in place) are the live re-planning layer:
- IV.A auto-assignment policies (primary-housekeeper lanes, hall pinning, status-stack priority)
- IV.B hallway adjacency rule (don't bounce staff between halls)
- IV.C no-orphan-cards rule (every card always assigned)
- IV.D pre-stayover reshuffle (11am weekday / 12pm weekend)
- IV.H Wed-occupancy Deep Clean trigger (Phase A LIVE; Phase B Bryan-decisions locked)
- IV.I real-time daily reassignment

**Sales narrative:** see Lane I.C, I.D, I.E. The category-creation pitch is built on this thesis.

---

## II.C — Pricing model (PROPOSED, not market-tested)

### The pricing thesis

Two truths shape the model:
1. **Buyers already pay $100-200/mo for their PMS.** Adding a tool means defending the budget line. Above ~$300/mo per property, it's a meeting; below ~$300/mo, it's a "just buy it." Dispatch needs to live in the "just buy it" zone for sub-30-room properties.
2. **Transparent pricing is a wedge.** Hotelkit, Optii, Quore, Cloudbeds Task Manager all hide pricing behind a demo request. Publishing pricing forces every competitor to defend opacity — and lets prospects qualify themselves before they ever talk to sales.

### Recommended pricing

- **$5-7 per room per month**, transparent, no setup fee, month-to-month.
- **$99/month minimum** so small accounts (under 15 rooms) are still profitable to onboard.
- **Volume discount kicks in at 50 rooms** ($4/room) and 100 rooms ($3/room) for franchise multi-property opportunities later.
- **Free 30-day pilot** for the first 10 beta hotels — converts to paid automatically unless they cancel.

### Math by property size

| Property size | Monthly cost | Annual |
|---|---|---|
| 15-room inn | $99 (minimum) | $1,188 |
| 30-room boutique | $150-210 | $1,800-2,520 |
| 60-room franchise | $300-420 | $3,600-5,040 |
| 100-room franchise | $500-700 | $6,000-8,400 |

### Competitive benchmark

| Competitor | Pricing | Visibility | Vs. Dispatch |
|---|---|---|---|
| Hotelkit | ~$200-500/mo small end (estimated) | Hidden | Probably 2-3x more expensive at small scale; opaque |
| Optii | ~$1,500-5,000/mo enterprise | Hidden | Out of reach for sub-100-room ICP |
| HelloShift | Per-tier (X-Small to X-Large) | Transparent tiers, not transparent rates | The only other transparent player |
| Cloudbeds Task Manager | Bundled with Cloudbeds PMS | "Free" with PMS | Different value prop (PMS lock-in) |
| Little Hotelier housekeeping | Bundled with Little Hotelier PMS | "Free" with PMS | Same |
| Quore | Hidden | Mid-market franchise pricing | Different ICP |

### Why this pricing wins

1. **Under the "needs meeting" threshold** for sub-30-room properties (~$300/mo is the soft cap).
2. **Transparent in an opaque market** — the rare daylight position.
3. **Per-room scaling** maps to the buyer's mental model (they think in rooms).
4. **Minimum floor** prevents unprofitable micro-accounts.
5. **30-day free pilot** lowers risk for the buyer; auto-convert means we don't have to chase activation.

### Open packaging questions (II.G)

- Single SKU vs Pro/Standard split? Initial recommendation: single SKU for beta + early growth; revisit at 50+ paying customers.
- Add-ons later? Maintenance module, advanced reporting, multi-property dashboard — defer until customers ask.
- Annual prepay discount? Optional 10-15% off for annual; consider at 20+ paying customers (cash-flow signal more than revenue signal).

---

## II.D — Buyer persona maps (OPEN — high priority for Lane III outbound)

Three personas across the sub-segments, each with a different sales motion. Defining these unlocks the Lane III outbound sequence design.

### Persona A — Owner-operator

- Sub-segment: independent boutiques (8-50 rooms), independent motels (20-80 rooms)
- Decision authority: full
- Pain orientation: ops chaos, staff turnover, "I keep getting calls at home about housekeeping"
- Buying motion: fast (one decision-maker)
- Where to find them: BLLA, state innkeeper associations, AAHOA, LinkedIn search ("owner" + "[hotel name]")
- Outreach channel preference: email first, LinkedIn second, phone third
- Trigger language: "your housekeepers print PDFs and carry them around"

### Persona B — General manager (independent)

- Sub-segment: independent boutiques (30-50 rooms), some mid-market franchisees (50-100 rooms)
- Decision authority: partial (owner sign-off for tools)
- Pain orientation: training cost per new hire, supervisor visibility, "I can't tell who's where without walking the halls"
- Buying motion: moderate (GM evaluates, owner approves)
- Where to find them: LinkedIn ("General Manager" + hotel name), industry conferences (HX, Hospitality.net forums)
- Outreach channel preference: LinkedIn first, email second
- Trigger language: "5-minute setup, zero training for your housekeepers"

### Persona C — Franchisee owner (multi-property)

- Sub-segment: mid-market franchisees (50-100 rooms × 2-5 properties)
- Decision authority: full but constrained by franchisor approved-vendor lists
- Pain orientation: cost-per-property pressure, brand-standard compliance audits, multi-property turnover variance
- Buying motion: slow (franchisor approval may be required)
- Where to find them: AAHOA member directory (~70% of US franchise owners), franchise-specific owner forums
- Outreach channel preference: email first, phone follow-up
- Trigger language: "one tool that works across your two/three/four hotels"

---

## II.E — Sub-segment prioritization (PARTIAL)

**Beta cohort (2-10 hotels) — hand-curated:**
- Independent boutiques on ResNexus (Jennifer's PMS — leverage the integration narrative)
- Independent boutiques on Little Hotelier / WebRezPro (clearest ICP fit)
- Total beta size: 5-8 properties from this segment

**Second wave (10-50 paying):**
- Expand independent boutiques on Cloudbeds, Mews (broaden PMS coverage)
- Begin AAHOA franchisee outreach (Persona C) once 5+ named beta references exist
- Total target: 20-40 properties

**Third wave (50-200 paying):**
- Multi-property franchise owners (Persona C scale-up)
- Independent motels in tourism corridors (Persona A, second priority)
- PMS partnership-driven distribution (Cloudbeds App Marketplace, Mews Marketplace, etc.)

---

## II.F — Competitive pricing benchmark (PARTIAL)

Needs deeper instrumentation. Action items:
- Demo-request Hotelkit pricing for a 30-room property — confirm the $200-500/mo estimate
- Demo-request Optii for a 50-room property — confirm enterprise pricing
- Map HelloShift's actual per-tier pricing (the tiers are public, the rates aren't)
- Cross-reference with HotelTechReport pricing breakdowns when accessible

Goal: a one-page pricing benchmark to publish on the marketing site ("vs. competitor X, you save $Y/month at our scale").

---

## II.G — Packaging (OPEN, low priority)

Defer until 20+ paying customers exist. Likely shape:
- **Beta + early growth:** single SKU ($5-7/room/month, all features)
- **Once differentiation pressure emerges:** Pro tier (advanced reporting, multi-property dashboard, priority support) + Standard
- **Add-ons:** Maintenance Pro module (when III.B Phase 6+ ships), Investor/Owner reporting module (Phase 2), API access (enterprise)

---

## Open questions / blockers

- **Buyer persona validation.** All three personas above are working hypotheses. Lane III outbound is the first market signal that confirms or breaks them.
- **Pricing market test.** $5-7/room/month is proposed; no real customer has been quoted yet. First 5 beta conversations test this.
- **Sub-segment entry path detail.** Each sub-segment needs a "first 5 hotels" playbook. Independent boutiques on ResNexus is the obvious first move (Jennifer-anchored); the others need specific named-target lists.
- **Per-PMS integration prioritization.** Lane V.C dependency: which PMS integration ships next (post-ResNexus)? Cloudbeds has the largest boutique base; Little Hotelier has the tightest ICP fit; Mews has the modern-stack credibility. Pick one.

---

## Cross-references

- `docs/gtm/lanes/01-positioning.md` — Path A locked, head-to-head competitors, category-creation pitch
- `docs/gtm/lanes/03-outbound.md` — sourcing layers + trigger language built on this ICP definition
- `docs/gtm/briefs/revify-call-2.md` — payment partnership fit per ICP
- Product side `docs/STATE.md` — ResNexus integration roadmap, beta-readiness state
