# Dispatch — Rules Table Handoff

*From the chat / design / product session back to Bryan and the dev-side build (Claude + Claude Code). Drop this into the dev chat as the first message; it carries enough context to anchor work without re-deriving from the source docs.*

*Date prepared: end of Day 21 + Day 22 chat session.*

---

## What this is

A row-by-row governance table covering every card and section currently scoped in Dispatch. Built so a development-side Claude (or Claude Code) can read a single doc and answer "where does this data come from, what's locked, what can admin override, what's automated, who sees it, what happens when it's empty, does it log" without re-reading the source docs.

Two formats, same content:

- **Markdown** — `Dispatch — Rules Table for Card and Section Governance.md`. Canonical. Token-efficient. Easy to diff.
- **Xlsx** — `Dispatch — Rules Table for Card and Section Governance.xlsx`. Same content, restructured for human editing. 25 sheets, frozen headers, AutoFilter on every data sheet.

Both files live in the project's workspace folder. Use whichever fits your workflow; the markdown is the source of truth and the xlsx is a mirror.

## Source-doc precedence

When source docs disagree, the doc resolves to this order:

1. **Day 20 UI Handoff** — canonical visual + structural lock for the staff bucket cards and staff home.
2. **Profile surfaces handoff** — admin profile-adjacent surfaces (Roster, Profile, Home).
3. **dispatch-ui-rules** — product-model invariants (Staff = execution-first, Admin = compression-first; the 3-state collapsed/preview/full model; what NOT to turn this into).
4. **Rules.md** — operational behavior (assignment, timing, triggers, logging, percentages, exceptions).
5. **KB docs** — Stayover Standard, Arrival Standard, Knowledge Build Standard Departure, Start of Day, Alternatives. The KB tree is canonical for any checklist content; Rules.md summaries that disagree with the KB lose.
6. **Note Types / Maintenance Dropdowns** — taxonomies.
7. **Status Handoff (end of Day 21)** — current build state, used for STUB labeling.

If the dev chat finds a contradiction, escalate rather than resolving silently.

## Sheet-by-sheet overview (xlsx)

| Sheet | What's in it |
| --- | --- |
| README | Preamble, source-doc precedence, column key, conventions. |
| Schema Reference | Tables, JSONB subkeys, merge-safe save contract, route summary, auth + storage stack. |
| Global Rules | Cross-surface rules: identity, time tracking, note model, maintenance model, updates panel, activity feed, reservations, archive, photo media, plus six new rows added this session (card reassignment dual-logging, card order rotation, note routing to category cards, KB system entity, Detail-view-out-of-order, repeated-instance meta-trigger). |
| Hallway + Assignment | Physical layout, two-cart constraint, primary-housekeeper lane, departure priority stack, cross-cutting bumps, hallway adjacency rule, housekeeper context load adjustment, no-orphan-cards rule, timing windows. |
| Pre-Clock-In | What staff sees before clock-in (profile link, "Start your day" CTA). |
| Staff Home | Cream surface, daily brief, bucket card stack, sequential gating. |
| SOD-430 Start of Day · D-430 Departures · S-430 Stayovers · A-430 Arrivals · Da-430 Dailys · E-430 End of Day | Per-card sheets: header, brief, status, setup, checklist, notes, maintenance, footer CTAs, plus Pause/Resume action rows. |
| Admin Home | Cream surface, daily brief, 2×2 mini-status grid, activity feed, three lanes. |
| Admin Staff Roster · Admin Staff Profile · Admin Tasks Dashboard · Admin Task View Modal · Admin Maintenance · Admin Weekly Recap | Admin surfaces. Staff Profile carries the daily summary + lifetime running shift summary in addition to 14-day segments and stand-out instances. |
| Admin Calendar (post-beta) | Stub: scheduling, coverage detection, payroll tracking, 14-day segment indication. |
| Admin Category Cards (post-beta stub) | Stub: per-Note-Type admin cards. Maintenance is partly built; the rest are post-beta. |
| Admin KB Editing Tool (post-beta stub) | Stub: branch editing, add/remove/relocate/adjust, triggers Updates panel cascade. |
| Post-Beta BR Queue | Snapshot of ~38 BRs accumulated across Day 16 / 17 / 18 / 20 handoffs. Build-state reference, not authoritative. |
| Open Assumptions | 22 flags for items the doc transcribed assumptions for, contradictions in source docs, or questions deferred. |
| Update Cadence | When to re-pass the doc. |

## Locked conventions (the dev chat should treat these as invariant)

