# Phase 3 — SOD-430 Start of Day Card Mapping

Source files:
- Component: `app/staff/task/[id]/StartOfDayCard.tsx` (current main HEAD)
- Artifact: `/Users/bryanstauder/Documents/Claude/Artifacts/dispatch-sod-pop-palette-explore/index.html`
- Preview: `/dev/artifacts/sod-430`
- WIP stash reference: stash exists but is SUPERSEDED by this mapping

---

## Step 1 — Data Binding Inventory (StartOfDayCard.tsx HEAD)

### Function signature

```ts
export default function StartOfDayCard({
  task, userId: _userId, displayName,
  checklist, comments, inlineError,
  noteBody, setNoteBody, noteBusy,
  helpBusy, doneBusy, pauseBusy, resumeBusy,
  onToggleItem, onNeedHelp, onImDone, onPause, onResume, onPostNote,
}: StartOfDayCardProps)
```

`userId: _userId` — already unused/prefixed. `setInlineError` is in the type but not destructured.

### Hook calls

**None.** Zero `useState`, `useEffect`, `useCallback`. Like DailysCard and EODCard, this is a pure prop-reactive component.

### Context parsers

`parseSodBrief(task.context)` reads `task.context.sod_brief`:

```ts
type SodBrief = {
  date_label: string | null;    // date label for brief header
  date_accent: string | null;   // accent text accompanying date
  status: string | null;        // daily status string (e.g. "3 arr · 2 dep · 4 stays")
  weather: string | null;       // weather text
  events: string | null;        // events text
  notes: string | null;         // brief notes / operational context
};
```

Other helpers:
- `formatSodDate(iso)` — formats `task.due_date` to UPPERCASE "WED APR 30"
- `hasBriefContent(brief)` — true if any brief field is populated
- `checklistInteractionDisabled(status)` — same as all other cards

### Derived values

| Variable | Source | Used for |
|---|---|---|
| `brief` | `parseSodBrief(task.context)` | Daily brief cells |
| `taskDone`, `inProgress`, `paused`, `stepsLocked` | `task.status` | Button disables |
| `dateStr` | `formatSodDate(task.due_date)` | Old hero stamp — unused in new JSX |
| `heroMeta` | `dateStr + displayName.toUpperCase()` | Old hero stamp — unused in new JSX |
| `updatesText` | `task.description?.trim()` | UPDATES panel prose |
| `showBrief` | `hasBriefContent(brief)` | Old brief panel visibility gate |

`heroMeta` and `dateStr` have **no equivalent** in the E-430 artifact and become unused in the new JSX.

### Data fields currently referenced in JSX

| Field | Derived as | Used for |
|---|---|---|
| `task.context.sod_brief.{weather, events, status, notes, date_label, date_accent}` | `brief` | Old brief panel (key-value list) |
| `task.status` | `taskDone`, `inProgress`, `paused`, `stepsLocked` | Button disables |
| `task.due_date` | `dateStr` | Old hero stamp meta |
| `task.description` | `updatesText` | UPDATES panel prose |
| `displayName` | `heroMeta` | Old hero stamp |
| `checklist[n].id`, `.title`, `.done` | — | Task tile grid |
| `comments.length` | — | Note count |
| `noteBody`, `noteBusy`, `inlineError` | — | Note form / error |

### Callbacks / event handlers

All prop callbacks — no local Supabase writes, no local state. Same as DailysCard/EODCard.

---

## Step 2 — Demo Data Inventory (SOD-430 artifact)

### Document structure (top to bottom)

1. **`.topstrip`** — ← back + ＋ add-note (opens compose)
2. **`.greet`**
   - Chip: `"Start of Day"`
   - Loc: `"Tue Apr 30"` ← **date in loc slot, not a room**
   - h1: `"Hi, Courtney"` (40px font-size, personalised)
   - Date line: `"1st day of spring"` (system-set rotating phrase)
3. **`.brief`** — "Daily Brief" card:
   - `.brief__head`: `"Daily Brief"` label (no secondary date label)
   - `.brief__top`: `"High turnover today — 5 check-ins later."` (admin-set prose headline)
   - `.brief__grid` (2×2):
     - Weather: `"High 64° / Low 41°"` + `"Clear · 8 mph SW"`
     - Events: `"Farmer's Market"` + `"Main St · 9 – 1"` + `"See all events ›"` link
     - Status: `3 arr · 2 dep · 4 stays` (inline `<em>` + `.sep` pattern)
     - Team: `"3 on shift ›"` link + `"Angie · Lizzie · Mark"`
4. **`.updates`** panel:
   - `.updates__head`: label `"Updates"` + from-label `"Since your Mon shift"`
   - `.updates__body` → `.updates__text`: admin-set prose block
