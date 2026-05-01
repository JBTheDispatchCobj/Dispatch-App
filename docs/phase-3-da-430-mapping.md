# Phase 3 — Da-430 Dailys Card Mapping

Source files:
- Component: `app/staff/task/[id]/DailysCard.tsx`
- Artifact: `/Users/bryanstauder/Documents/Claude/Artifacts/dispatch-da-430/index.html`

---

## Step 1 — Data Binding Inventory (DailysCard.tsx)

### Function signature

```ts
export default function DailysCard({
  task, userId: _userId, displayName: _displayName,
  checklist, comments, inlineError,
  noteBody, setNoteBody, noteBusy,
  helpBusy, doneBusy, pauseBusy, resumeBusy,
  onToggleItem, onNeedHelp, onImDone, onPause, onResume, onPostNote,
}: DailysCardProps)
```

### Hook calls

**None.** DailysCard is the only card component with zero `useState`, zero `useEffect`, zero `useCallback`. No drill-down overlay, no status chip state, no local Supabase writes. All state is in the parent; the component is purely reactive to props.

### Callbacks / event handlers

| Handler | Trigger | What it does |
|---|---|---|
| `onToggleItem(item)` | Task tile Complete/Done button | Parent handles Supabase update |
| `setNoteBody(e.target.value)` | Note textarea | Local controlled input via prop |
| `onPostNote(e)` | Note form submit | Parent posts comment |
| `onNeedHelp()`, `onImDone()`, `onPause()`, `onResume()` | CTAs / toolbar | Parent callbacks |

No ChecklistDrillDown, no `resolveChecklist`.

### Data fields referenced in JSX

| Field path | Derived as | Used for |
|---|---|---|
| `task.context.daily_task.location` | `location` (priority) | Task tile sub-label |
| `task.location_label` | `location` (fallback) | Task tile sub-label |
| `task.status` | `taskDone`, `inProgress`, `paused`, `stepsLocked` | Button disables |
| `task.description` | `descNote` | "Team Updates" panel body (current component repurposes this field) |
| `checklist[n].id`, `.title`, `.done` | — | Task tiles |
| `comments.length` | — | Note count |
| `noteBody`, `noteBusy`, `inlineError` | — | Note form / error |

**Key observation:** The current component has no team roster data whatsoever. `userId` and `displayName` are both prefixed `_` (unused). The "TEAM UPDATES" panel currently displays `task.description` as a prose blob — a field repurposed to hold team context notes written by the manager when creating the task.

### Side effects

None. No Supabase writes, no logTaskEvent.

---

## Step 2 — Demo Data Inventory (Da-430 artifact)

### Document structure (top to bottom)

1. **`.topstrip`** — ← back + ＋ add-note (opens compose drawer)
2. **`.greet`**
   - Chip: `"Dailys"`
   - Loc: `"Property Round"`
   - h1: `"Property round, Angie."`
   - Date: `"Thu Apr 30 · 6 stops"`
3. **`.section` — Team Updates** — 4 `.team__row` entries (white card):
   - AL / Angie — `team__you` badge, "On round · Restock cart pickup", **6 Stops** (`team__count--alert`)
   - LL / Lizzie — "Front desk · check-in coverage", **2 Left** (`team__count--alert`)
   - MP / Mark — "Maintenance · AC Rm 14", **3 Open** (plain count)
   - CM / Courtney — "On call · available till 8", **—** Avail (`team__count--zero`)
4. **`.section` — Notes** — 3 `.note button` entries (same grammar as A-430):
   - Courtney → `@ Angie` mention chip, "9:14 AM"
   - Jen → `📎 1` chip, "8:32 AM"
   - Mark → `@ Angie` mention chip, "Yesterday"
5. **`.section` — Property Round** — header "Property Round · 0 of 6 done"; `.tasks` 2-col grid with 6 `.task button` tiles:
   - Restock Cart / `"Supply Rm · See Layout"` / Complete pill + Details link
   - Dust Pictures / `"40s Hall"` / Complete + Details
   - Public Restrooms / `"Lobby · Check Paper"` / Complete + Details
   - Trash / `"Halls · All Floors"` / Complete + Details
   - Wash Windows / `"Lobby · Side Doors"` / Complete + Details
   - Vacuum / `"Halls · All Floors"` / Complete + Details
