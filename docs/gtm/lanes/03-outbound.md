# GTM Lane III — Outbound system

*Substrate: sourcing layers, sequencing design, stack recommendation, sub-segment first-list playbook. Authored Day 53 chase #5. Builds on Lane I positioning + Lane II ICP/pricing.*

---

## Scope split: beta now (2-10 hotels) vs. post-beta scale (10-100)

Two distinct motions. Trying to build the second one before the first one validates wastes time.

### Beta motion (2-10 hotels)

**Hand-curated, founder-led, high-touch.** Bryan personally builds a list of 30-50 specific named hotels that match the ICP exactly, sends 1-on-1 emails (not sequenced), runs the first demos himself. Goal: 10 beta hotels paying or pilot-signed within 30-45 days.

No automation needed. The whole stack here is: spreadsheet + email + LinkedIn + calendar. Spending money on Apollo/Clay/Instantly at this volume is over-engineering — the per-hotel research effort matters more than scale.

### Post-beta motion (10-100 hotels)

**Tooled, semi-automated, scalable.** Once beta validates the message + Jennifer case study lands, build the actual outbound stack: sourcing + enrichment + sequencing + CRM + human-in-the-loop handoff. Goal: 100 hotels in pipeline by month 6 post-beta.

The post-beta stack is what most "outbound system" guides describe. Don't build it yet. Validate the message first.

**This document scopes both motions.** Beta first, post-beta second.

---

## III.A — Multi-channel sourcing framework

URL scraping → enrichment pipeline is ONE angle. It's the highest-leverage at scale but not the only channel. Diversified channel mix below, ranked by Bryan-validated priority (Day 53 chase #7). Each channel notes automation status, Bryan's per-channel verdict, expected yield, and cost.

### Tier 1 — GOLD channels (build automation, run continuously)

**Channel 1 — Job postings (HIGH-SIGNAL TRIGGER CHANNEL).** Verdict: **GOLD, automate via scraping.**

