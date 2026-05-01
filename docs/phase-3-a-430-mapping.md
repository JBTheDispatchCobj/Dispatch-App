# Phase 3 — A-430 Arrivals Card Mapping

Source files:
- Component: `app/staff/task/[id]/ArrivalsCard.tsx`
- Artifact: `/Users/bryanstauder/Documents/Claude/Artifacts/dispatch-a-430/index.html`

---

## Step 1 — Data Binding Inventory (ArrivalsCard.tsx)

### Function signature

```ts
export default function ArrivalsCard({
  task,         userId: _userId,      displayName: _displayName,
  checklist,    comments,             inlineError,
  noteBody,     setNoteBody,          noteBusy,
  helpBusy,     doneBusy,
  pauseBusy,    resumeBusy,
  onToggleItem, onNeedHelp,           onImDone,
  onPause,      onResume,             onPostNote,
}: ArrivalsCardProps)
```

Full prop types:

| Prop | Type | Purpose |
|---|---|---|
| `task` | `TaskCard` | Full task record |
| `userId` | `string \| null` | Auth user id — **unused** (`_userId`), no Supabase writes in component |
| `displayName` | `string` | Staff display name — **unused** (`_displayName`) |
| `checklist` | `ExecutionChecklistItem[]` | DB checklist rows `{ id, title, done }` |
| `comments` | `CommentRow[]` | Posted notes on this task |
| `inlineError` | `string \| null` | Error from parent |
| `setInlineError` | `(e: string \| null) => void` | — (in type but not destructured; parent manages) |
| `noteBody` | `string` | Controlled note textarea |
| `setNoteBody` | `(v: string) => void` | Note textarea setter |
| `noteBusy` | `boolean` | Note post in-flight |
| `helpBusy` | `boolean` | Need Help in-flight |
| `doneBusy` | `boolean` | I'm Done in-flight |
| `pauseBusy` | `boolean` | Pause in-flight |
| `resumeBusy` | `boolean` | Resume in-flight |
| `onToggleItem` | `(row: ExecutionChecklistItem) => void` | Checklist toggle |
| `onNeedHelp` | `() => void` | Need Help CTA |
| `onImDone` | `() => void` | I'm Done CTA |
| `onPause` | `() => void` | Pause |
| `onResume` | `() => void` | Resume |
| `onPostNote` | `(e: FormEvent) => void` | Note form submit |

### Hook calls

| Hook | Returns | Purpose |
|---|---|---|
| `useState<boolean>` | `[showChecklist, setShowChecklist]` | Drill-down overlay toggle |

**No `useCallback`, no `useEffect`, no Supabase writes.** This is the simplest card component — fully delegated to parent for all mutations.

### Callbacks / event handlers

| Handler | Trigger | What it does |
|---|---|---|
| `setShowChecklist(true)` | View › button | Opens ChecklistDrillDown overlay |
| `onToggleItem(item.dbItem)` | Checklist item click | Parent handles Supabase update |
| `setNoteBody(e.target.value)` | Note textarea change | Local controlled input |
| `onPostNote(e)` | Note form submit | Parent posts comment |
| `onNeedHelp()` | Need Help button | Parent callback |
| `onImDone()` | I'm Done button | Parent callback |
| `onPause()` | Pause link | Parent callback |
| `onResume()` | Resume link | Parent callback |

### Data fields referenced in JSX

| Field path | Derived as | Used for |
|---|---|---|
| `task.status` | `taskDone`, `inProgress`, `paused`, `stepsLocked` | Button disables, toolbar |
| `task.context.room_number` | inside `displayRoom()` | Room number (priority) |
| `task.room_number` | inside `displayRoom()` | Room number (fallback) |
| `task.title` | inside `roomFromTitle()` | Room number (last resort) |
| `task.description` | `descNote` | SETUP briefrow (conditional) |
| `task.due_time` | `dueTime` | Due time stamp in hero |
| `task.context.incoming_guest.name` | `guestDisplay` | Guest briefrow |
| `task.context.incoming_guest.party_size` | `guestDisplay` | Guest briefrow suffix |
| `task.context.incoming_guest.nights` | `nightsDisplay` | Nights briefrow |
| `task.context.incoming_guest.special_requests` | `requestsDisplay` | Requests briefrow |
| `task.context.incoming_guest.checkin_time` | `guest.checkin_time` | Parsed but not currently rendered |
| `checklist[n].id`, `.title`, `.done` | `displayChecklist` | Checklist brows |
| `comments.length` | — | Note count |
| `noteBody` | — | Note textarea value |
| `noteBusy` | — | Note submit disable |
| `inlineError` | — | Error para |

### Side effects

None. No Supabase writes, no `logTaskEvent`, no navigation side effects. All mutations delegated to parent.

---

## Step 2 — Demo Data Inventory (A-430 artifact)

### Document structure (top to bottom)

1. **`.topstrip`** — ← back button + ＋ add-note button (id="addNote", opens compose)
2. **`.greet`**
   - Chip: `"Arrival"`
   - Loc: `"Room 23"`
   - h1: `"Prepare for Katie Wilkins"`
   - Date line: `"Check-in 4 PM · 3 nights · King Suite"`