6. **`.cta`** — "Need Help" + "I'm Done"
7. **`.foot`** — "Da-430 · Dailys · Neon Plum" (debug)
8. **`.scrim` + `.compose` aside** — "New note · Property Round", `compose__input` + `compose__send`

### Demo script behaviors

| Interaction | Effect |
|---|---|
| ＋ topstrip | Opens compose drawer |
| `.task` click (not on Details) | Toggles `data-done`; pill text Complete→Done or vice versa; updates round count |
| `.task__link` click | `preventDefault` + `stopPropagation` |
| Compose input | Enables `compose__send` when non-empty |
| Send | Closes compose drawer |

---

## Step 3 — Mapping Table

### Data elements

| Artifact element | Component source | Notes |
|---|---|---|
| Chip `"Dailys"` | static literal | |
| Loc `"Property Round"` | `location ?? "Property Round"` | `location` from daily_task.location or location_label |
| h1 `"Property round, Angie."` | `task.title` | |
| Date line `"Thu Apr 30 · 6 stops"` | Gap 1 | |
| Team Updates section (4 avatar rows) | Gap 2 — no team roster data | |
| Notes section (comment feed) | `comments` via A-430 pattern | Gap 3 |
| Notes count | `{comments.length} left for you` | |
| Note entries | each `CommentRow` as `.note button` | |
| Property Round heading | static `"Property Round"` | |
| Property Round count | `{doneCount} of {checklist.length} done` | |
| Task tile title | `item.title` | |
| Task tile sub | `location` (single global value) | Gap 4 — no per-tile sub |
| Task `data-done` | `item.done ? "true" : "false"` | |
| Task pill class | `item.done ? "task__pill" : "task__pill task__pill--pending"` | CSS drives visual |
| Task pill text | `item.done ? "Done" : "Complete"` | |
| Details link per tile | inert `<a>` with `preventDefault` | Gap 5 |
| CTA "Need Help" | `onNeedHelp` | |
| CTA "I'm Done" | `onImDone` | |
| Footer debug label | **DROP** | |

### Interactive behaviors

| Artifact behavior | Component handler |
|---|---|
| ← topstrip | `Link href="/staff"` as `.icon-circle` |
| ＋ topstrip → compose | Gap 6 — DROP ＋; inline compose below notes feed |
| `.task` click | `onToggleItem(item)` if `!stepsLocked && !taskDone` |
| `.task__link` click | `(e) => e.preventDefault()` — inert (Gap 5) |
| Compose send → `onPostNote` | inline form with `noteBody` / `compose__send` |
| Need Help | `onNeedHelp` |
| I'm Done | `onImDone` |
| Pause / Resume | Retained above shell |

---

## Step 4 — Gap List

### Gap 1 — Date line: "Thu Apr 30 · 6 stops"

Two components:
- **Date** — current day, not from task data. Runtime: `new Date()` formatted as `"EEE MMM D"` equivalent.
- **"6 stops"** — `checklist.length` (count of property-round tasks).

**Recommendation:** Add a `formatTodayDate()` file-level helper:
```ts
function formatTodayDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  });
}
```
Date line: `"{formatTodayDate()} · {checklist.length} stop{checklist.length !== 1 ? 's' : ''}"`. If checklist is empty, omit the stops suffix.

### Gap 2 — Team Updates section: no team roster data (MAJOR)

The artifact's Team Updates section requires:
- Staff identifiers (AL/LL/MP/CM initials + avatar gradients)
- Current activity text per staff member
- Task counts per staff member with alert/zero/normal severity
- Current user identification ("You" badge)

The component has none of this. `userId` and `displayName` are both unused (`_`-prefixed). No team data prop exists.

**Current component approach:** Shows `descNote` (task.description) as a prose text blob in a "TEAM UPDATES" panel — manager-authored context note masquerading as team info.

**Options:**

A. **Prose mapping (recommended):** Render Team Updates as a `.section` with `.team` container; instead of avatar rows, render `descNote` as a single prose block. If no description, show an empty/placeholder state. This preserves the existing data flow without inventing data, and the section structure is present for future live data wiring.