- **Visibility model.** Staff sees only the card in front of them plus the notes / photos / checkmarks they themselves authored on it. Admin sees everything in the system; the Admin vis. column annotates *where* admin sees a given field (drill-in, audit feed, master table, category card), not whether they can.
- **No card-exclusive logging.** Every card-internal log also has a structured admin sink (staff profile / location table / master table / category card / activity feed).
- **Time-tracking dual sink.** Every per-card duration logs to both the staff profile (admin view) and the location table (admin view). Both admin-only.
- **Notes routing dual sink.** Every note (staff-authored or rule-triggered) lands in both the individual log under the relevant staff member AND a category card on admin grouped by Note Type.
- **No orphan cards.** Every card always gets assigned to someone on shift. When workload exceeds standard load (5 dep / 10 stay / 15 daily per housekeeper), distribution stays as even as possible within other rules; admin notified ASAP.
- **KB authority.** KB tree is read-only for staff (always) and edited only via the admin KB editing tool. Detail view is open at any time regardless of checklist progress. Section gating applies to the complete action, not the view action.
- **Internal vs. display copy.** "Maintenance" / "End of Day" are display strings; internal identifiers (`maint`, `eod` enum, file paths, css classes) are preserved. Never confuse the two.
- **Time-arc order.** SOD → Departures → Stayovers → Arrivals → Dailys → EOD. Locked. Stayovers ahead of Arrivals matches the operational arc.
- **Sequential gating (staff side only).** Hard lock — non-active bucket cards are blurred + pointer-events-none. Admin has no gate.

## Decisions locked this session

Rolling list of every operational rule that was clarified or resolved in this chat. Use as a changelog if anything reads inconsistent with the source docs.

1. **Staff visibility is execution-only.** Staff sees the assigned card in front of them and what they themselves added. Time logs, audit data, aggregate metrics, and other staff's data are admin-only.
2. **Admin access path to staff data.** Through `/admin/staff/[id]` drill-in, the activity feed, lanes, and master tables. Admin does NOT shadow `/staff` in real time.
3. **Per-card duration dual sink.** Staff profile (admin view) + location table (admin view). Both admin-only.
4. **Daily summary + lifetime running shift summary.** Both surface on the admin staff profile alongside the 14-day segments and stand-out instances.
5. **No card-exclusive logging.** Every log has a structured admin sink.
6. **Photo / Tools / Chemicals on KB steps are optional metadata.** Not required. The KB itself is scaffolding under active development.
7. **KB is read-only for staff.** Admin edits exclusively through a dedicated KB editing tool, one branch at a time, with the ability to add / remove / relocate / adjust.
8. **Detail viewing out of order is permitted.** Section gating applies to the complete action, not the view action.
9. **Notes route to two sinks.** Individual log on the relevant staff profile + category card on admin grouped by Note Type.
10. **Card order rotation within a bucket.** Completed cards drop off the top so open cards stay on top. Cross-bucket time-driven interruption is the separate Pre-stayover reshuffle rule (Hallway + Assignment Policy sheet).
11. **Pre-stayover reshuffle.** At the 11am weekday / 12pm weekend threshold, the queue reshuffles to push stayovers and arrivals up; cards in flight aren't interrupted mid-execution.
12. **Hallway model — physical sequence.** 20s: 43 → Supply → 21 → 22 → 23 → 24 → 25 → 26 → 27 → 28 → 29. 30s: Laundry → 31 → ... → 39. 40s: Public Restroom → 41 → 42. Room 43 (Suite) lives in the 20s hall.
13. **Two-cart constraint.** At most two halls actively staffed simultaneously. Doubling-up within a hall is allowed.
14. **Primary-housekeeper lane.** Up to 2 primaries per shift handle stayovers + arrivals; one to 30s, the other to 20s; whichever has lighter load also takes 40s. Non-primaries get more departures + dailys.
15. **No orphan cards.** Every card is always assigned to someone on shift. Admin notified ASAP when workload exceeds standard load.
16. **Card reassignment dual-logging.** When admin reassigns, the event logs to both staff profiles and on the card.
17. **Repeated-instance meta-trigger.** When a per-instance trigger fires above its specified threshold over a window, an additional admin log + note fires beyond the per-instance trigger.
18. **Section-gating extends to Departures, Stayovers, Arrivals, and Dailys.** Not just Start of Day. Staff completes by section.
19. **Stayover Status — staff-set, default unselected.** Admin can pre-select. Pre-selection of DND, Desk OK, or Guest OK auto-completes + auto-archives the card off the staff queue. Pre-selection of Sheet Change or Done is standard admin override (staff still executes). Staff-tracked percentages key off staff selections only — admin pre-selections do NOT count.
20. **Admin calendar surface (post-beta).** Drives scheduling (pre-shift card assignment), coverage detection (overload alerts), and payroll tracking. Not built yet but acknowledged as coming.

## Spots Bryan should double-check before the dev chat treats anything as load-bearing

Listed in priority order — items 1, 2, 4 are the most concrete and would silently mis-shape the build if wrong.

