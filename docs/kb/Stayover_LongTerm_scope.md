# Long-term Stayover — scope-to-checklist mapping (substrate reference)

*Authored Day 53 chase #3. Captures the Day 52 chase #6 threshold resolution for "Long-term" framing so future variant-checklist authoring has a clean shape reference. Pairs with the still-pending Long-term Maintenance Stayover variant checklist content (Day 53 ask Q2).*

---

## What "Long-term" means in Dispatch

There are **two distinct length-of-stay thresholds**, each with its own behavior. Don't conflate them — they answer different operational questions.

### 7-night threshold — operational variant triggers

Per Rules for Housekeeping lines 97 / 118 / 132. When a guest's stay exceeds 7 nights, three operational behaviors activate:

| Behavior | Source | Effect |
|---|---|---|
| Deep Clean elevation | Rules.md line 97 | A standard cleaning becomes a Deep Clean variant on the next eligible Wed-occupancy trigger window (per `lib/orchestration/deep-clean-elevation.ts`). |
| Sheet Change scheduling | Rules.md line 132 | Sheet Change Stayovers get scheduled mid-stay per the cadence rule. |
| Modified stayover time targets | Rules.md line 118 | "For \*\*\* or guests staying longer than 7 days, [stayovers] should take 3-8 minutes." (Per `STAYOVER_STATUS_TIME_TARGETS` in `dispatch-config.ts`.) |

This 7-night threshold is **operational** — it changes how staff interacts with the room. The variants exist as distinct execution shapes (Sheet Change Stayover variant CHECKLIST, modified stayover time targets), not as banners.

### 14-night threshold — Setup notation

Per Rules for Housekeeping line 93. When a guest's stay exceeds 14 nights, an additional **Setup-section banner** ("Longterm Prep") appears at the top of the staff card, linking to the long-term arrival/stayover sections of the KB for that room type.

This 14-night threshold is **informational** — it adds context to the staff card without changing the underlying execution shape. Compare to VIP banner behavior (Day 52 chase #4) — same UI pattern (banner above greeting block), different trigger.

## What variant CHECKLISTS still need authoring

- **Sheet Change Stayover variant CHECKLIST** — 7-night-triggered variant; needs per-section authoring vs the standard 8-item Stayover (Day 53 ask Q2).
- **Long-term Maintenance Stayover variant CHECKLIST** — separate from the 14-night Setup banner above; this is the actual checklist content for the reduced-cadence weekly service Jennifer needs to author. Day 53 ask Q2 carries the framing context she requested in Q2 ("reduced-cadence weekly service for guests staying 14+ days where they're treating the room more like a residence").
- **\*\*\* (modified discounted) guest variant CHECKLIST** — independent of length-of-stay; triggered by guest type. Day 53 ask Q2.

## What's already authored / shipped

- **Standard Stayover CHECKLIST** — Day 52 chase #3 (`lib/staff-task-execution-checklist.ts` `STAYOVERS_CANONICAL_CHECKLIST` = 8 items: Status / Open Room / Remove / Replace / Bed / Clean / Close / Card in App; matching DB seed in `tasks_seed_default_checklist()`).
- **Modified stayover time targets** — Day 24 + Day 52 chase #6 (`STAYOVER_STATUS_TIME_TARGETS` Done variant with long-term lower bound 3-8 min vs standard 8-15 min).
- **Deep Clean elevation orchestration** — `lib/orchestration/deep-clean-elevation.ts`; `DEEP_CLEAN_AUTO_TRIGGER` thresholds in `dispatch-config.ts` Section 12.
- **VIP banner** — Day 52 chase #4 (`task.context.vip` flag + `.vip-banner` CSS in `app/globals.css`).
- **Deep Clean +1 variant CHECKLIST line** — Day 53 chase #2 (Chase E) (`DEPARTURES_DEEP_CANONICAL_CHECKLIST`; conditional in `tasks_seed_default_checklist()`; `DeparturesCard.buildDisplayChecklist` branches on `outgoing.clean_type==='Deep'`).

## Forward shape when Jennifer answers Day 53 ask Q2

When Jennifer's three variant checklists land, the wiring follows the same shape as Chase E (Day 53 chase #2) — for each variant:

1. New named constant in `lib/staff-task-execution-checklist.ts` (e.g. `STAYOVERS_SHEET_CHANGE_CANONICAL_CHECKLIST`).
2. New conditional clause in `tasks_seed_default_checklist()` keyed on the variant trigger.
3. New branch in the relevant card's `buildDisplayChecklist()`.
4. Backfill SQL for existing matching tasks.

Trigger keys (working set, refine when Jennifer's content lands):
- Sheet Change: `task.context.sheet_change === true` (or via `stayover_status === 'sheet_change'` after the stayover_status setter from Day 52 chase #2).
- \*\*\* guest: `task.context.modified_discounted === true` (new flag — analogous to Day 52 chase #4's `vip` flag).
- Long-term Maintenance: `task.context.outgoing_guest.nights_total >= 14` (or a derived flag).
