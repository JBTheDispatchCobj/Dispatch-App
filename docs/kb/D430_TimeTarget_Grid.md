# D-430 Time-Target Grid (substrate reference)

*Authored Day 53 chase #3. Reader-friendly extract of the 18-cell `DEPARTURE_TIME_TARGET_MATRIX` from `lib/dispatch-config.ts:380-410` (Section 9). Values authoritatively closed Day 52 chase #6 against Jennifer's Rules for Housekeeping line 106 — this doc is just a clean view for if Jennifer ever wants to revise. Pairs with master plan **VI.F** (closed Day 52 chase #6) and **IV.G** (rule engine matrix fill, also closed via VI.F).*

---

## Source-of-truth precedence

1. `lib/dispatch-config.ts` Section 9 `DEPARTURE_TIME_TARGET_MATRIX` — operational values used by the runtime threshold logic.
2. `docs/kb/Rules for HouseKeeping.docx.md` line 106 — Jennifer's authored spec; matches the matrix exactly.
3. This doc — reader-friendly view; if values disagree with (1) or (2), fix this doc.

## The grid (minutes — strict bounds, no tolerance buffer)

Per Day 52 chase #6, all 18 cells are confirmed against Jennifer's verbatim text. ADA cells mirror their non-ADA counterparts per Jennifer Q5 ("ADA rooms do not take longer than their counterparts, they just have some different placement of items").

### Standard clean

| Room class | Min (min) | Max (min) |
|---|---:|---:|
| Single Queen (21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41) | 30 | 45 |
| Double (22, 24, 28, 32, 34, 36) | 35 | 50 |
| ADA Double (26) | 35 | 50 |
| King Jacuzzi (38) | 45 | 60 |
| ADA King Jacuzzi (42) | 45 | 60 |
| Two-Bedroom Suite (43) | 45 | 65 |

### Deep clean

| Room class | Min (min) | Max (min) |
|---|---:|---:|
| Single Queen | 60 | 120 |
| Double | 70 | 130 |
| ADA Double | 70 | 130 |
| King Jacuzzi | 75 | 150 |
| ADA King Jacuzzi | 75 | 150 |
| Two-Bedroom Suite | 75 | 150 |

### Pet clean

| Room class | Min (min) | Max (min) |
|---|---:|---:|
| Single Queen | 60 | 120 |
| Double | 70 | 130 |
| ADA Double | 70 | 130 |
| King Jacuzzi | 75 | 150 |
| ADA King Jacuzzi | 75 | 150 |
| Two-Bedroom Suite | 75 | 150 |

## Threshold semantics (per Rules.md line 106)

- **Strict bounds** — no per-cell tolerance. Anything outside [min, max] triggers a per-instance admin note. (`tolerance: 0` per cell.)
- **Repeated-instance escalation** (`DEPARTURE_REPEATED_INSTANCE_TRIGGERS` in `dispatch-config.ts`) — three independent conditions, any one fires:
  - 3 shifts in a row over/under
  - 25% of cards in a single shift over/under
  - 15% of cards in a calendar month over/under

## If Jennifer wants to revise

She can mark up this grid (e.g. "Standard Suite — bump max to 70" or "Pet King Jacuzzi 80-160"). Land changes by editing both `lib/dispatch-config.ts:380-410` AND this doc in lockstep — Day 49 codification.

ADA-vs-non-ADA: if Jennifer ever wants ADA cells to differ from their non-ADA siblings, the four ADA cells (Standard ADA Double, Deep ADA Double, Pet ADA Double, plus the three ADA King Jacuzzi cells) become independently authored. Currently mirroring is the Day 52 chase #4 confirmation per Jennifer Q5.