1. **Hall sequence physical order.** 20s hall: 43 → Supply → 21 → ... → 29 (transcribed verbatim from Rules.md). The 43-first-then-21 ordering may be a typo; if 43 is physically elsewhere, the routing logic is wrong.
2. **Stayover Status percentages exclude admin pre-selections.** The doc treats admin pre-selects as not counting toward the >40% / >20% / >30% triggers. If pre-selects DO count, performance reviews would change materially.
3. **Two-cart constraint = at most two halls actively staffed simultaneously.** Doc reads it as a hard concurrency cap. Rules.md says housekeepers need a cart in their hall, but doesn't explicitly cap halls at two. Confirm.
4. **`tasks.card_type` enum extras.** `housekeeping_turn` (legacy alias for departures?), `generic` (catch-all?), `maintenance` (admin-side?) — all my labels are guesses. Worth a 30-second confirm against the live schema.
5. **Sheet Change skip semantics.** "Skip the next scheduled sheet change for this guest in this room" — does the system remove a future scheduling entry, or just suppress the next firing? Different implementations.
6. **Section-gating on Dailys.** Tasks are bundled by location; "Must be completed in order" might mean location-bundle order rather than strict section gating. Confirm.
7. **Updates panel scoping.** "Related to that card type / room type / clean type" — the Damages tree is used inside Departures Document & Report. A Damages edit fires on Departures only? Or any card linking to Damages? Doc assumes the former.
8. **Affirmations as KB content.** Treated as KB-edited via the KB editing tool; could also be a separate config surface.
9. **RES source attribution is aspirational.** Many rows say "Source: RES" but the reservations table is a deferred BR; today only `inbound_events` raw payloads exist. Schema Reference calls this out, but per-card rows could read as if RES is live.

## Deferred — KB system questions Bryan is taking on

- Versioning + change history. When admin edits a KB node, is the prior version retained? Affects Updates panel highlighting, audit trail, rollback.
- Branch-move / relocate semantics. Existing checklist references — auto-update, broken, or pinned to old path? Queued Updates rows at the old location? Archived cards' references?
- Cross-references inside the KB (the "blue text links to primary source with same text" pattern in standard KB docs). The editing tool should support setting / breaking these.
- Variant lists (Sheet Change, Pet Clean, Deep Clean, *** guest, Long-term). Stored as separate sub-trees with metadata (e.g., `applies_when: clean_type=deep`), or full alternate trees that fully replace? Affects selection logic and editing surfaces.
- Taxonomy editing (Note Types, Note Status, Note Assigned-to, Maintenance Location / Item / Type). Through the same KB editing tool or a separate taxonomy editor?
- Worked KB-driven example (Wednesday Deep Clean trigger end-to-end). Bryan to walk through when he has time. Highest-leverage example for sanity-checking the full flow.

## Open assumptions (full list lives on the Open Assumptions sheet)

22 items flagged. Highlights worth pulling here: the A-430 header in Rules.md says "Stayover · ..." — assumed typo, transcribed as "Arrival · ..."; the Arrival Status fourth state is left blank in Rules.md (`__________`); the Plus quick-add button is treated as a visual placeholder; the staff completion metric is admin-only by default; the `***` guest is a placeholder for an unnamed discounted-guest type; pause/resume button placement isn't pinned in Day 20; activity feed schema is reverse-chronological with severity boost (assumed); the welcome-specific checklist forks for Arrivals / Stayovers are BR-pending. The full set is on the sheet.

## How to use this doc downstream

**Drop it into the dev chat as the first message.** Either format works — markdown for token efficiency, xlsx if the dev chat ingests spreadsheets cleanly. The dev chat should treat this doc as canonical for governance and the source-doc precedence ladder above for everything else.

**When to consult which sheet:**

- Building a new card or modifying an existing one → the per-card sheet plus Global Rules.
- Schema / data-model questions → Schema Reference.
- Assignment, timing, hallway-routing, or load-balancing questions → Hallway + Assignment.
- Admin surface questions → the relevant Admin sheet.
- Post-beta build planning → Post-Beta BR Queue.
- Anything ambiguous → Open Assumptions, then escalate to Bryan.

**The doc covers governance, not implementation.** It says where data comes from, who can write it, who sees it, what triggers it, what logs. It does NOT specify React component shapes, CSS classes, or migration SQL. The dev chat resolves implementation; this doc bounds the operational rules implementation must respect.

## Update cadence

Re-pass the doc when:

- A handoff doc past Day 20 lands (re-anchor structural rules).
- Rules.md gets revised for Dailys / EOD / Maintenance.
- The Reservations BR pack ships (RES rows graduate from "BR3 wires" to "live").
- Auto-assignment ships (drop "currently manual" caveats).
- KB editing tool ships (resolve deferred KB system questions).
- Any STUB section receives real wiring.

Each pass: bump rows, mark deltas, leave a one-line changelog at the top with date and what shifted.

## Files in this handoff

| File | Path | Purpose |
| --- | --- | --- |
| `Dispatch — Rules Table for Card and Section Governance.md` | Workspace folder | Canonical rules table — markdown source. |
| `Dispatch — Rules Table for Card and Section Governance.xlsx` | Workspace folder | Same content, 25 sheets, for human editing. |
| `Dispatch — Rules Table Handoff.md` | Workspace folder | This doc. Read first. |
| Source docs (UI Handoffs, Rules.md, KB docs, etc.) | Project Chat folder | Reference. The rules table doesn't replace them; it indexes them. |

---

*Questions, corrections, additions — back to Bryan or to the chat session that produced this. The rules table is intentionally living: most "Open Assumptions" are flagged for resolution rather than baked-in answers, and the doc is built to absorb updates incrementally without losing the existing structure.*