5. **`.section` — Notes** — feed of 3 `.note button` entries (Jen × 3, with chips)
6. **`.section` — Today's Tasks** — header "Today's Tasks · 6 to start"; `.tasks` 2-col grid with 6 `.task` button tiles (same class pattern as Da-430)
7. **`.cta`** — `"Need Help"` + **`"Start Shift"`** (not "I'm Done")
8. **`.foot`** — `"SOD-430 · Start of Day · Neon Yellow"` (debug)
9. **`.scrim` + `.compose` aside** — compose__input + compose__send (no scripts in this artifact)

---

## Step 3 — Mapping Table

### Data elements

| Artifact element | Component source | Notes |
|---|---|---|
| Chip `"Start of Day"` | static literal | |
| Loc `"Tue Apr 30"` | Gap 1 — date from task.due_date | mixed-case format needed |
| h1 `"Hi, Courtney"` | `displayName.split(" ")[0]` → "Hi, {firstName}." | |
| Date line `"1st day of spring"` | Gap 2 — locked placeholder + TODO | system-set rotating phrase |
| `.brief__head` "Daily Brief" | static | |
| `.brief__top` prose headline | Gap 3 — **Bryan's call** | see options below |
| Weather cell | `brief.weather` | plain text in cell__value |
| Events cell | `brief.events` | plain text in cell__value |
| Status cell | `brief.status` | plain text — NOT the structured em/sep HTML |
| Team cell | Gap 4 — locked placeholder | no staff-on-shift data |
| `.updates__head` label `"Updates"` | static | |
| `.updates__from` `"Since your Mon shift"` | Gap 5 — omit or static | no shift-reference field |
| `.updates__body` prose | `updatesText` = `task.description` | existing mapping |
| Notes section | `comments` via A-430 pattern | Gap 6 (compose) |
| Notes count | `{comments.length} left for you` | |
| Today's Tasks section | `checklist` via Da-430 pattern | |
| Task tile title | `item.title` | |
| Task tile sub | Gap 7 — no per-item sub | |
| Task `data-done` | `item.done ? "true" : "false"` | CSS drives visual |
| Task pill / done | `item.done ? "Done" : "Complete"` | Da-430 pattern |
| CTA "Need Help" | `onNeedHelp` | |
| CTA "Start Shift" | `onImDone` — label change only | |
| Footer debug label | **DROP** | |

### Interactive behaviors

| Artifact behavior | Component handler |
|---|---|
| ← topstrip | `Link href="/staff"` as `.icon-circle` |
| ＋ topstrip | Gap 6 — DROP ＋; inline compose below notes |
| `.task` click | `onToggleItem(item)` if `!stepsLocked && !taskDone` |
| `.task__link` | inert `<span aria-hidden>` |
| Compose send | `onPostNote` / `compose__send` |
| Need Help | `onNeedHelp` |
| Start Shift | `onImDone` (label change) |
| Pause / Resume | Retained above shell |

---

## Step 4 — Gap List

### Gap 1 — Greet loc: "Tue Apr 30" (date, not room)

The artifact puts today's date in the loc slot. The component already has `formatSodDate(task.due_date)` producing UPPERCASE "WED APR 30". For the greet loc we need mixed-case "Tue Apr 30".

**Recommendation:** Add a `formatSodDateShort(iso)` file-level helper that formats to mixed-case without `.toUpperCase()`:
```ts
function formatSodDateShort(iso: string | null): string {
  if (!iso) return formatTodayDate(); // fallback to today
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return formatTodayDate();
  return d.toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  });
}
```

Use `task.due_date` as input (semantically correct — SOD tasks are shift-date-specific) with today's date as fallback. Keep the existing `formatSodDate()` helper in the file since it's in the codebase; just add the new short version alongside it.

### Gap 2 — Greet date line: "1st day of spring"

System/admin-set rotating SOD date-context phrase. No schema field. Same treatment as E-430's "You crushed it, {firstName}." — locked placeholder with TODO comment.

**Recommendation:** Render artifact example text `"1st day of spring"` as a locked placeholder:
```tsx
{/* TODO: replace with system-set rotating SOD date-context phrase
    when schema adds it. Currently locked to artifact example. */}
<div className="greet__date">1st day of spring</div>
```

### Gap 3 — .brief__top prose headline (Bryan's call required)

The `.brief__top` is a full-width admin-set prose headline above the 2×2 grid: "High turnover today — 5 check-ins later." No current schema field maps cleanly to this.

**Available fields and their current usages:**
- `brief.status` — currently shown as the Status cell text; would be used twice if also used as `brief__top`
- `brief.notes` — a "brief notes" string; semantically could serve as a daily headline  
- `task.description` — currently used for `.updates` prose; could instead serve as `brief__top`
- `brief.date_accent` — a brief header accent label; too short to serve as a headline

