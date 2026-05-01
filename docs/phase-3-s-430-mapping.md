# Phase 3 — S-430 Stayovers Card Mapping

Source files:
- Component: `app/staff/task/[id]/StayoversCard.tsx`
- Artifact: `/Users/bryanstauder/Documents/Claude/Artifacts/dispatch-s-430/index.html`

---

## Step 1 — Data Binding Inventory (StayoversCard.tsx)

### Function signature

```ts
export default function StayoversCard({
  task, userId, displayName: _displayName,
  checklist, comments, inlineError, setInlineError,
  noteBody, setNoteBody, noteBusy,
  helpBusy, doneBusy, pauseBusy, resumeBusy,
  onToggleItem, onNeedHelp, onImDone, onPause, onResume, onPostNote,
}: StayoversCardProps)
```

Unlike ArrivalsCard, both `userId` and `setInlineError` are **actively used** here (for the Supabase status write). `displayName` is unused (`_displayName`).

### Hook calls

| Hook | Returns | Purpose |
|---|---|---|
| `useState<StayoverStatusKey[]>` | `[selectedStatuses, setSelectedStatuses]` | Multi-select status array; initialised from `task.context.stayover_status` |
| `useState<boolean>` | `[statusBusy, setStatusBusy]` | Mutation in-flight for status toggle |
| `useState<boolean>` | `[showChecklist, setShowChecklist]` | Drill-down overlay toggle |
| `useCallback` | `onToggleStayoverStatus(key)` | Supabase patch + task event on status change |

**Key finding — multi-active confirmed:** `selectedStatuses` is `StayoverStatusKey[]`. `onToggleStayoverStatus` adds or removes a key from the array (not single-select). The component already supports multiple simultaneous active statuses — this matches the artifact's two active pills (Guest OK + Desk OK) without any code change. ✓

### Callbacks / event handlers

| Handler | Trigger | What it does |
|---|---|---|
| `onToggleStayoverStatus(key)` | Status pill click | `supabase.tasks.update({ context: { ...task.context, stayover_status: next } })` + `logTaskEvent("stayover_status_changed", { from, to })` |
| `onToggleItem(item.dbItem)` | Checklist brow click | Parent callback |
| `setNoteBody(...)` | Note input change | Local controlled input |
| `onPostNote(e)` | Note form submit | Parent callback |
| `onNeedHelp()`, `onImDone()`, `onPause()`, `onResume()` | CTAs / toolbar | Parent callbacks |
| `setShowChecklist(true)` | Details link | Opens ChecklistDrillDown |

### Data fields referenced in JSX

| Field path | Derived as | Used for |
|---|---|---|
| `task.id`, `task.context` (spread) | — | Supabase update |
| `task.context.stayover_status` | `selectedStatuses` initial value | Status pill active states |
| `task.context.current_guest` | `guest: CurrentGuest \| null` | Brief rows |
| `task.context.room_number` | inside `displayRoom()` | Room loc |
| `task.room_number` | fallback in `displayRoom()` | Room loc |
| `task.title` | inside `roomFromTitle()` | Room loc last resort |
| `task.status` | `taskDone`, `inProgress`, `paused`, `stepsLocked` | Button disables |
| `task.due_time` | `dueTime` | Hero stamp pill |
| `guest.name` + `guest.party_size` | `guestDisplay` | Brief Guest row |
| `guest.nights_remaining` | `nightsDisplay` | Brief Night row |
| `guest.special_requests` | `notesDisplay` | Brief Notes row |
| `checklist[n].id`, `.title`, `.done` | `displayChecklist` | Checklist brows |
| `comments.length` | — | Note count |
| `noteBody`, `noteBusy` | — | Note form |
| `inlineError` | — | Error para |

`task.description` is **not currently used** in StayoversCard — relevant for Gap 3.

### Side effects

- Supabase `tasks.update` on status pill click (context patch)
- `logTaskEvent("stayover_status_changed", { from, to })` on status change

---

## Step 2 — Demo Data Inventory (S-430 artifact)

### Document structure (top to bottom)

