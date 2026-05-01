# Phase 3 — D-430 Departures Card Mapping

Source files:
- Component: `app/staff/task/[id]/DeparturesCard.tsx`
- Artifact: `/Users/bryanstauder/Documents/Claude/Artifacts/dispatch-d-430/index.html`

---

## Step 1 — Data Binding Inventory (DeparturesCard.tsx)

### Function signature

```ts
export default function DeparturesCard({
  task,          userId,       displayName,
  checklist,     comments,     inlineError,   setInlineError,
  noteBody,      setNoteBody,  noteBusy,
  helpBusy,      doneBusy,
  pauseBusy,     resumeBusy,
  onToggleItem,  onNeedHelp,   onImDone,
  onPause,       onResume,     onPostNote,
}: DeparturesCardProps)
```

Full prop types (`DeparturesCardProps`):

| Prop | Type | Purpose |
|---|---|---|
| `task` | `TaskCard` | Full task record from Supabase |
| `userId` | `string \| null` | Auth user id; gates mutations |
| `displayName` | `string` | Assigned staff name (currently unused — `_displayName`) |
| `checklist` | `ExecutionChecklistItem[]` | DB-persisted checklist rows `{ id, title, done }` |
| `comments` | `CommentRow[]` | Posted notes/comments on this task |
| `inlineError` | `string \| null` | Error surface from parent |
| `setInlineError` | `(e: string \| null) => void` | Error setter |
| `noteBody` | `string` | Controlled value for note textarea |
| `setNoteBody` | `(v: string) => void` | Setter for note textarea |
| `noteBusy` | `boolean` | Mutation in-flight: note post |
| `helpBusy` | `boolean` | Mutation in-flight: Need Help |
| `doneBusy` | `boolean` | Mutation in-flight: I'm Done |
| `pauseBusy` | `boolean` | Mutation in-flight: Pause |
| `resumeBusy` | `boolean` | Mutation in-flight: Resume |
| `onToggleItem` | `(row: ExecutionChecklistItem) => void` | Checklist item toggle |
| `onNeedHelp` | `() => void` | Need Help CTA |
| `onImDone` | `() => void` | I'm Done CTA |
| `onPause` | `() => void` | Pause action |
| `onResume` | `() => void` | Resume action |
| `onPostNote` | `(e: FormEvent) => void` | Note form submit |

### Hook calls

| Hook | Returns | Purpose |
|---|---|---|
| `useState<DepartureStatus>` | `[departureStatus, setDepartureStatus]` | Room turnover status; initialised from `task.context.departure_status` |
| `useState<boolean>` | `[statusBusy, setStatusBusy]` | Mutation in-flight flag for status chip update |
| `useState<boolean>` | `[showChecklist, setShowChecklist]` | Drill-down overlay toggle |
| `useCallback` | `onSetDepartureStatus(next)` | Supabase mutation + task event for status change |

### Callbacks / event handlers

| Handler | Trigger | What it does |
|---|---|---|
| `onSetDepartureStatus(next)` | Status chip click | `supabase.tasks.update({ context: { ...task.context, departure_status: next } })` + `logTaskEvent("departure_status_changed", { from, to })` |
| `onToggleItem(row)` | Checklist brow click | Prop callback — parent handles Supabase update |
| `onNeedHelp()` | Need Help button | Prop callback |
| `onImDone()` | I'm Done button | Prop callback |
| `onPause()` | Pause link | Prop callback |
| `onResume()` | Resume link | Prop callback |
| `onPostNote(e)` | Note form submit | Prop callback |

### Data fields referenced in JSX

