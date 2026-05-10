# Departure — Pet Clean variant (KB substrate, partial)

*Authored Day 53 chase #1. Substrate names landed; per-item how-to text still pending Jennifer KB. Pairs with **VI.E** in `dispatch-master-plan.md`. Source-of-truth precedence: Jennifer Q2 (Pet checklist pending KB; can populate with standard departure list until additional info lands) + Day-52-chase-#5 mining of Rules Table xlsx D-430 row 30 (the +2 item names).*

---

## Variant shape (interpretation pending Jennifer ask Q2)

Pet Clean adds **two** items to the standard 7-section departure checklist. Whether the additions render as **inline items** (extending an existing section, e.g. extra steps under "Clean") OR as **two new sections** (8th + 9th, parallel to the Deep Clean +1 pattern) is not yet specified by Jennifer — see Day 53 chase ask Q2.

**Day 53 working assumption:** parallel to Deep Clean — two new sections appended after the standard 7. This is reversible cheaply if Jennifer prefers inline.

Applies to all 6 room types: Queen, Double, ADA Double, King Jacuzzi, ADA King Jacuzzi, Two Bedroom Suite (per Jennifer KB tree lines 90–137 — separate Pet variant per room type).

## The 9-section checklist (Pet Clean variant — working assumption)

```
Departure (Pet Clean — Room Type)
  1. Open Room
  2. Report & Document
  3. Clear & Strip
  4. Clean
  5. Restock
  6. Bed
  7. Prep for Arrival / Close Out
  8. Bedding                               ← variant-only (Pet); how-to TBD
  9. Floors                                ← variant-only (Pet); how-to TBD
```

## Pet Clean detail items (2 items)

Names sourced Day 52 chase #5 from Rules Table xlsx D-430 row 30 ("Pet adds: Bedding, Floors"). Per-item how-to text is the Jennifer ask — see Day 53 chase ask Q2.

| # | Item | How-to (pending Jennifer KB) |
|---|---|---|
| 1 | Bedding | *Pending Jennifer authoring. Working assumption: extra-rigorous bedding swap-out for pet hair/dander — full pillow/comforter/mattress-pad/curtains rotation similar to Deep Clean Bedding row, plus pet-specific lint pass.* |
| 2 | Floors | *Pending Jennifer authoring. Working assumption: deep vacuum + spot-clean for pet hair / accidents; pet-specific carpet treatment if available.* |

The italicized working-assumption text is **Cowork-Claude best-guess scaffolding only** — replace with Jennifer's authoring when it lands. Do not surface to staff in production until Jennifer-confirmed text replaces these placeholders.

## System behavior cross-references

- Pet Clean is triggered by system logic any time a pet is listed in the guest count (Rules.md line 97).
- Variant timing per `lib/dispatch-config.ts` Section 9 `DEPARTURE_TIME_TARGET_MATRIX` — Pet column already populated and confirmed Day 52 chase #6 (Pet Queen 60–120 min, Pet Double 70–130, Pet Jacuzzi 75–150, Pet Suite 75–150; ADA mirrors per Q5).
- Variant exists separate from Deep Clean — a single guest can trigger both (extended stay + pets), in which case Deep Clean variant's 8th-section sub-tree applies AND Pet Clean's two additions also apply. Order in checklist is Pet additions then Deep Clean section (per Jennifer KB tree convention; not load-bearing).

## What Day 53 ship covers vs. what stays open

**Day 53 covers:**
- The +2 item names committed as canonical KB substrate.
- Pairs with VI.E: Pet variant moves from "fully blocked on Jennifer KB" to "names landed; how-to text pending."
- Day 53 chase ask Q2 narrows the prior wide-open Pet ask to just the per-item how-to text (much tighter ask for Jennifer to answer).

**Day 53 does NOT cover (still pending):**
- Per-item how-to text — pending Jennifer (Day 53 chase ask Q2).
- Inline-vs-separate-sections shape — pending Jennifer (Day 53 chase ask Q2).
- Wiring into `lib/checklists/variants/*.ts` as a conditional variant — same shape as Deep Clean Chase E follow-up; depends on Q2 answer + the conditional-trigger orchestration work.
