# GTM Lane IV — Marketing site

*Plan substrate. Brand reference decision + content scope + tech stack + domain candidates + demo video timing + SEO foundation + launch sequencing. Authored Day 53 chase #8. **Plan mode — no site code or design execution started. Decisions to lock before any build.***

---

## What this lane is

The marketing site is the destination for ALL outbound channels (Lane III) and the conversion surface for inbound interest. It's where prospects land after a cold email, after a LinkedIn DM, after a referral, after a Google search. Three jobs:

1. **Communicate the wedge clearly** in <30 seconds (orchestration that adapts to variable turnover; mobile-first staff execution; works with your existing PMS).
2. **Convert intent to demo** (calendar embed, contact form, low-friction).
3. **Carry the credibility narrative** (Jennifer's story, ResNexus context, screenshots of the actual product).

What it isn't (yet):
- A content marketing hub (blog comes post-launch)
- A login / app surface (those stay at the existing product domain)
- A directory of features (anti-pattern for B2B SaaS at this stage)

---

## IV.A — Brand reference decision (PRIMARY decision; gates everything below)

### The question

You shared the Refero (styles.refero.design) workflow as a tool — it generates design tokens (colors, typography, layout) for any brand reference. The example you pointed at was Linktree's tokens (vibrant pop palette, playful tone). The question isn't whether to use Refero as a tool (it's useful); it's **which brand reference to point Refero at.**

### Three options on the table

**Option A — Linktree-style (vibrant pop, content-creator energy).**
- Refero default that you saw. Saturated colors (currant red, hydrangea blue, chartreuse pop, dahlia purple). Rounded organic shapes. Playful tone.
- **Fit for Dispatch:** poor. Boutique hotel buyers (20-100 room owner-operators, mid-market franchisees) live in hospitality-aesthetic-land. Linktree's vibrancy reads as consumer-tech / creator-economy / not-for-me. Aesthetic clash with both your product (cream/sage muted operational palette per `app/globals.css`) and your buyer.
- **Risk:** site looks startup-y and unmature to a hotel owner. Conversion suffers because the brand says "we don't get your industry."

**Option B — Operational-warm (hospitality-grade muted palette).**
- Cream / sage / warm-wood-tone aesthetics. Mirrors Dispatch's product. Anchored on hospitality industry visual norms.
- **Reference brands to point Refero at:**
  - Tablet Hotels (tablethotels.com) — boutique hotel curator
  - Mr & Mrs Smith (mrandmrssmith.com) — luxury/boutique hotel listings
  - Ace Hotel (acehotel.com) — boutique chain, considered aesthetic
  - Hotel Saint Cecilia (sanjosehotel.com — Saint Cecilia is sister) — operator-grade boutique
  - Linear (linear.app) — clean B2B SaaS but warm/considered (less hospitality, more "considered tool")
- **Fit:** strong. Buyers feel "this is built for me."
- **Risk:** if executed poorly, looks generic / template-y.

**Option C — Hybrid: operational reference + tech-tool typography.**
- Use a hospitality-reference for color/feel, but borrow typography + interaction patterns from clean B2B SaaS (Linear, Notion, Vercel).
- Result: warm hospitality color palette + crisp tech-grade typography + functional interaction patterns.
- **Fit:** best of both. Says "we belong in hospitality" via color, "we're a real tool" via typography.
- **Risk:** harder to execute — requires deliberate restraint to avoid muddling.

### Recommendation

**Option C — Hybrid.** Point Refero at a hospitality brand reference (Mr & Mrs Smith or Tablet Hotels recommended) for color tokens. Pair with typography tokens from a B2B SaaS reference (Linear is a safe default).

Specifically:
- **Colors:** Mr & Mrs Smith or Tablet Hotels → cream backgrounds, muted accent (sage / terracotta / muted teal), restrained type-color contrast
- **Typography:** Linear or Notion → sans-serif headings (Inter or similar), generous line-height, tight tracking on display sizes
- **Layout / spacing:** B2B SaaS conventions (Linear / Vercel-style) — generous whitespace, single-column hero, three-column features grid
- **Components:** match the product's existing border-radius scale (rounded but not maximal) and the existing six-bucket neon palette IS available for screenshots/illustrations (preserves brand consistency between marketing and product)

### What you need to decide

1. **Confirm Option C** (or push back if you want different).
2. **Pick the color reference** (Mr & Mrs Smith vs Tablet Hotels vs other — these are starting points, not constraints).
3. **Pick the typography reference** (Linear vs Notion vs other).

Once locked, Refero generates the tokens; we build against them.

---

## IV.B — Content scope (minimum viable for beta)

### Four pages for beta launch

| Page | Purpose | Content outline |
|---|---|---|
| **Homepage** (`/`) | Wedge clarity + first social proof + CTA | Hero (orchestration pitch, single line) → Mutation-dimension matrix (4-column visual contrast) → Jennifer quote pull (when Lane VII lands) → Product screenshots (3-5, mobile-framed) → Pricing teaser → CTA (Demo Request) |
| **Pricing** (`/pricing`) | Transparency-as-wedge | Per-room/month rate ($5-7) with the volume tier breakdown from Lane II → "Free 30-day pilot" framing → FAQ (what's included, contract terms, billing, cancellation) → CTA |
| **Demo request** (`/demo`) | Convert intent to call | Brief form (name, hotel name, role, # rooms, PMS, message) → Cal.com embed for scheduling → "What to expect" preview → social proof footer |
| **Privacy + Terms** (`/privacy`, `/terms`) | Legal table-stakes | Generated from a SaaS template (Termly / Iubenda free-tier OK for beta); link from footer |

### What's deliberately NOT in scope for beta launch

- **Blog.** Defer until post-launch + first case studies justify content.
- **Features page.** Anti-pattern — homepage already covers what matters; deep dive should live in the demo, not on the site.
- **About / Team.** Optional. If included, keep to a single paragraph: founder + operator co-founder narrative. No bio-grids.
- **Customer login.** Stays at the product domain (`dispatch-app-iota.vercel.app/login` for now; future custom domain later).

### What unlocks each piece

| Page | What it needs before going live |
|---|---|
| Homepage | Jennifer extract quote (Lane VII.A) + 3-5 product screenshots (have these from existing app) + a single hero line locked |
| Pricing | Pricing decision locked (Lane II proposed $5-7/room; needs final sign-off) |
| Demo request | Cal.com account ($0 free tier) + intake form (10-min build) |
| Privacy/Terms | Template generation (~30 min) |

**The blocking dependency:** Jennifer's hero quote is the single most-needed content asset for the homepage. Without it, the homepage launches with founder-voice copy that's 10x weaker. **Recommend launching the site WITH a "social proof: coming soon" placeholder in the hero zone if Lane VII.A hasn't landed yet, rather than waiting indefinitely.**

---

## IV.C — Tech stack

### Three options

| Option | Cost | Speed-to-launch | Iteration speed | Fit |
|---|---|---|---|---|
| **Next.js** (matches product stack) | $0 incremental | 1-2 weeks first time | Fast (CC can iterate via prompts) | Best for engineering-controlled iteration |
| **Webflow** | $30-50/mo | 3-5 days | Fast (visual editor, no code) | Best if you want non-engineering iteration |
| **Framer** | $25-90/mo | 2-4 days | Fast (designer-friendly) | Best if you want design-led iteration |
| **Astro** (static SSG) | $0 incremental | 1-2 weeks | Medium (less mature than Next) | Modern alternative to Next; smaller bundle |
| **Squarespace / Wix** | $20-40/mo | 1-2 days | Slow (template-bound) | Cheapest; weakest design control |

### Recommendation

**Next.js** — same stack as the product, same deploy pipeline (Vercel), zero incremental cost, CC can iterate via direct prompts. Repository can live in either `dispatch-app` (under `app/marketing/` or similar) or a new `dispatch-marketing` repo (cleaner separation). New repo recommended once marketing site is real (avoids product/marketing deploy entanglement).

**Why not Webflow:** despite the no-code appeal, you'd commit to a monthly fee + vendor lock-in + can't reuse product CSS / tokens. Trade-off only worth it if you want visual iteration without involving CC.

**Why not Framer:** same trade-off as Webflow plus a learning curve. Best for design-heavy sites; Dispatch's marketing needs are more functional than visual.

### Open question

- New repo `dispatch-marketing` or under `dispatch-app/app/marketing/`?
  - **New repo:** cleaner separation, separate deploy, easier to grant access to a designer/contractor later, deferred-deletion safer.
  - **Same repo subdirectory:** faster to set up, shared tooling, but mixes product + marketing deploys (every product push redeploys marketing too).
  - **Recommendation:** new repo when actually building. Marginal setup cost (~1 hour) buys real separation.

---

## IV.D — Domain candidates

Need to check availability before locking. Top candidates ranked by fit:

| Domain | Vibe | Cost (estimated) | Notes |
|---|---|---|---|
| **dispatchhq.com** | Tech-SaaS standard | $10-15/yr | Common pattern; clean |
| **dispatchhotels.com** | Niche-anchored | $10-15/yr | Most descriptive; signals ICP |
| **joindispatch.com** | Tech-SaaS standard | $10-15/yr | Common pattern; action-oriented |
| **godispatch.com** | Tech-SaaS standard | $10-15/yr | Common pattern; action-oriented |
| **usedispatch.com** | Tech-SaaS standard | $10-15/yr | Common pattern; tool-oriented |
| **dispatch.app** | Premium TLD | $15-40/yr if available, likely $$$$+ if owned | Likely taken or expensive |
| **dispatch.hotel** | Niche TLD | $50-100/yr | Distinctive; harder to type |

**Recommendation: dispatchhq.com first, dispatchhotels.com as fallback.** dispatchhq communicates "this is a real company"; dispatchhotels.com communicates "this is for hotels specifically" but is longer to type/say.

### What you need to decide

1. Check availability of dispatchhq.com (Namecheap / Cloudflare Registrar / Squarespace Domains all work).
2. Pick primary + a fallback.
3. Decide whether the existing `dispatch-app-iota.vercel.app/` app domain stays as-is or moves to `app.dispatchhq.com` once domain is purchased.

---

## IV.E — Demo video / hero visual

### What we want

Per Lane I.E: a 90-second video shot at Jennifer's hotel showing a real housekeeper doing a real shift on Dispatch. No voiceover, no salesperson — just the phone screen + the work happening. That single asset is more persuasive than any feature list.

### Dependencies

- **Jennifer's consent** (high probability based on co-founder relationship).
- **A shift day at her property** (1-2 hours of filming).
- **Screen recording** of the actual phone (use Loom or iOS native screen record + AirDrop).
- **Editing** (~2-4 hours of basic cuts — DaVinci Resolve free, Premiere if you have it, or hire on Fiverr ~$50-150).

### Timing

**Pair with Lane VII.A Jennifer extract call execution.** Same trip — extract quotes + record video + capture metrics in one structured visit. Don't make this a separate trip.

### Fallback if video isn't ready

A scrolling Loom screen recording of the staff app (no hotel context, just the product) is acceptable as a placeholder. Aim for 60-90 seconds. ~30 min to record + edit.

---

## IV.F — SEO foundation

### What to target

Three keyword tiers, ranked by feasibility:

| Tier | Keywords | Difficulty | Conversion likelihood |
|---|---|---|---|
| **Long-tail competitor alternatives** | "Hotelkit alternative sub-30-room," "Cloudbeds housekeeping alternative," "ResNexus housekeeping problems" | Low (almost no competition) | High (transactional intent) |
| **Industry pain searches** | "boutique hotel housekeeping app," "mobile housekeeping app for small hotel," "phone-native hotel housekeeping" | Medium | Medium-high |
| **Generic category** | "hotel housekeeping software," "housekeeping management" | High (Hotelkit + HelloShift + Optii outrank) | Lower (mostly research intent) |

### Recommendation

Don't invest in SEO content production until 5+ case studies exist. Pre-case-study content is generic and doesn't differentiate. Until then:
- **Technical SEO basics ship with the site:** meta titles, descriptions, OG images, sitemap, robots.txt, structured data (Schema.org Hotel + Product where applicable).
- **One landing page per major competitor** ("Hotelkit alternative for boutique hotels," "Cloudbeds housekeeping alternative"). Cheap to produce, indexes well, captures shopping intent. Defer to when first case study exists.

### Tracking

- Google Search Console: required, free, 5-min setup post-launch.
- Plausible Analytics or Fathom: $9-19/mo, privacy-friendly, doesn't violate hospitality guest data concerns.
- Avoid: Google Analytics 4 (overkill + privacy concerns).

---

## IV.G — Launch sequencing (the calendar question)

### Three pacing options

**Option 1 — Launch ASAP with placeholders** (~2 weeks from now)
- Tech stack picked + domain bought + Next.js scaffold + 4 minimum-viable pages live
- Hero zone uses placeholder copy ("Built by a Wisconsin boutique operator — case study coming soon")
- Pricing live, demo request live, privacy/terms live
- **Risk:** site looks pre-revenue. Conversion suffers without social proof.
- **Reward:** outbound has a destination immediately; you stop bottlenecking on the lack of a site.

**Option 2 — Launch after Jennifer extract lands** (~4-6 weeks from now)
- Same scope as Option 1 but hero zone has Jennifer's actual quote + video
- Site launches with full credibility narrative
- **Risk:** outbound stays bottlenecked for 4-6 weeks; cold prospects have nowhere to go except a Loom link.
- **Reward:** higher conversion when it does launch.

**Option 3 — Phased launch** (~2 weeks then progressive enrichment)
- Launch Option 1 immediately (placeholder hero)
- When Jennifer quote lands → swap in real hero copy
- When video lands → embed video in hero
- When second case study lands → add case studies page
- **Risk:** ongoing churn on the homepage (minor).
- **Reward:** outbound never bottlenecked; site improves over time.

### Recommendation

**Option 3 — Phased launch.** Doesn't let "perfect" block "live." The cost of a placeholder homepage for a few weeks is lower than the cost of having no site for 4-6 weeks while running outbound.

### What this implies for sequence

1. **Now (plan mode):** brand reference decision (IV.A) + content scope confirmation (IV.B) + tech stack pick (IV.C) + domain decision (IV.D).
2. **Week 1 (when you say go):** buy domain + scaffold Next.js + ship 4 minimum-viable pages with placeholder hero copy.
3. **Week 2:** outbound starts pointing at the site.
4. **Weeks 4-6:** Jennifer extract executes → hero copy + video swap in.
5. **Month 3+:** second case study lands → content marketing tier opens (Tier 2 SEO content production).

---

## Decisions to lock before any build

These are the gates. Plan-mode-decision-mode for each:

1. **IV.A brand reference:** Option C (hybrid) confirmed? Pick color reference + typography reference.
2. **IV.B content scope:** 4 pages confirmed? Anything to add / remove?
3. **IV.C tech stack:** Next.js + new `dispatch-marketing` repo confirmed?
4. **IV.D domain:** Pick primary candidate, check availability, lock.
5. **IV.E demo video:** Pair with Lane VII.A timing — confirmed?
6. **IV.G launch sequencing:** Phased launch (Option 3) confirmed?

Six decisions. Once locked, the build is well-scoped and execution-ready.

---

## Cross-references

- `docs/gtm/lanes/01-positioning.md` — wedge / category pitch / demo script / 4-mutation matrix copy lives here
- `docs/gtm/lanes/02-icp-and-pricing.md` — pricing values for `/pricing` page
- `docs/gtm/lanes/03-outbound.md` — every cold email points at the site; URL choice affects this
- `docs/gtm/briefs/jennifer-extract-call.md` — Lane VII.A extract produces homepage hero + demo video assets
- `docs/STATE.md` (product side) — `app/globals.css` cream/sage palette is the brand anchor for the operational-warm color reference