3. **`.brief`** — 4 `.briefrow` items:
   - Guest: `"Katie Wilkins · King Suite"`
   - Nights: `"3"`
   - Extras: `"Crib · Welcome basket"`
   - Requests: `"Quiet floor · Extra pillows"`
4. **`.section` — Notes** — header "Notes" + count "3 left for you"; `.notes` feed with 3 entries:
   - Courtney, "left a note:", `"Katie's a return guest — quiet floor preference…"`, `@ Angie` chip, `9:14 AM`
   - Jen, "left a note:", `"Crib delivered this morning — placement against west wall…"`, `📎 1` chip, `8:32 AM`
   - Lizzie, "left a note:", `"Late check-in confirmed — keys at concierge…"`, `📎 1` + `@ Mark` chips, `"Yesterday"`
5. **`.section` — Checklist** — header "Checklist" + count "0 of 6 done"; 6 `.brow` items (all pending):
   - Open / Strip, Report / Doc, Clean, Restock, Prep, Close Out
6. **`.cta`** — `"Need Help"` (secondary) + `"I'm Done"` (primary)
7. **`.foot`** — `"A-430 · Arrivals · Pop Orange"` (debug label)
8. **`.scrim` + `.compose` drawer** (slide-up note compose):
   - Header label: `"New note · Arrival 23"`
   - Avatar row: `"CM"` avatar with `▾` dropdown chevron
   - Input: `compose__input` single-line, placeholder "Leave a note for the team…"
   - Chips area: `compose__chips` (empty, populated by @-mention script)
   - Footer: 🖼 icon button, @ mention button (id="mentionBtn"), `compose__send` "Send" button (initially disabled)

### Demo script behaviors

| Interaction | Effect |
|---|---|
| ＋ topstrip click | Opens `.compose` drawer (scrim + slide-up animation) |
| ← topstrip | No-op in demo (no navigation) |
| `.brow` click (not on Details) | Toggles `data-checked`; meta → "Done · {time}" or "Pending"; updates count |
| `.brow__details` click | `preventDefault` + `stopPropagation` |
| `compose__input` typing | Enables/disables `compose__send` based on non-empty |
| @ button click | Appends "@ {name}" chip from `['Lizzie','Angie','Mark','Jen']` round-robin |
| 🖼 button click | No-op in demo |
| scrim click / × / Escape | Closes compose drawer, clears input and chips |
| Send button click | Closes compose drawer |

---

## Step 3 — Mapping Table

### Data elements

| Artifact element | Component source | Notes |
|---|---|---|
| Chip `"Arrival"` | static literal | |
| Loc `"Room 23"` | `room` = `displayRoom(task)` | |
| h1 headline | `task.title` | |
| Date line | composite — see Gap 1 | |
| Brief Guest `"Katie Wilkins · King Suite"` | `guestDisplay` (`guest.name` + `party_size`) | room type has no data source — see Gap 1 |
| Brief Nights `"3"` | `nightsDisplay` (`guest.nights`) | |
| Brief Extras `"Crib · Welcome basket"` | **Gap 2** — no `extras` field | |
| Brief Requests | `requestsDisplay` (`guest.special_requests`) | |
| Notes section heading | static `"Notes"` | |
| Notes count `"3 left for you"` | `"{comments.length} left for you"` | |
| Note `.note__name` | `comment.author_display_name` | |
| Note `.note__action` | static `" left a note: "` | all artifact notes use same action |
| Note `.note__quote` | `comment.body` (wrap in `"`) | |
| Note `.note__time` | `comment.created_at` formatted to time or "Yesterday" | needs relative time helper — see Gap 3 |
| Note attachment chip `📎 1` | `comment.image_url !== null` → render chip | |
| Note `@ mention` chip | **Gap 4** — no mention data in `CommentRow` | |
| Note `.note__dot` | static decorative element | always rendered |
| Checklist count | `{doneCount} of {displayChecklist.length} done` | |
| Checklist brow items (6) | `displayChecklist` from `ARRIVALS_CANONICAL_CHECKLIST` | |
| Brow `data-checked` | `item.dbItem?.done ? "true" : "false"` | |
| Brow meta | `item.dbItem?.done ? "Done" : "Pending"` | no timestamp (Gap 5) |
| Bar fill | CSS `data-checked` selector — no inline style needed | |
| CTA "Need Help" | `onNeedHelp` | |
| CTA "I'm Done" | `onImDone` (disabled if `doneBusy \|\| taskDone \|\| paused`) | |
| Footer debug label | **DROP** | |

### Interactive behaviors

| Artifact behavior | Component handler |
|---|---|
| ← topstrip | `Link href="/staff"` as `.icon-circle` |
| ＋ topstrip → compose | **Gap 6** — see options below |
| `.brow` click | `onToggleItem(item.dbItem)` if `item.dbItem && !stepsLocked && !taskDone` |
| `.brow__details` | `setShowChecklist(true)` |
| Note row click | no handler (display-only in component) |
| Compose send → `onPostNote` | inline form with `noteBody` / `onPostNote` — replaces compose drawer |
| Need Help | `onNeedHelp` |
| I'm Done | `onImDone` |
| Pause / Resume (above shell) | `onPause` / `onResume` — retained, not in artifact |

