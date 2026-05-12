# Dispatch — Prospect list (working)

*GTM Lane III outbound substrate. First-pass sourced hotels matching ICP (independent boutique + franchisee, under 100 rooms, sub-4.5 stars). Authored Day 53 chase #6. Updated incrementally as more states / sub-segments get mined.*

*This is the actual list, not the methodology. The methodology lives in `docs/gtm/lanes/03-outbound.md`.*

---

## How to read this doc

Each hotel row gets columns: name / location / rooms / PMS detected / contact path / sub-segment / source / next action.

**PMS detection trick (load-bearing):** click any hotel's "Book Now" button and look at the URL the booking widget redirects to. The subdomain reveals the PMS. This is the cheapest way to qualify ICP fit (specifically: hotels on PMS-bundled-housekeeping competitors who'd benefit from Dispatch's wedge).

Common booking-URL → PMS mappings:
- `secure.thinkreservations.com/[hotel]` → **ThinkReservations**
- `guest.rezstream.com/search/[hotel]` → **RezStream**
- `[hotel].lodgicalcrs.com` → **Lodgical CRS**
- `ibe.stayntouch.com` → **Stayntouch**
- `book.cloudbeds.com/reservation/` → **Cloudbeds**
- `app.littlehotelier.com/booking/` → **Little Hotelier**
- `direct-book.com/properties/` → **All-Inn / direct-book**
- `book.resnexus.com/[hotel]` → **ResNexus** (the canonical sub-segment-1 PMS — Jennifer uses this)
- Custom domain booking forms → likely Mews or Cloudbeds white-label

**Sub-segment codes** (from Lane II):
- S1 = independent boutiques, 8-50 rooms, owner-operated
- S2 = mid-market franchisees, 50-100 rooms
- S3 = independent motels, 20-80 rooms, tourism corridors

---

## Wave 1 — Wisconsin (Door County focus)

Door County is one of the densest US clusters of independent boutique inns. ~30-40 ICP-fit hotels in the county. Bryan's home-state credibility narrative applies. Wisconsin Bed & Breakfast Association at wbba.org has a fuller directory; Midwest Association of Independent Inns at mwinns.com is the regional sibling.

| # | Hotel | Location | Rooms | PMS | Contact | Sub-segment | Source | Next action |
|---|---|---|---|---|---|---|---|---|
| 1 | **The Dörr Hotel** | Sister Bay, WI (2329 Mill Rd) | ~30 est. | **Lodgical CRS** (thedorrhotel.lodgicalcrs.com) | 844-944-0354; website contact form | S1 | Door County Pulse + travel listings | Fetch /about.htm + /contact.htm for owner/GM name |
| 2 | **White Gull Inn** | Fish Creek, WI (4225 Main St) | ~12-15 est. (rooms + suites + cottages) | **ThinkReservations** (secure.thinkreservations.com) | innkeeper@whitegullinn.com; 920-868-3517 | S1 | Door County Pulse + Select Registry | Owner-name lookup (historic since 1896) |
| 3 | **White Lace Inn** | Sturgeon Bay, WI | ~18 est. | TBD | TBD | S1 | Wisconsin B&B Association article — **owners named: Dennis & Bonnie Statz** | Fetch website, find email |
| 4 | **Scofield House** | Sturgeon Bay, WI (Michigan St) | ~7 est. | TBD | TBD | S1 | MWInns member | Fetch website |
| 5 | **Garden Gate Inn** | Sturgeon Bay, WI (3rd Ave) | ~6 est. | TBD | TBD | S1 | MWInns member | Fetch website |
| 6 | **Foxglove Inn** | Sturgeon Bay, WI (3rd Ave, former Colonial Gardens) | TBD | TBD | TBD | S1 | MWInns member | Fetch website |
| 7 | **Inn at Cedar Crossing** | Sturgeon Bay, WI (downtown) | **9** (confirmed from article) | TBD | TBD | S1 | Door County travel article | Fetch website |
| 8 | **Eagle Harbor Inn** | Ephraim, WI | TBD | TBD | TBD | S1 | Door County travel article | Fetch website |

**Still to source in Wisconsin (queued for pass 2):**
- Complete WBBA member directory mine (~50 more hotels statewide)
- MWInns full member list
- Hayward / Bayfield / Lake Geneva / Door County overflow

---

## Wave 1 — Vermont

Vermont Lodging Association at lodgingvt.com has the master directory. Stowe + Woodstock + Burlington are highest concentration.

