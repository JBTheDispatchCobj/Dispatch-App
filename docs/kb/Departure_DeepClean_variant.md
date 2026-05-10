# Departure — Deep Clean variant (KB substrate)

*Authored Day 53 chase #1. Closes the per-item how-to gap on Deep Clean variant; pairs with **VI.E** in `dispatch-master-plan.md`. Source-of-truth precedence: Jennifer Q2 + `Rules for HouseKeeping.docx.md` line 100–101 + Day-52-chase-#5 mining of Rules Table xlsx D-430 row 30 + Bryan's "Deep Clean Admin List" CSV (per-item how-to text).*

---

## Variant shape (per Jennifer Q2)

Deep Clean adds **one** parent line — `"Deep Clean"` — to the standard 7-section departure checklist. That parent line links (via the existing "details" pattern) to the 7-item sub-tree below. The 7 items live as the Deep Clean detail section that Rules.md line 100–101 already specifies for admin per-room tracking.

**Net checklist shape for a Deep Clean departure:** standard 7 + 1 parent = 8 sections. Sub-tree opens via `details` on the 8th section.

Applies to all 6 room types: Queen, Double, ADA Double, King Jacuzzi, ADA King Jacuzzi, Two Bedroom Suite (per Jennifer KB tree lines 138–185).

## The 8-section checklist (Deep Clean variant)

```
Departure (Deep Clean — Room Type)
  1. Open Room
  2. Report & Document
  3. Clear & Strip
  4. Clean
  5. Restock
  6. Bed
  7. Prep for Arrival / Close Out
  8. Deep Clean                            ← variant-only
       (details opens 7-item sub-tree below)
```

## Deep Clean detail sub-tree (7 items)

Per Bryan's Deep Clean Admin List CSV; per-item names mined Day 52 chase #5 from Rules Table xlsx D-430 row 30 ("Deep adds: AC Unit, Bedding, Bed, Walls, Bathroom, Shower/Sink, Freezer").

| # | Item | How-to (verbatim from Deep Clean Admin List) |
|---|---|---|
| 1 | AC Unit | Remove cover, vacuum, wash, replace, etc. |
| 2 | Bedding | Remove & replace all pillows, mattress pad, comforter, etc. Curtains. |
| 3 | Bed | Flip & rotate mattress, vacuum, move frame and clean under. |
| 4 | Walls | Wash & dry walls with mop — floor to ceiling. Wipe down baseboards. |
| 5 | Bathroom | Remove light cover & vent fan. Scrub floor with drill. |
| 6 | Shower / Sink | Clean faucet & heads, remove cap on sink, clean out drains with tool & Drano. |
| 7 | Defrost Freezer | Unplug, let melt, clean out, sanitize, plug back in. |

## System behavior cross-references (already specified in Rules.md line 101)

- Per-item check is logged with `completed_on`, `by`, `details` — the table model on the housekeeper card.
- Sub-items can be completed on a non-Deep day — they just log as one-off completions, don't block the standard departure.
- Per-task 30-day history follows the `deep_clean_history` table planned in master plan I.E.
- When the housekeeper completes a Deep Clean variant card, all 7 sub-items auto-complete by default.
- Sub-items auto-sort with incomplete at top.
- Admin sees a per-room view (rooms × items) of what's been done in the last 30 days.
- All 7 should complete at least once per 30 days when occupancy > 50% — failure triggers an admin card.

## What Day 53 ship covers vs. what stays open

**Day 53 covers:**
- The 7 item names + how-to text are now committed canonical KB substrate (`docs/kb/`).
- Pairs with VI.E: Deep Clean variant authoring is now KB-complete on the substrate side.

**Day 53 does NOT cover (still pending):**
- The conditional trigger seed against `context.outgoing_guest.clean_type='Deep'` at insert time + existing-Deep-task backfill — explicitly deferred to "Chase E" follow-up per master plan VI.E framing.
- The 8th section ("Deep Clean") is not yet authored into `lib/checklists/variants/single_queen.ts` (and siblings) as a conditional sub-node — that's part of Chase E orchestration work, not KB substrate.

**Shape note:** the +1-parent-with-sub-tree shape comes directly from Jennifer Q2 ("Deep Clean adds 1 item to the standard departure list — this line on the checklist will link to details on how to perform the tasks that you already have outlined in the 'deep clean' section"). No further Jennifer confirmation needed for the shape itself; the substrate above provides the per-item content the link resolves to.