| Field path | Derived as | Used for |
|---|---|---|
| `task.id` | — | Supabase update key; logTaskEvent |
| `task.status` | `taskDone`, `inProgress`, `paused`, `stepsLocked` | Button disable states; toolbar content |
| `task.context.departure_status` | `departureStatus` initial value | Status chip active state |
| `task.context.outgoing_guest` | `outgoing: GuestRecord` | Outgoing column data |
| `task.context.incoming_guest` | `incoming: GuestRecord` | Incoming column data |
| `task.context.room_number` | inside `displayRoom()` | Room number (priority source) |
| `task.context` (spread) | — | Supabase context patch |
| `task.room_number` | inside `displayRoom()` + `resolveChecklist()` | Room number (fallback) |
| `task.title` | inside `roomFromTitle()` | Room number (last-resort fallback) |
| `task.description` | `descNote` | Setup row value |
| `task.location_label` | — | "STATUS" info row value |
| `task.due_time` | `dueTime` (formatted) | Due time stamp pill |
| `checklist[n].id` | — | React key; passed to `onToggleItem` |
| `checklist[n].title` | matched against canonical list | Checklist item label |
| `checklist[n].done` | CSS class toggle | Checklist item checked state |
| `comments.length` | — | Note count display |
| `noteBody` | — | Note textarea value |
| `inlineError` | — | Error paragraph |

### Side effects

- **Supabase write**: `tasks.update` on status chip click (context patch)
- **Task event**: `logTaskEvent("departure_status_changed", ...)` on status change
- No navigation side effects; back nav is a `Link` (declarative)

---

## Step 2 — Demo Data Inventory (D-430 artifact)

### Document structure (top to bottom)

1. **`.topstrip`** — `←` back button + `＋` add-note button
2. **`.greet`**
   - Chip: `"Departure"` (static bucket label)
   - Loc: `"Room 33"`
   - h1: `"Turn over 33 for 4 PM check-in"`
   - Date line: `"Created 10:15 AM by Courtney · Due 3:30 PM"`
3. **`.brief` (`.cols` dual-column)**
   - Outgoing: Guests `4`, Nights `3`, Clean `Standard`
   - Incoming: Party `Smith, 2`, Nights `2`, Notes `VIP — allergies`
4. **`.setstat`** (three rows)
   - Setup textarea: `"Foam pillows swapped per VIP request. Fridge stocked w/ sparkling water."`
   - Notes textarea: `"Linens delivered 1:30, two sets short — laundry restock by 2 PM."`
   - Status pills row: `Open` (active), `Sheets` (active), `Stripped`, `Done`
5. **`.section` — Checklist** — `.bucketcard` with 6 `.brow` items:
   - `Open / Strip` — done, "Done · 1:18 PM", bar filled
   - `Report / Doc` — done, "Done · 1:38 PM", bar filled
   - `Clean` — done, "Done · 1:54 PM", bar filled
   - `Restock` — pending, bar empty
   - `Prep` — pending, bar empty
   - `Close Out` — pending, bar empty
6. **`.section` — Per-room work** — two collapsible `.exrow`:
   - **DC (Deep Clean)**: icon `DC`, 7 items, initially open. Tiles (2-col grid): AC Unit/Lizzie Apr 15, Bedding/Angie Apr 24, Bed/Mark Mar 12, Walls/Lizzie Apr 02, Bathroom/Angie Apr 28, Shower-Sink/Lizzie Apr 22, Defrost Fridge/Mark Feb 18.
   - **MX (Maintenance)**: icon `MX`, 3 issues, initially closed. Issues: Bed·Stained/high/Open/2:14 PM 📎1, Sink·Loose/normal/In Prog/1:45 PM, Mirror·Scratched/low/Open/12:30 PM. "Log new issue" add button.
7. **`.cta`** — `Need Help` (secondary) + `I'm Done` (primary)
8. **`.foot`** — `"D-430 · Departures · Neon Teal"` (debug label)
9. **`.scrim` + `.compose` drawer** — "Log new issue" intake form with cascading selects (Location, Item, Type), severity pills (Low/Normal/High), photo attachment, notes textarea, "Log Issue" submit.

### Demo script behaviors

| Interaction | Effect |
|---|---|
| ＋ topstrip click | Opens `.compose` drawer (scrim + slide-up animation) |
| ← topstrip click | No-op in demo (no navigation) |
| `.brow` click | Toggles `data-checked`; updates `.brow__meta` to "Done · {time}" or reverts; updates `#checklistCount` |
| `.brow__details` click | `preventDefault` + `stopPropagation` (no navigation) |
| DC `.exrow__head` click | Toggles `data-open` on exrow (CSS grid-template-rows expand) |
| MX `.exrow__head` click | Same |
| `.dctile` click | Toggles `data-done`; applies line-through + opacity |
| `#addIssue` click | Opens compose drawer |
| `#composeClose` / scrim click | Closes compose drawer |
| Severity pill click | Deactivates others, sets `data-active` on clicked |
| Photo button click | Toggles `data-attached` |
| Compose submit | Closes drawer |