B. **Locked placeholder:** Render Team Updates section with header only and a "Coming soon" placeholder row — same treatment as the maintenance sections in D-430/S-430.

C. **Drop entirely:** Omit Team Updates from the layout.

**Recommendation: Option A.** Render the section with a `.team` white card but display `descNote` as a prose paragraph instead of avatar rows. This matches the existing component's intent (task.description as manager context) while fitting the artifact's section position, and avoids both data invention and dead-weight placeholders. The `.team__row` avatar pattern is preserved for when team data becomes available.

**Note on avatar tokens:** `--avatar-{cm|ll|al|mp}` are Phase 2b tokens in globals.css. They won't be used in Phase 3 since no avatar rows are rendered. They remain available for future team-data wiring.

### Gap 3 — Notes section: same A-430 pattern applies

The Da-430 artifact has a full `.section` Notes feed (same grammar as A-430: `.note button` with `.note__dot` / `.note__body` / `.note__chips` / `.note__time`). The existing component has a "NOTES" panel inside the old shell. In the new layout, Notes becomes a full-width `.section` above Property Round.

**Recommendation:** Implement the A-430 Notes pattern verbatim:
- `formatCommentTime()` file-level helper (same as ArrivalsCard.tsx)
- `.notes` feed (conditional on `comments.length > 0`)
- Each `CommentRow` as inert `.note button[type="button"]`
- Attachment chip when `comment.image_url !== null`; no @-mention chips (no data source)
- Inline compose below feed: `compose__row` + `compose__input` + `compose__foot` + `compose__send`

This replaces the old "NOTES" panel entirely.

### Gap 4 — Per-tile sub-labels have no data source

The artifact gives each tile a distinct sub-label:
- Restock Cart → "Supply Rm · See Layout"
- Dust Pictures → "40s Hall"
- Public Restrooms → "Lobby · Check Paper"
- etc.

`ExecutionChecklistItem` only has `{ id, title, done }` — no sub-label/location field. The component has one global `location` value applied uniformly to all tiles.

**Recommendation:** Apply `location` as the sub on all tiles (current behavior). Each tile shows the same location value below its title. The per-tile specificity is a future schema concern, not a Phase 3 blocker.

### Gap 5 — Details link: no drill-down in DailysCard

The artifact has `.task__link "Details ›"` per tile. DailysCard has no `ChecklistDrillDown`, no `resolveChecklist`, no `useState`. The current component has a non-interactive `<span>` for this.

**Recommendation:** Render as an inert `<a>` with `onClick={(e) => e.preventDefault()}` — matches the artifact's demo behavior (no navigation) and preserves the visual element. No `setShowChecklist` needed since there is no drill-down.

### Gap 6 — Topstrip ＋ / compose drawer

**Recommendation:** Drop ＋ (consistent with D-430/A-430/S-430). Inline compose lives at the bottom of the Notes section using `compose__send` class.

### Gap 7 — "Complete All" circle button: not in artifact

The current component has `dailys-card__complete-circle` (mark-all button). The Da-430 artifact has no equivalent. `allDone` derived value is also specific to this button.

**Recommendation:** Remove both from new JSX per "if artifact omits it, omit it" rule. `allDone` becomes unused — either omit it from the derived values section or `void` it.

### Gap 8 — No useState: no local state changes needed in new layout

DailysCard currently has zero `useState`. The new layout also needs none — the `.task` tiles use `item.done` directly from props (no local toggling state), `data-done` is set from `item.done`, and the CSS handles the visual state. The note form uses the existing `noteBody` controlled prop. No ChecklistDrillDown overlay is introduced.

This is the cleanest migration structurally — prop-to-DOM, no intermediary state.

### Component features not in artifact — retained

| Feature | Action |
|---|---|
| Pause/Resume toolbar | Retain above `.shell` inside `.page` column |
| `inlineError` | Keep as `.error` para above Property Round section |
| Notes compose | Retained via inline form in Notes section (Gap 3) |
| `location` sub-label | Retained on each tile (Gap 4) |