1. **`.topstrip`** — ← back button + ＋ add-note (opens compose drawer)
2. **`.greet`**
   - Chip: `"Stayover"`
   - Loc: `"Room 20"`
   - h1: `"Refresh for David Adams"`
   - Date line: `"Night 2 of 3 · Sheet change"`
3. **`.statcard`** — status display card (above brief):
   - Heading row: `"Status"` + sub `"System set · 2 active"`
   - 5 `.status-pill` `<span>` elements (`pointer-events: none; cursor: default`):
     - Do Not Disturb (inactive)
     - Guest OK (`status-pill--active` — Electric Sky blue `--status-on`)
     - Desk OK (`status-pill--active`)
     - Sheet Change (inactive)
     - Done (inactive)
4. **`.brief`** — 4 `.briefrow` items:
   - Guest: `"David Adams · King Suite"`
   - Night: `"2 of 3"`
   - Type: `"Sheet change"`
   - Notes: `"Extra towels · only grey duvet"`
5. **`.section` — Checklist** — 6 `.brow` items (all pending): Open/Strip, Report/Doc, Clean, Restock, Prep, Close Out
6. **`.section` — Maintenance** — header "Maintenance · 2 open"; single `.exrow` (data-open="false"):
   - exrow header: icon `"MX"`, title `"Maintenance"`, sub `"2 open · 1 normal · 1 low"`, count `"2"`, chevron
   - Hidden expand area with 2 `.issue` entries:
     - Curtains·Loose / Linens·Room 20 / `issue__sev--normal` / Open / 11:50 AM
     - Lamp·Faded / Decor·Room 20 / `issue__sev--low` / Open / 10:22 AM
   - `.issue-add` "Log new issue" add button
7. **`.cta`** — `"Need Help"` + `"I'm Done"`
8. **`.foot`** — `"S-430 · Stayovers · Hot Coral"` (debug label)
9. **`.scrim` + `.compose` aside drawer** — "Log new issue" maintenance intake form:
   - Fields: Location (select with Room 20 preselected), Item (select), Type (select), Severity (sev-pills: Low/Normal/High), Photo (attach button), Notes (textarea)
   - Footer: `compose__submit` "Log Issue" button

**Important:** S-430's compose drawer uses `.compose__submit` (same as D-430), NOT `.compose__send` (A-430). The compose drawer is for maintenance issue logging, not notes.

### Demo script behaviors

| Interaction | Effect |
|---|---|
| ＋ topstrip click | Opens compose drawer |
| Status pills | No-op — `pointer-events: none` on spans |
| `.brow` click | Toggles `data-checked`, updates meta + count |
| `.brow__details` | `preventDefault` + `stopPropagation` |
| MX `.exrow__head` click | Toggles `data-open` (expand animation) |
| `.issue-add` click | Opens compose drawer |
| scrim / × / Escape | Closes compose drawer |
| Severity pill click | Single-select among Low/Normal/High |
| Photo button | Toggles attached state |
| Submit | Closes compose drawer |

---

## Step 3 — Mapping Table

### Data elements

| Artifact element | Component source | Notes |
|---|---|---|
| Chip `"Stayover"` | static literal | |
| Loc `"Room 20"` | `room` = `displayRoom(task)` | |
| h1 headline | `task.title` | |
| Date line `"Night 2 of 3 · Sheet change"` | composite — Gap 1 | |
| Statcard heading `"Status"` | static | |
| Statcard sub `"System set · 2 active"` | Gap 2 / `selectedStatuses.length` active | |
| Status pill Do Not Disturb | `selectedStatuses.includes("dnd")` → class | |
| Status pill Guest OK | `selectedStatuses.includes("guest_ok")` → class | |
| Status pill Desk OK | `selectedStatuses.includes("desk_ok")` → class | |
| Status pill Sheet Change | `selectedStatuses.includes("sheet_change")` → class | |
| Status pill Done | `selectedStatuses.includes("done")` → class | |
| Brief Guest `"David Adams · King Suite"` | `guestDisplay` (name + party_size, no room type) | room type has no data source |
| Brief Night `"2 of 3"` | `nightsDisplay` = `guest.nights_remaining` | raw string from context |
| Brief Type `"Sheet change"` | Gap 3 — no data source | |
| Brief Notes `"Extra towels · only grey duvet"` | `notesDisplay` = `guest.special_requests` | |
| Checklist count | `{doneCount} of {displayChecklist.length} done` | |
| Checklist brow items (6) | `displayChecklist` via `STAYOVERS_CANONICAL_CHECKLIST` | |
| Brow `data-checked` | `item.dbItem?.done ? "true" : "false"` | |
| Brow meta | `"Done"` or `"Pending"` | no timestamp, Gap 5 |
| Bar fill | CSS `data-checked` selector | no inline style needed |
| Maintenance section | Gap 4 — locked placeholder | |
| CTA "Need Help" | `onNeedHelp` | |
| CTA "I'm Done" | `onImDone` (disabled if `doneBusy \|\| taskDone \|\| paused`) | |
| Footer debug label | **DROP** | |