---

## Step 3 — Mapping Table

### Data elements

| Artifact element | DeparturesCard source | Notes |
|---|---|---|
| Chip `"Departure"` | static literal | |
| Loc `"Room 33"` | `room` = `displayRoom(task)` | |
| h1 headline | `task.title` | |
| Date line: created time | `task.created_at` formatted to h:mm AM/PM | Not currently formatted by component — new helper needed |
| Date line: author | `displayAssignee(task)` (`task.staff?.name` or `task.assignee_name`) | |
| Date line: due time | `dueTime` = `formatDueTime(task.due_time)` | Already formatted |
| Outgoing col heading | static `"Outgoing"` | |
| Outgoing Guests | `outgoing.guests` (`task.context.outgoing_guest.guests`) | |
| Outgoing Nights | `outgoing.nights` | |
| Outgoing Clean | `outgoing.clean_type` | |
| Incoming col heading | static `"Incoming"` | |
| Incoming Party | `incoming.party` | |
| Incoming Nights | `incoming.nights` | |
| Incoming Notes | `incoming.notes` | |
| Setup textarea value | `descNote` = `task.description?.trim()` | Read-only in new design (display-only, no edit) |
| Notes textarea value | **GAP** — see Step 4, gap #2 | |
| Status pills (4) | `DEPARTURE_STATUS_CHIPS` mapped with `onSetDepartureStatus` | |
| Status pill active | `departureStatus === chip.value` | |
| Checklist count | derived: doneCount + "/" + total from `displayChecklist` | |
| Checklist items (6) | `displayChecklist` from `buildDisplayChecklist(checklist)` | Order/count gap — see Step 4, gap #7 |
| Brow `data-checked` | `item.dbItem?.done ?? false` | |
| Brow meta "Done · {time}" | **GAP** — no `done_at` on `ExecutionChecklistItem` | |
| Brow meta "Pending" | static if `!item.dbItem?.done` | |
| Bar fill right=0 | inline style `{ right: item.dbItem?.done ? '0' : '100%' }` | |
| DC exrow section | **GAP** — no data source | |
| MX exrow section | **GAP** — no data source | |
| "Log new issue" compose drawer | **GAP** — no handler | |
| CTA "Need Help" | `onNeedHelp` | |
| CTA "I'm Done" | `onImDone` (disabled if `doneBusy || taskDone || paused`) | |
| Footer debug label | **DROP** — not needed in production | |

### Interactive behaviors

| Artifact behavior | Component handler |
|---|---|
| ← topstrip | `Link href="/staff"` — render as `.icon-circle` |
| ＋ topstrip | **GAP** — see Step 4, gap #5 |
| Status pill click | `onSetDepartureStatus(chip.value)` |
| Checklist brow click (row body) | `onToggleItem(item.dbItem)` if `item.dbItem` exists |
| "Details ›" link per brow | `setShowChecklist(true)` opens `ChecklistDrillDown` overlay — see gap #8 |
| DC exrow expand/collapse | **GAP** |
| MX exrow expand/collapse | **GAP** |
| "Log new issue" button/drawer | **GAP** |
| Need Help button | `onNeedHelp` |
| I'm Done button | `onImDone` |
| Pause/Resume (toolbar) | `onPause` / `onResume` — **present in component, absent from artifact** |

---

## Step 4 — Gaps

### Gaps: artifact element has no component data source

**Gap 1 — Date line: created timestamp formatting**
The artifact date line includes the created time in h:mm AM/PM format ("Created 10:15 AM by Courtney"). `task.created_at` is an ISO string; `formatDueTime()` formats `due_time` but not `created_at`. A one-liner `formatCreatedAt(task.created_at)` is needed, or we can abbreviate the date line to just the due time (already formatted as `dueTime`).