| # | Hotel | Location | Rooms | PMS | Contact | Sub-segment | Source | Next action |
|---|---|---|---|---|---|---|---|---|
| 9 | **The Inn at Montpelier** | Montpelier, VT (147 Main St) | **19** (confirmed) | **RezStream** (guest.rezstream.com/search/inn-at-montpelier) | 802-223-2727; website contact form | S1 | Vermont Lodging Association | Fetch /contact for owner-name. **High-priority: RezStream is the canonical sub-segment-1 PMS — natural fit for "Jennifer uses this too" framing.** |
| 10 | **On The River Inn** | Woodstock, VT (1653 W Woodstock Rd) | TBD (multiple room types incl. farmhouse suites) | **Stayntouch** (ontheriverinn.ibe.stayntouch.com) | reservations@ontheriverwoodstock.com; **generalmanager@ontheriverwoodstock.com**; 802-457-5000 | ⚠️ FLAG | Vermont Lodging Association | **Managed by Imprint Hospitality** (corporate-management chain). May not be ICP-fit (Lane II negative ICP excludes corporate-managed). Keep on radar but deprioritize. |
| 11 | **Hotel Vermont** | Burlington, VT (downtown) | TBD | TBD | TBD | S1 | New England Inns & Resorts | Fetch website |
| 12 | **Brook Bound Inn** | Wilmington, VT (Stratton Mountain area) | TBD | TBD | TBD | S1 | Vermont Lodging Association | Fetch website |
| 13 | **Grey Fox Inn** | Stowe, VT | **34** (confirmed from article) | TBD | TBD | S1 | Vermont Lodging Association | Fetch website |
| 14 | **Dorset Inn** | Dorset, VT (The Inns of Dorset group) | TBD (historic, est. 1796) | TBD | TBD | S1 | Vermont Lodging Association | Fetch website; check if part of group ownership |
| 15 | **Edson Hill** | Stowe, VT | TBD | TBD | TBD | S1 | New England Inns & Resorts | Fetch website |

**Still to source in Vermont (queued for pass 2):**
- Full lodgingvt.com member directory
- Manchester / Killington / Burlington overflow

---

## What's MISSING per row (for prioritization)

Every row above needs one or more of:
1. **Owner / GM name** — needed for cold email personalization. Highest priority.
2. **PMS confirmation** — fetch booking widget if not yet identified.
3. **Direct contact email** — `info@hotelname.com` is generic; `firstname@hotelname.com` for the owner converts way higher.
4. **Room count** — confirms ICP-fit (under 100 rooms).

**Enrichment plan for pass 2:**
- Per hotel: 1 web_fetch on `/about` page + 1 on `/contact` page = owner name + direct email pattern
- Time: ~10 minutes per hotel of focused work
- Realistic pass: 5-10 hotels per session

---

## Sub-segment 2 (franchisees, 50-100 rooms) — UNSCOPED YET

Per Lane II, defer this sub-segment until 5+ independent boutiques are paying. Don't mine franchisees yet — Hampton Inn / Holiday Inn Express / Best Western owners require corporate-approved-vendor track that's slower than independents.

When ready: AAHOA member directory is the primary source. ~70% of US franchise owners are AAHOA members.

---

## Sub-segment 3 (independent motels, tourism corridors) — UNSCOPED YET

Opportunistic only. Wait until pass 2 of Wisconsin + Vermont independent boutiques is exhausted before going to motels.

When ready: state chamber of commerce listings in tourism corridors (Door County, Cape Cod, Outer Banks, Smoky Mountains, etc.).

---

## Outbound priority order (from this list)

Based on PMS-detection signal + ICP-fit:

1. **Inn at Montpelier** (RezStream — same PMS as Jennifer's hotel). Single highest-priority cold outreach in this list. Hook: "Saw you're on RezStream — our co-founder runs a boutique on it too, was sick of how the housekeeping module works on the floor. Built Dispatch to fix that. Worth a look?"
2. **White Gull Inn** (ThinkReservations + direct email exposed). Hook: variant of #1 referencing their PMS.
3. **The Dörr Hotel** (Lodgical CRS, modern boutique). Hook: scenario-based ("when a guest extends at 10am…").
4. **White Lace Inn** (Owners named — Dennis & Bonnie Statz). Hook: warm personalization referencing their long-tenure in WI boutique scene.
5. **Inn at Cedar Crossing** (9 rooms, exactly the size of Jennifer's). Hook: direct ICP-fit pitch.
6. The remaining un-enriched rows (3-7 above) — enrich, then prioritize.

**Deprioritized:**
- On The River Inn (corporate-managed, may not fit ICP)

---

## Methodology notes for pass 2+

**Productive search query shapes:**
- "[State] Bed and Breakfast Association member directory"
- "[State] Innkeepers Association"
- "Boutique hotels [tourism region]" → cross-reference with PMS detection
- "[Town] inn owner" → LinkedIn results sometimes surface owner names

**Productive web_fetch targets per hotel:**
1. `/about` or `/about-us` page — owner names, history, scale
2. `/contact` page — direct emails, sometimes owner email pattern
3. Booking widget URL — PMS detection
4. Footer section of homepage — sometimes "managed by [parent]" disclosure (flag for corporate-management filter)

**Disqualification signals (don't bother enriching):**
- "Managed by [Hospitality Group]" footer text → corporate-managed, negative ICP
- "Part of [Hotel Group X]" → check size; if multi-property chain >5 properties, deprioritize
- ">100 rooms" stated explicitly → out of ICP
- "Luxury" / "5-star" / "rated AAA Diamond" → likely above 4.5 star, out of ICP

---

## Cross-references

- `docs/gtm/lanes/02-icp-and-pricing.md` — ICP definition + sub-segments
- `docs/gtm/lanes/03-outbound.md` — sourcing methodology + sequence design + CRM choice + trigger-language hooks
- `docs/gtm/lanes/05-partnerships.md` (when authored) — PMS partnership prioritization should weight toward whichever PMS shows up most in this prospect list (currently RezStream + ThinkReservations + Lodgical CRS visible)

---

## Update log

- **Day 53 chase #6 (this pass):** 15 hotels sourced (8 WI Door County + 7 VT), 4 fully fetched with PMS detection + contact paths, 11 named but un-enriched. 1 ICP-deprioritized (On The River Inn — corporate-managed).