### Interactive behaviors

| Artifact behavior | Component handler |
|---|---|
| ← topstrip | `Link href="/staff"` as `.icon-circle` |
| ＋ topstrip | Gap 5 — DROP per D-430/A-430 pattern |
| Status pill click (spans, inert in artifact) | Gap 2 — see below |
| `.brow` click | `onToggleItem(item.dbItem)` if `!stepsLocked && !taskDone` |
| `.brow__details` | `setShowChecklist(true)` |
| MX exrow expand | Gap 4 — placeholder, no state |
| "Log new issue" | Gap 5 — not rendered (inside locked placeholder) |
| Need Help | `onNeedHelp` |
| I'm Done | `onImDone` |
| Pause / Resume | Retained above shell |

---

## Step 4 — Gap List

### Gap 1 — Date line: "Night 2 of 3 · Sheet change"

Two components:
- **"Night 2 of 3"** — maps closest to `guest.nights_remaining`. The `nightsStr()` parser in `parseCurrentGuest` already handles raw strings and numbers: if the manager stored `"2 of 3"` it appears verbatim; if a number, it's formatted as `"X nights left"`. The date line should use `guest.nights_remaining` directly rather than re-formatting.
- **"Sheet change"** — no data source. No `service_type` or `clean_type` field in `CurrentGuest`. The existing component's TYPE briefrow is already hardcoded to `"—"`. Task description (`task.description`) could hold this, but it's not reliably just a service type string.

**Recommendation:** Construct date line from `guest.nights_remaining` alone if available. If `task.description` exists and is short (≤ 30 chars), append it as the service type; otherwise omit.

```
{guest.nights_remaining ? `Night ${guest.nights_remaining}` : ""}{descNote && descNote.length <= 30 ? ` · ${descNote}` : ""}
```

If both are absent, render `" "` (single space) to preserve `.greet__date` layout height.

### Gap 2 — Status card: interactive buttons vs display-only spans (CRITICAL)

This is the most significant structural gap in S-430.

**Artifact design:** `.statcard` contains `<span class="status-pill">` elements with CSS `pointer-events: none; cursor: default` — they are **read-only display indicators**. The sub-header says "System set" implying the system sets them, not staff.

**Component design:** Status pills are `<button>` elements wired to `onToggleStayoverStatus()` — staff **manually toggles** each status, persisted to Supabase.

**The CSS conflict:** `.preview-s-430 .status-pill { pointer-events: none; cursor: default; }` — if I render `<button className="status-pill">`, the click handler will never fire because the CSS blocks pointer events. There is no way to make `.status-pill` interactive without either (a) modifying the scoped CSS in globals.css or (b) using inline style `pointerEvents: "auto"` to override.

**Options:**

A. **Keep interactive, use `style={{ pointerEvents: "auto", cursor: "pointer" }}`** — overrides the CSS constraint. Preserves the component's existing `onToggleStayoverStatus` behavior, Supabase write, and task event logging. Visually identical to the artifact for the active state. Only the cursor differs (interactive vs `default`).