**Gap 2 — "Notes" textarea in `.setstat`**
The artifact's `.setstat` has two textareas: Setup (→ `task.description`) and Notes (a free-text, editable, card-level note field). The component has no card-level editable notes field distinct from the `comments[]` feed. The `comments[]` + `onPostNote` flow is the note ledger, not a card-level context field. Options:
- Map the artifact Notes textarea to the `noteBody`/`onPostNote` compose flow inline
- Drop it — keep only Setup (read-only display of `task.description`)
- Add a `task.context.notes` field (requires schema discussion)

**Gap 3 — Deep Clean (DC) section**
The artifact's DC exrow shows 7 room-specific deep-clean items with last-done dates. The component has zero deep clean data — the existing code has a placeholder tile with a `+` glyph. This entire section has no data source and is out of beta scope per CLAUDE.md ("deep-clean table" is on the cut list). Recommend: render DC exrow as a collapsed, locked placeholder — no interactive state, greyed label.

**Gap 4 — Maintenance (MX) section**
The artifact's MX exrow shows live maintenance issues with severity, status, photo indicators, and a "Log new issue" compose drawer. The component has a placeholder tile only. No maintenance CRUD exists in the staff card execution path. Out of beta scope. Recommend: same treatment as DC — collapsed locked placeholder.

**Gap 5 — Topstrip ＋ button / compose drawer**
The artifact's ＋ opens a "Log new issue" compose drawer (maintenance intake). The component has no equivalent. In the component, note-posting is via the inline NOTES tile. Options:
- Wire ＋ to `setShowChecklist(true)` (repurpose as checklist shortcut)
- Wire ＋ to focus the note textarea (scroll-into-view)
- Drop ＋ for now (render the button disabled or as a no-op)

**Gap 6 — Checklist item timestamps (brow meta)**
The artifact shows "Done · 1:18 PM" on completed rows. `ExecutionChecklistItem` has `{ id, title, done }` — no `done_at` field. The DB table `task_checklist_items` likely has `updated_at` but it's not in the select or the type. For Phase 3: render "Done" without timestamp if `done_at` is unavailable, or add `updated_at` to the select/type (schema change discussion needed). Recommend showing just "Done" for now.

**Gap 7 — Checklist: item count and order mismatch**
`DEPARTURES_CANONICAL_CHECKLIST` has 7 items in this order: `Open/Strip, Bed, Report/Doc, Prep, Clean, Close Out, Restock`.
Artifact has 6 items in this order: `Open/Strip, Report/Doc, Clean, Restock, Prep, Close Out` (missing "Bed").
Two differences: (a) canonical has "Bed" at position 2, artifact does not; (b) order differs. Recommend using the canonical list as-is (7 items, DB-persisted order) for data fidelity, matching label text to artifact display names. The artifact is a design mockup, not a schema spec.

**Gap 8 — "Details ›" link per checklist brow**
The artifact has a "Details ›" link on every brow row. The component renders one shared `ChecklistDrillDown` overlay triggered by `setShowChecklist(true)`. In the new JSX, clicking "Details ›" on any brow will call `setShowChecklist(true)` — the drill-down shows the full task tree regardless of which row was clicked. This is a UX simplification vs. the artifact (which doesn't implement navigation either — `preventDefault` in the demo). Acceptable for beta.

### Gaps: component features not present in artifact

| Component feature | Artifact equivalent | Recommendation |
|---|---|---|
| Pause/Resume toolbar buttons | Not present | Retain in toolbar above the `.shell` — these are critical task-state controls. Keep existing HTML structure for toolbar, wrap `.shell` content in the new artifact layout. |
| `task.location_label` STATUS row | Not present in artifact | Drop the STATUS info row from setstat (artifact doesn't have it). `location_label` has no home in D-430 layout. |
| `displayName` prop | Not used | Already `_displayName` in component — no change needed. |
| `inlineError` | No artifact equivalent | Keep — render as `.error` para inside the `.shell` wrapper. |
| `ChecklistDrillDown` overlay | No equivalent | Keep — mount outside `.preview-d-430` wrapper at top of return so it overlays correctly. |