- **The signal:** A hotel hiring "Housekeeping Manager," "Director of Operations," or "Assistant General Manager" is actively in operational pain — turnover, restructuring, growing past current systems. They're already feeling the wound Dispatch solves.
- **Where to mine:** Indeed, LinkedIn Jobs, Hcareers, HospitalityOnline, ZipRecruiter. RSS feeds where available; otherwise scrape with Playwright.
- **Automation shape:** Daily scraper that monitors hospitality job listings in target geos (St. Louis Metro + Indy + Columbus + KC + Madison as starting cohort). Filters for hotel + ops/housekeeping role titles. Outputs daily digest with hotel name + posting URL + date posted.
- **Hook:** *"Saw you're hiring a Housekeeping Manager — usually means the ops side is stretched. Built a tool that takes 5 min to onboard a new hire vs. days of training. Worth 15 min to look at before your new GM walks in?"*
- **Yield:** ~5-20 ICP-fit job postings per metro per month. Reply rates 2-3x cold-cold because timing is exact.
- **Cost:** Free (scraper build is in-house; sandbox dev + Bryan's Mac runs daily cron).

**Channel 4 — Negative review mining (LEADING-INDICATOR CHANNEL).** Verdict: **GOLD, automate.**

- **The signal:** Recent 1-3 star reviews mentioning housekeeping, room readiness, staff/communication issues. Owner is already pissed about exactly the problem Dispatch solves.
- **Where to mine:** TripAdvisor, Google Maps reviews, Yelp. Filter by date (last 30-60 days), rating (1-3), keywords ("housekeeping," "dirty room," "staff," "wait," "manager," "front desk," "didn't clean").
- **Automation shape:** Apify TripAdvisor + Google review scrapers running weekly on hotel-URL lists from target metros. Output: hotels with recent negative ops reviews, severity-scored.
- **Hook:** *"Saw a couple of recent reviews mentioning housekeeping turnaround. Not pitching damage control — flagging that we built Dispatch specifically for the operational chaos those reviews are surfacing. Want to see how our Wisconsin partner runs hers now?"*
- **Yield:** ~3-5 high-signal prospects per metro per month.
- **Cost:** Apify $5-10/month for ongoing monitoring once running.

### Tier 2 — Approved manual / hybrid channels

**Channel 6 — AAHOA (FRANCHISEE CHANNEL).** Verdict: **Wonderful — approved.**

- **The signal:** AAHOA covers ~70% of US franchise owners — Hampton/Quality/Best Western/Holiday Inn Express territory. Per Lane II reopening, franchisees ARE in ICP (have corporate front-desk PMS, lack on-the-ground housekeeping tool — exactly the gap Dispatch fills).
- **Access:** Associate membership for non-Asian-American allies, ~$295/year. Member directory is the unlock.
- **Automation shape:** Once membership lands, scrape the AAHOA member directory (likely requires login-authenticated session — Playwright-with-cookies approach). Filter to franchise owners in target geos. Output to standard prospect-list format.
- **Hook variant (franchisee-specific):** *"You've got corporate PMS for the front desk (Choice CRS / IHG Holidex / Hilton OnQ). What you don't have is a phone-native tool for your housekeepers. Dispatch sits between corporate compliance and your on-the-ground reality."*
- **Yield:** Thousands of franchisee hotels mineable; ICP-fit (20-100 room franchisees in approachable markets) — hundreds.
- **Cost:** $295/year. Approved pre-funding.

**Channel 3 — Hospitality consultants (HYBRID — automate discovery, Bryan handles the human conversations).** Verdict: **Automate consultant discovery + initial outreach. Hand off to Bryan after reply.**

- **The signal:** Hospitality consultants who advise boutique hotels on ops, marketing, financial restructuring have direct access to owner-level decisions. One good consultant relationship = 10-20 warm intros over a year.
- **Bryan's contribution:** Bryan handles all LinkedIn-side personal touches (his expertise, his 8k follower asset). Automation does the wide net; Bryan does the conversations.
- **Automation shape:**
  1. Scrape LinkedIn for "hotel consultant" / "hospitality consultant" + target geo filters (operational specialty preferred over revenue-mgmt or design).
  2. Enrich with website / direct email pattern.
  3. Send sequenced cold outreach (3-touch over 14 days) with the partnership pitch ("Want a free pilot you can offer your clients?").
  4. **Hand off to Bryan** the moment a consultant replies with any interest signal. Bryan takes the human conversation from there.
- **Hook:** *"Building a tool for boutique hotels (sub-100 rooms) where housekeeping ops are broken. Most of your clients probably have this pain. Want a free pilot you can offer them — referral fee structure if it converts?"*
- **Yield:** Per relationship established, 3-10 referrals/year. Target: 5-10 active consultant relationships within 90 days.
- **Cost:** Free (sandbox build + Bryan's Mac runs the sequencer).

### Tier 3 — Bryan-executes manual channels

**Channel 7 — Hotel supplier partnerships.** Verdict: **Bryan will test the partnership pitch.**

- **The signal:** Linen services, F&B distributors, hospitality CPAs, design firms — they all know the operators. Partnership with one supplier = access to their customer book.
- **Targets to approach:** Aramark (linens), Sysco (F&B distribution at boutique scale — actually probably US Foods or regional distributors), hospitality CPAs serving B&Bs / boutique, regional hospitality consultants outside Channel 3.
- **The ask:** "Trade — we'll refer Dispatch customers to you; you mention Dispatch to your customers when housekeeping comes up."
- **Bryan's lane:** he runs this manually. No automation justified — supplier-partnership conversations are personal.
- **Yield:** Per partnership, 5-20 warm intros/year. Slow to set up (60-90 days per partnership).
- **Cost:** Free; ~30-60 min per pitch.

**Channel 8 — Conferences / industry events.** Verdict: **Bryan looking into it.**

- **The signal:** Owners attending BLLA Conference, Independent Lodging Congress, HX, AAHOA Annual Convention, HITEC are investing time in their business — higher buyer intent than passive directory members.
- **Bryan's lane:** Researching which events are worth attending. Defer the spend (typically $1K-15K per event when travel + booth + sponsorship factored).
- **Pre-spend value:** Even without attending, the post-show attendee lists are sometimes purchasable separately. Worth investigating per event.
- **Yield:** 50-200 concentrated leads per event.
- **Cost:** $0 (research phase) → $1K-15K per event (post-funding decision).

### Tier 4 — Deferred to funding

**Channel 5 — State innkeeper / lodging associations.** Verdict: **Good if we can pay — defer to angel funding.**

- **The signal:** Membership is self-selection — operators who care enough about their industry to pay dues.
- **Public directories (free):** Most state associations publish member listings publicly on association websites. Mineable now at zero cost; this lane stays partially open even pre-funding.
- **Paid membership / vendor sponsorships:** ~$200-500/year per state. Adds vendor-listing visibility + ability to attend state events + sometimes deeper member contact info. **Deferred until angel funding lands.**
- **Pre-funding move:** Scrape the public directories only. Skip the paid tiers until cash exists.
- **Yield (public-only):** 50-300 hotels per state at zero cost; ICP-fit ~30-50%. Hundreds of viable prospects across top 5 states.
- **Cost (pre-funding):** $0 (scrape public directories) → $1K-2.5K/year for 5-state paid membership (post-funding).

### Dropped from active queue

**Channel 2 — Co-founder operator network referrals.** Verdict: **Not pursued.**

- Drop from active sourcing queue per Bryan call. Revisit if/when warm intros become a specific bottleneck or if Jennifer's network proves opportunistic later.

### URL scraping / Google Maps / Apify

The PMS-detection agent pipeline (covered in detail elsewhere in this doc) is the FOUNDATION layer that all other channels feed into. Hotels surfaced from Channels 1, 4, 6 (and post-funding 5) all get enriched through the same pipeline (PMS detection, room count, owner/GM, contact). The agent is what makes ALL channels scale.

### LinkedIn (Bryan's lane)

Bryan handles LinkedIn-side personal outreach manually — 8k followers, his expertise, his time. Automation is NOT applied to Bryan's personal LinkedIn motion. Where automation produces a prospect that's also a 1st-degree connection of Bryan's, the workflow flags it and routes to Bryan for warm outreach instead of cold.

### Specifically NOT-sources to avoid

- **General hotel email lists / scrape services** (e.g., generic B2B email databases). Too broad; ICP fit is 5-10%. Burns reputation faster than it lands customers.
- **Cold-call services (telemarketing firms).** Wrong fit for boutique hospitality where owner-operators answer their own phones.
- **HotelTechReport vendor lists.** That's where Dispatch SHOULD be listed (Lane I.G), not where to mine prospects.
- **BLLA vendor partnership** (was previously in this section as a sourcing channel). Reclassified — BLLA vendor partnership is INBOUND distribution (hotels find Dispatch via BLLA marketplace), not outbound sourcing. Belongs in Lane V partnerships, not here. Pricing also confirmed $995-3,500+/year for hotel members; vendor pricing hidden behind sales call.

---

## III.A.1 — Automation backlog (what to build, in what order)

Engineering substrate for the multi-channel framework. Build sequence:

| Order | Component | Channels served | Build effort | Status |
|---|---|---|---|---|
| 1 | **PMS-detection agent** (URL → PMS mapping via booking-widget redirect) | Foundation for all channels | ~4-8 hours | Sketched in chat; pending build at 200-hotel scale |
| 2 | **Job-posting scraper** (Indeed + LinkedIn Jobs + Hcareers daily monitor) | Channel 1 | ~3-5 hours | Pending |
| 3 | **Negative review monitor** (Apify TripAdvisor + Google reviews, weekly digest with keyword + recency + severity scoring) | Channel 4 | ~2-3 hours setup + Apify config | Pending |
| 4 | **Consultant discovery + outreach sequencer** (LinkedIn scraper + 3-touch email sequence + Bryan-handoff trigger) | Channel 3 | ~6-10 hours | Pending; Bryan-handoff logic is the load-bearing piece |
| 5 | **AAHOA directory scraper** (authenticated session, member filter) | Channel 6 | ~3-5 hours after membership lands | Pending; gated on $295 spend |
| 6 | **State association directory scrapers** (per-state, public directories) | Channel 5 | ~2 hours per state | Pending; scrape pre-funding for free states |

**Foundation principle:** every channel's output funnels into the same enriched prospect-list CSV (`docs/gtm/prospect-list.md` structure). Standard columns regardless of channel.

---

---

## III.B — Trigger language (3 opening hooks for testing)

From Lane I positioning, three hook frames. Test all three in beta; the one that gets best reply rate becomes the default.

### Hook A — Diagnostic ("expose the wound")
> Subject: Quick question about your housekeeping app
>
> Hi [name],
>
> Saw you run [hotel name] — quick question: when one of your housekeepers finishes a room, how does the front desk find out? Verbal? Walkie? Paper update? Just curious how you've solved it.
>
> Built a tool for boutique hotels under 100 rooms (mobile-first, no PMS swap required) and trying to figure out which "current state" pain it actually solves vs. which is overstated. Happy to share what we're seeing if you've got a sec.
>
> [Bryan]

### Hook B — Variable-turnover ("every other tool is a list")
> Subject: When a guest extends, your housekeeping should know
>
> Hi [name],
>
> Quick scenario: it's 10am, a guest in room 14 extends two more nights. Your housekeeper was about to start a checkout clean. How does your current system handle that?
>
> Most PMS housekeeping modules force a manual edit — which is fine until your team's at 80% utilization. We built Dispatch for boutique hotels where the day re-plans itself when something shifts. Mobile-first; works alongside whatever PMS you already use.
>
> Worth 15 minutes to show you?
>
> [Bryan]

### Hook C — Operator-credibility ("built by an operator")
> Subject: A housekeeping app a Wisconsin innkeeper actually liked
>
> Hi [name],
>
> Awkward intro: we built a housekeeping app for boutique hotels because my co-founder runs one in Wisconsin and was sick of printing PDFs every morning. She uses ResNexus too — it just didn't work for her team on the floor.
>
> If you've ever looked at the PMS-bundled housekeeping module and thought "this isn't really for the people doing the work," that's the gap we're filling. Mobile-first, no PMS swap, $5-7/room/month transparent.
>
> Worth a look?
>
> [Bryan]

**Why three?** Different hotels respond to different framings. Hook A is diagnostic and respects their time; works on detail-oriented operators. Hook B leads with the orchestration pitch; works on operators who've been frustrated by static systems. Hook C uses credibility-by-co-founder; works on operators who've been burned by SaaS sales-y outreach. Test which one Jennifer's-segment respond to.

---

## III.C — Sequence design (beta motion)

**For 2-10 beta hotels: don't use a sequence. Send ONE personalized email per hotel.** Sequences are for scale; beta is for signal.

Sequence shape (only):
- Day 0: Hook (A/B/C variant)
- Day 5 if no reply: short bump ("circling back — quick yes/no?")
- Day 12 if no reply: short value-add ("FYI we published the variant-aware checklist piece — link") — only if you have a value-add to send
- Stop. Two follow-ups max during beta. Beat the dead horse on a different prospect.

**Frequency: ~5 emails per day, all personalized.** This is achievable solo without burning out. Spread across the 30-50 named target list = 6-10 weeks of outreach for beta.

**Reply rates to expect (boutique B2B SaaS benchmarks):**
- Cold reply rate: 3-8% (above 8% = you're hitting a real wound)
- Demo conversion of replies: 30-50%
- Demo to pilot conversion: 40-60%
- Pilot to paid: 60-80% (free 30-day pilot auto-converts unless they cancel)

Math: 100 hotels emailed → 5 replies → 2 demos → 1 pilot → ~80% close = 0.8 paying customers. To hit 10 beta customers = ~1,000 emails sent (or higher reply rate).

**Bryan's realistic beta volume:** 5 emails/day × 5 days/week × 8 weeks = 200 emails. Implies need for 5%+ reply rate (above average) and 50%+ close rate (above average) to hit 10. Achievable with founder-led + tight ICP + real category-creation pitch.

---

## III.D — Sequence design (post-beta, when this lane re-opens)

**Three-touch cold sequence + multi-channel:**
- Day 0: Email (best hook variant from beta)
- Day 3: LinkedIn connection request with one-line context
- Day 7: Email bump
- Day 14: LinkedIn message after acceptance
- Day 21: Final email with case study attachment

**Volume target:** 30-50 emails/day once tooled. Single founder still in the loop on the first reply per prospect; SDR or VA handles bumps.

**Channel mix (boutique hospitality):**
- Email: primary (80% of touches). Most owners check email; few use LinkedIn actively.
- LinkedIn: warm-up (10% of touches). Builds context before/after email.
- Phone: rarely (~5%). Only for high-intent prospects who haven't responded to email.
- Direct mail: never. Too expensive at scale; signaling-only at high cost.

---

## III.E — CRM choice

**Beta motion: Airtable or Notion. Free or near-free. ~$0-20/month.**

You don't need HubSpot for 30-50 prospects. A simple Airtable with these columns:
- Hotel name
- Owner / GM name
- Email
- Phone (if available)
- PMS detected
- Source (BLLA / state-assoc / Google Maps / etc.)
- Hook tested (A/B/C)
- Date emailed
- Reply status (none / no / interested / demo-booked / pilot / paid)
- Next-step / notes

**Post-beta motion: Attio or HubSpot Free Tier. ~$0-50/seat/month.**

When volume crosses 100 active prospects and you've got an SDR/VA in the loop:
- **Attio** (recommended) — designed for modern B2B SaaS, AI-assisted, $19-29/seat. Cleaner data model than HubSpot. https://attio.com/
- **HubSpot Free** — industry-standard, free tier covers basics, generous limits, easier to find help. Defaults toward enterprise-y workflows.
- **Avoid: Salesforce.** Way too heavy for your stage. Revisit at $1M ARR.

**Avoid integrating CRM with the product before product is mature.** Don't waste a chase wiring `tasks` events into HubSpot. Customer success / churn signals come from the product directly; CRM tracks pre-sale only.

---

## III.F — Enrichment stack (post-beta)

Beta motion = no tools needed. Enrichment is "Google + LinkedIn for 10 minutes per prospect."

Post-beta motion:
- **Apollo.io** — sourcing + enrichment + sequencing all-in-one. $59-99/seat/month. Standard. https://apollo.io
- **Hunter.io** — email finder only. $34-149/month. Good supplement.
- **Clay.com** — AI-assisted data enrichment + sourcing. $149-349/month. Pricier, more flexible.

Recommend: **Apollo at start.** Best price/performance for cold outbound. Switch to Clay if you outgrow Apollo's data quality.

**Avoid: ZoomInfo, Lusha enterprise tier.** Too expensive for sub-$10M ARR companies.

---

## III.G — Human-in-the-loop handoff (when does Bryan get the email reply?)

**Beta motion:** every reply goes to Bryan. He responds personally to all of them. No filter.

**Post-beta motion:** the SDR/VA handles initial qualification. Bryan gets the reply when ONE of:
- Prospect explicitly asks for a demo
- Prospect asks pricing-validation question (signals real intent)
- Prospect asks integration / PMS-fit question (signals technical seriousness)
- Prospect replies with a request for case study / customer list
- 3rd back-and-forth on the same thread (signals warm)

Anything below those bars: SDR handles. Anything at-or-above: Bryan takes the call.

**Critical:** don't hand off too early. Boutique hospitality owners want to talk to the founder/builder, not "the sales rep." That's a real selling point at this stage. As you scale, hand off more — but resist the urge to hand off in months 1-6.

---

## III.H — First-list playbook by sub-segment

Concrete starting points for outbound list-building, by sub-segment from Lane II.

### Sub-segment 1 (independent boutiques, 8-50 rooms)

**Target: 100 named hotels.**

**Sources in order:**
1. BLLA member directory (~50 hotels match this size band)
2. State innkeeper associations for Wisconsin, Vermont, Maine, California (~30 hotels each = pick best 50)
3. Google Maps + PMS detection: "boutique hotel" + [state with high tourism] + filter websites for ResNexus/Little Hotelier/Cloudbeds branding

**Hook recommendation:** Hook C (operator-credibility, Jennifer as Wisconsin innkeeper reference) — works especially well for owner-operators who'll relate to a fellow operator-built tool.

### Sub-segment 2 (mid-market franchisees, 50-100 rooms)

**Target: 50 named hotels — defer until 5+ independent boutiques are paying.**

**Sources:**
1. AAHOA member directory (~70% of US franchise owners are AAHOA members)
2. Choice / IHG / Hilton owner forums (online communities)
3. Franchise-owner specific LinkedIn groups

**Hook recommendation:** Hook B (variable-turnover scenario) — most concrete for GMs who've experienced the operational chaos.

**Gating:** corporate approved-vendor lists. Don't pitch this segment until either (a) 5+ independent references exist OR (b) a PMS integration partnership gives certification cover.

### Sub-segment 3 (independent motels, 20-80 rooms, tourism corridors)

**Target: 50 named hotels — opportunistic.**

**Sources:**
1. State innkeeper associations + chamber of commerce listings in tourism corridors
2. Google Maps + brand detection in tourism areas (Cape Cod, Outer Banks, Door County, Smoky Mountains, etc.)

**Hook recommendation:** Hook A (diagnostic) — owner-operators in this segment respond to "respect for their time" framing.

---

## III.I — Beta-stage timeline (8-week motion)

Concrete week-by-week for hitting 10 beta hotels.

**Week 1 (this week, if Revify call goes well):**
- Subscribe to BLLA (basic tier)
- Pull initial list of 50 hotels from BLLA + Wisconsin state association
- Set up Airtable
- Send first 5 emails (Hook A/B/C, 1-2 each, test mix)

**Weeks 2-3:**
- Send 5/day, monitor replies
- First demos with anyone who responds
- Refine hook variant by reply rate

**Weeks 4-5:**
- Pivot to best-performing hook
- Add second-tier sourcing (state associations, Google Maps)
- First pilot signups

**Weeks 6-8:**
- Convert pilots → paid (free 30-day pilot auto-converts)
- Run Jennifer case study (deprioritized but lands here if you get bandwidth)
- 10 beta hotels paying/piloting by end of week 8

**Budget for beta motion:**
- BLLA membership: $395
- Airtable Pro (optional): $20/month × 2 months = $40
- Total beta stack: ~$435 for 8 weeks

**Bryan's time:** ~10 hours/week (1.5 hours/day on outbound + demos)

---

## III.J — Post-beta stack (month 4+, when this lane re-opens)

When beta validates → scale stack:
- Apollo.io for sourcing + sequencing: $99/month
- Clay.com for enrichment: $149/month
- Attio for CRM: $29/seat/month × 2 seats (Bryan + SDR) = $58
- Email infrastructure (Instantly.ai for cold-mailbox warm-up): $97/month
- VA or SDR: $1500-3000/month (depending on hire shape)

**Total post-beta monthly cost: ~$1,800-3,400.** Should be funded by Revify revenue share OR by the seed round (Lane VIII).

---

## What's NOT in scope here

- **Inbound funnel** — content marketing, SEO, webinars. Lane IV (marketing site) covers some of this; Lane VII case studies feeds it. Outbound is push; inbound is pull. Don't conflate.
- **Channel partnerships** — Lane V.C (PMS integration partnerships) covers distribution via Cloudbeds Marketplace, Mews Marketplace, etc.
- **Referrals from existing customers** — referral motion activates once 5+ hotels are paying. Pairs with Lane VII case studies.
- **Paid acquisition** — Google Ads, Facebook Ads, LinkedIn Ads. NOT for beta. Revisit when ICP + message validates and you can compute CAC.

---

## Open decisions / blockers

- **BLLA membership tier choice.** Basic vs. higher? Basic gets directory access for $395; recommend starting basic until you've exhausted that list.
- **Hook variant decision.** Three to test (A/B/C). No decision yet which is the default; that comes from beta reply rates.
- **VA / SDR hiring timing.** Not before beta validates. Probably month 4-6 when post-beta volume kicks in.
- **Email infrastructure for cold sending.** Bryan's personal email is fine for beta (5/day is well below spam thresholds). For post-beta scale (30-50/day), need dedicated sending domain + warm-up. Defer.

---

## Cross-references

- `docs/gtm/lanes/01-positioning.md` — three hook variants pull from the category-creation pitch lines + ResNexus narrative
- `docs/gtm/lanes/02-icp-and-pricing.md` — three personas + three sub-segments define who to target
- `docs/gtm/lanes/04-marketing-site.md` — pricing transparency from Lane II surfaces here; the marketing site is the "destination" outbound drives to
- `docs/gtm/lanes/05-partnerships.md` — PMS integration partnerships (V.C) become enrichment + distribution channels post-beta
- `docs/gtm/MASTER_PLAN.md` — Section III closes after first 10 beta paying/piloting + post-beta stack documented