B. **Render as display-only `<span>`** — matches artifact exactly. Staff cannot change status in-card. The `selectedStatuses` state still drives which pills show as active (reflecting persisted DB state), but changes require the admin view. Loses the component's interactive behavior.

C. **Modify the scoped CSS** — add a rule to restore pointer-events on `.status-pill` within statcard. Bryan said not to modify `.preview-s-430` scoped CSS.

**Recommendation: Option A** — inline `pointerEvents: "auto"` on each `<button className="status-pill">`. This is a functional override (not an animation style), consistent with the "data-attribute driven animations" constraint which applies to CSS transitions, not functional pointer event restoration. The visual design is preserved; only the cursor becomes `pointer` rather than `default` when hovered. The component's multi-toggle capability is retained.

If Bryan prefers Option B (strict artifact fidelity, lose interactivity), the statcard becomes purely display and `onToggleStayoverStatus` becomes dead code in the render — no other changes needed since the handler and state are untouched.

### Gap 3 — Brief "Type" briefrow

Artifact: `"Type: Sheet change"`. Component has no service/clean type field. Current JSX already hardcodes `"—"` for this row.

**Options:**
- Keep as `"—"` (existing behavior, honest about missing data)
- Use `task.description` as the Type value if it's a short string (≤ 30 chars)
- Omit the Type row entirely

**Recommendation:** Keep as `"—"`. Consistent with existing component; adding a heuristic description-as-type is fragile. The row is a placeholder until a service_type field is added to the DB.

### Gap 4 — Maintenance section: live data vs locked placeholder

The artifact shows a rich `.exrow` maintenance section with 2 live issues and a "Log new issue" compose drawer. The component has NO maintenance data props, no Supabase query for issues, and no handler for issue creation.

Same situation as D-430. Beta scope does not include maintenance CRUD in staff cards.

**Recommendation:** Render the Maintenance `.section` with a locked `.exrow` placeholder — no expand state, `data-open="false"`, no interactive content, `opacity: 0.55; cursor: default` on the exrow head (same as D-430). The "Log new issue" button is not rendered inside the locked placeholder.

### Gap 5 — Topstrip ＋ button and "Log new issue" compose drawer

＋ opens the maintenance intake compose drawer (`.compose__submit`, Location/Item/Type/Severity/Photo/Notes). No compose infrastructure in the component.

**Recommendation:** Drop ＋ (consistent with D-430 and A-430). The compose drawer HTML is not rendered. "Log new issue" lives inside the locked MX placeholder and is also not rendered.

### Gap 6 — Notes: no Notes section in artifact

S-430 artifact has no Notes section at all. The existing component has a NOTES tile in the 3-tile grid. The new layout has no tile grid. The question is where the note compose lives.

**Options:**
a. **Drop notes entirely** — matches artifact, loses note-posting capability
b. **Add Notes section between checklist and maintenance** — consistent with A-430 pattern, extends the artifact design

**Recommendation:** Add a minimal Notes section between checklist and maintenance — same `<section class="section">` + `.notes` feed + inline compose pattern as A-430. This preserves note-posting capability which is core operational functionality, using classes already present in the `.preview-s-430` scope (`.notes`, `.note`, `.note__dot`, `.compose__row`, `.compose__foot`, `.compose__send`).

`formatCommentTime()` should be added as a file-level helper (same as ArrivalsCard).

### Gap 7 — Statcard sub-header: "System set · X active"

Dynamic count of active statuses can be computed: `selectedStatuses.length`.

**Recommendation:** Render sub as:
```tsx
<span className="statcard__sub">
  {selectedStatuses.length > 0 ? `${selectedStatuses.length} active` : "None active"}
</span>
```
Drop the "System set ·" prefix — it conflicts with the component's interactive status design.

### Component features not in artifact — retained

| Feature | Action |
|---|---|
| Pause/Resume toolbar | Retain above `.shell` inside `.page` column |
| `ChecklistDrillDown` overlay | Mount outside `.preview-s-430` wrapper |
| `inlineError` | Keep as `.error` para below statcard |
| Notes compose | Add as Gap 6 resolution |