---

## Step 4 — Gap List

### Gap 1 — Date line and room type

Artifact: `"Check-in 4 PM · 3 nights · King Suite"`
Fields available:
- `guest.checkin_time` — parsed from `task.context.incoming_guest.checkin_time` (string or null)
- `nightsDisplay` — already formatted
- Room/suite type: **no field** in `IncomingGuest` or anywhere in `task.context`

`dueTime` = `formatDueTime(task.due_time)` is available as a proxy for check-in time if `guest.checkin_time` is absent.

**Recommendation:** Build date line from available fields; omit room type.
```
Check-in {checkin_time or dueTime} · {nights} nights
```
If neither check-in time nor due_time exists, omit date line or show a single-space to preserve height.

### Gap 2 — Extras briefrow

Artifact: `"Extras: Crib · Welcome basket"`. No `extras` field exists in `IncomingGuest` (`{ name, checkin_time, nights, party_size, special_requests }`).

**Options:**
a. Omit the Extras briefrow entirely — 3 briefrows instead of 4
b. Render `"—"` as a static placeholder (shows the slot exists, data just unpopulated)
c. Map `descNote` (task.description) to Extras — but that conflicts with its role as Setup info

**Recommendation:** Omit Extras row. Real data has no source for it; rendering "—" is misleading (implies it's a data fetch that returned empty). The existing component doesn't have an Extras field either. Keep Guest, Nights, Requests (3 rows) + optional SETUP if descNote exists.

### Gap 3 — Note timestamp formatting

Artifact shows `"9:14 AM"` and `"Yesterday"` as time labels. `comment.created_at` is an ISO timestamp. The component currently has no timestamp formatter for comments (only `formatDueTime` for `task.due_time`).

**Recommendation:** Write a minimal `formatCommentTime(iso)` helper in the component (no prop-type changes): if today → `"h:mm AM/PM"`; if yesterday → `"Yesterday"`; otherwise → `"M/D"`. This is a non-invasive local helper, identical pattern to `formatDueTime`.

### Gap 4 — @-mention chips in displayed notes

`CommentRow` has no mention/tagged-user field. The artifact's @-mention chips (e.g. `@ Angie`) are demo data with no backing data source.

**Recommendation:** Render only the attachment chip when `comment.image_url !== null` (`📎 1`); skip @-mention chips entirely. No data, no chip. The chip slot is simply absent for real notes.

### Gap 5 — Checklist brow timestamp

Same as D-430 gap 6. `ExecutionChecklistItem` has no `done_at`. Show `"Done"` without timestamp.

**Recommendation:** Match D-430 pattern — `item.dbItem?.done ? "Done" : "Pending"`.

### Gap 6 — Topstrip ＋ button and note compose flow

**Structural difference from D-430:** A-430 moves notes to a dedicated **top-level section** (not a tile), and the compose mechanism is the slide-up drawer opened by ＋. The existing component puts the note form inside a tile. In the new layout, there is no tile — Notes is its own `.section`.

Options for ＋:
a. **Drop ＋** (same as D-430). Inline compose form lives at the bottom of the Notes section, below the comment feed.
b. **Drop ＋** and show the inline compose form only below the notes feed — no visible trigger needed (the textarea is the compose UI).

**Recommendation:** Drop ＋ topstrip button (consistent with D-430 gap 5 decision). Place the inline note form (`noteBody` / `onPostNote`) at the bottom of the `.section.notes` block, below the `.notes` feed. The `compose__send` class (which IS in the A-430 scope, unlike D-430 which had `compose__submit`) should be used for the Send/Post button per Bryan's established pattern.

Note on compose drawer: the drawer HTML (`.scrim` + `.aside.compose`) is **not rendered** in the React component — it was demo-only in the artifact. The inline `noteBody`/`onPostNote` replaces it.

### Gap 7 — Note section is display-only in current component

The artifact's `.note` entries are `<button>` elements — interactive in the demo (click does nothing but has hover state via CSS). In the React component, `comments` are only count-displayed; individual comments are not rendered at all. The new layout renders each `CommentRow` as a `.note` button — **display-only** (no `onClick` handler needed since the demo doesn't navigate anywhere either).

**Recommendation:** Render each `comment` as a `.note button[type="button"]` with no `onClick` (inert). CSS hover state from the scoped CSS will still apply, giving visual affordance consistent with the artifact.

### Component features not in artifact — retained

| Feature | Action |
|---|---|
| Pause/Resume toolbar | Retain above `.shell` inside `.page` column (same as D-430) |
| `inlineError` | Keep as `.error` para — render above Notes section |
| `ChecklistDrillDown` overlay | Mount outside `.preview-a-430` wrapper at top of return |
| SETUP briefrow (descNote) | Keep as optional 5th briefrow after Requests — real operational data |
| `setInlineError` | Not destructured by component; parent manages |