**Three options — Bryan's call:**

**A (recommended):** Use `brief.notes` for `.brief__top` headline. Rationale: `notes` in `SodBrief` is the most "summary-like" field and is not currently wired to any specific UI slot. If `brief.notes` is null, omit `.brief__top` entirely. `task.description` continues to map to the `.updates` prose body.

**B:** Use `task.description` for `.brief__top` headline, and omit the `.updates` body prose (or use `brief.notes` for updates instead). This re-maps `task.description` to a more prominent position.

**C:** Locked placeholder for `.brief__top`. Render a faded placeholder card section when no field is available. The `.brief` card only renders when `hasBriefContent(brief)` is true — when it does render, `brief__top` shows a static placeholder.

### Gap 4 — Team cell: no staff-on-shift data

The Team cell shows "3 on shift ›" and names. No staff roster props. Same situation as Team Updates in Da-430/E-430.

**Recommendation:** Locked placeholder for the Team cell — display `"—"` as the cell value with a "Coming soon" sub. The other three cells (Weather, Events, Status) render normally from `brief.*` fields.

```tsx
<div className="cell cell--br">
  <div className="cell__label">Team</div>
  <div className="cell__value" style={{ opacity: 0.55 }}>—</div>
  <div className="cell__sub">Coming soon</div>
</div>
```

Note: this uses two inline style properties. Alternative: just show `"—"` without opacity if inline styles are to be avoided. Either is acceptable given the cell is display-only.

### Gap 5 — .updates from-label: "Since your Mon shift"

The "Since your Mon shift" from-label indicates when updates date from. No component field for previous-shift date reference.

**Recommendation:** Omit the from-label entirely. The `.updates__head` renders only the `"Updates"` label, no from-label. The `updates__from` span is dropped. The prose body (`updatesText`) renders normally.

### Gap 6 — Topstrip ＋ / compose drawer / note compose placement

Per established pattern: drop ＋. The artifact has a compose drawer (compose__input + compose__send, no scripts). Inline compose form at the bottom of the Notes section.

`formatCommentTime()` is needed as a file-level helper (same as A-430/Da-430/E-430).

### Gap 7 — Today's Tasks tile sub-label

The artifact's task tiles have `.task__sub` sub-labels ("Laundry Rm · New Cleaner", "Supply Rm", etc.). `ExecutionChecklistItem` has only `{ id, title, done }` — no per-item sub.

**Recommendation:** Omit `.task__sub` entirely or apply `task.location_label` as a global sub (the component parses no per-task location for SOD). Actually, SOD doesn't parse a location at all (no `parseDailyLocation` helper unlike DailysCard). For clean output: simply omit the sub div. No data exists for it.

### Gap 8 — heroMeta / dateStr / showBrief become unused

`heroMeta`, `dateStr`, `showBrief` are derived from the old hero strip and old brief panel. All three are unused in the new JSX.

**Recommendation:** Remove from derived values in the new JSX (they're local computations, not props). Keep the helper functions (`formatSodDate`, `hasBriefContent`) in the file since they're part of the established codebase.

### Gap 9 — The whole .brief card: render when?

The existing component gates the brief panel on `showBrief = hasBriefContent(brief)`. The new `.brief` card in the artifact is always present (it's a permanent structural element, not conditionally rendered).

**Recommendation:** Always render the `.brief` card, regardless of whether brief fields are populated. Each cell shows its data if available, or a minimal fallback. The `.brief__top` follows Gap 3 decision. This matches the artifact's structure where the card is always visible.

### Gap 10 — Status cell: structured vs plain text

The artifact Status cell uses structured HTML with inline `<em>` and `.sep` spans: `3 <em>arr</em>·2 <em>dep</em>·4 <em>stays</em>`. The component stores `brief.status` as a plain string.

**Recommendation:** Render `brief.status` as plain text in `.cell__value`. If the manager entered "3 arr · 2 dep · 4 stays" it renders as-is; the `<em>` styling would be a future enhancement. Use the same `.cell__value--big` class to get the font treatment, but without structural HTML injection.

### Component features not in artifact — retained

| Feature | Action |
|---|---|
| Pause/Resume toolbar | Retain above `.shell` inside `.page` column |
| `inlineError` | Render above Notes section |
| `stepsLocked` | Retained for checklist toggle gating |
| Note compose | Retained in Notes section inline form |
| `checklistInteractionDisabled()` | Unchanged |
| `parseSodBrief()`, `formatSodDate()`, `hasBriefContent()` | Keep in file; formatSodDate unused in new JSX but retained |
