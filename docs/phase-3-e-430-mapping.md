# Phase 3 — E-430 End of Day Card Mapping

Source files:
- Component: `app/staff/task/[id]/EODCard.tsx` (current main HEAD)
- Artifact: `/Users/bryanstauder/Documents/Claude/Artifacts/dispatch-e-430/index.html`
- WIP stash reference: stash exists but is SUPERSEDED by this mapping

---

## Step 1 — Data Binding Inventory (EODCard.tsx HEAD)

### Function signature

```ts
export default function EODCard({
  task, userId: _userId, displayName,
  checklist: _checklist, comments, inlineError,
  noteBody, setNoteBody, noteBusy,
  helpBusy, doneBusy, pauseBusy, resumeBusy,
  onToggleItem: _onToggleItem,
  onNeedHelp, onImDone, onPause, onResume, onPostNote,
}: EODCardProps)
```

Already-prefixed unused props: `userId`, `checklist`, `onToggleItem` — EODCard performs no checklist operations and no Supabase writes.

### Hook calls

**None.** Like DailysCard, EODCard has zero `useState`, `useEffect`, `useCallback`. All state is parent-managed; component is purely reactive.

### Context parsers

`parseEodSummary(task.context)` reads `task.context.eod_summary`:
```ts
type EodSummary = {
  tasks_done_count: number | null;
  tasks_open_count: number | null;
  handoff_notes: string | null;
};
```

### Callbacks / event handlers

| Handler | Trigger | What it does |
|---|---|---|
| `setNoteBody(e.target.value)` | Note textarea | Local controlled via prop |
| `onPostNote(e)` | Note form submit | Parent posts comment |
| `onNeedHelp()`, `onImDone()` | CTAs | Parent callbacks |
| `onPause()`, `onResume()` | Toolbar | Parent callbacks |

### Data fields referenced in current JSX

| Field path | Derived as | Used for |
|---|---|---|
| `task.context.eod_summary` | `summary` | TEAM STATUS panel (text lines) |
| `summary.tasks_done_count` | — | "X tasks completed today" |
| `summary.tasks_open_count` | — | "X still open" |
| `summary.handoff_notes` | — | Handoff text |
| `task.status` | `taskDone`, `inProgress`, `paused` | Button disables |
| `displayName` | `heroMeta` + celebration text | Old hero strip + celebration |
| `comments.length` | — | Note count / form gating |
| `noteBody`, `noteBusy`, `inlineError` | — | Note form / error |

`heroMeta` (old hero strip string) has **no equivalent** in E-430 and becomes unused in new JSX.

### Side effects

None. No Supabase writes, no logTaskEvent.

---

## Step 2 — Demo Data Inventory (E-430 artifact)

### Document structure (top to bottom)

1. **`.topstrip`** — ← back + ＋ add-note (opens compose "New review note · End of Day")
2. **`.greet`**
   - Chip: `"End of Day"`
   - Loc: `"9 rooms turned"`
   - h1: `"You crushed it, Angie."`
   - Date: `"Tue Apr 30 · 6 hr shift · 1 deep clean"`
3. **`.section` — Team Updates** — 4 `.team__row` entries (same structure as Da-430)
4. **`.section` — Review** — header "Review" + "3 from today"; `.notes` feed with 3 first-person entries:
   - `"You"` + `" logged: "` + `"Bed in 33 stained…"` + `📎 1` + `@ Mark` chip + `"2:14 PM"`
   - `"You"` + `" noted: "` + `"Sheet change Room 20…"` + `@ Courtney` chip + `"12:48 PM"`
   - `"You"` + `" noted: "` + `"Welcome basket delivered…"` + `📎 2` chip + `"3:50 PM"`
5. **`.section` — What's Next** — `.brief` card:
   - `.brief__head`: "Next Shift" label + "Thu May 2 · 7 AM" date
   - `.brief__top`: "Light morning — 4 check-ins all after 3 PM. Slow start."
   - `.brief__grid` (2×2 cells):
     - Arrivals: **4** / "All after 3 PM"
     - Departures: **3** / "By 11 AM"
     - Stayovers: **2** / "RM 14 · RM 28"
     - Events: "Live music" / "Balsam · 8 PM"
6. **`.section` — Supply Needs** — header "Supply Needs" + "4 items · sends with wrap":
   - `.supply__list` with 4 `.supply__item` rows (bullet + name + qty + remove button)
   - `.supply__add-row` with `supply__input` text field + `supply__add` "＋ Add" button
7. **`.cta`** — `"Need Help"` (secondary) + **`"Wrap Shift"`** (primary — NOT "I'm Done")
8. **`.foot`** — "E-430 · End of Day · Neon Red" (debug)
9. **`.scrim` + `.compose` aside** — "New review note · End of Day" + `compose__input` + `compose__send`

### Demo script behaviors

| Interaction | Effect |
|---|---|
| ＋ topstrip | Opens compose drawer |
| `.supply__rm` button | Removes item from supply list; updates count |
| `supply__add` + `supply__input` | Adds new item (parses "name · qty" format) |
| Compose input | Enables `compose__send` |
| Send | Closes compose drawer |

---

## Step 3 — Mapping Table

### Data elements

| Artifact element | Component source | Notes |
|---|---|---|
| Chip `"End of Day"` | static literal | |
| Loc `"9 rooms turned"` | Gap 1 — no rooms-turned count | |
| h1 `"You crushed it, Angie."` | Gap 2 — `displayName` first name | |
| Date line `"Tue Apr 30 · 6 hr shift · 1 deep clean"` | Gap 3 — partial | |
| Team Updates section (4 rows) | Gap 4 — locked placeholder | |
| Review section label | static `"Review"` | |
| Review count `"3 from today"` | `{comments.length} from today` | |
| Note `.note__name` `"You"` | static `"You"` | Gap 5 — all EOD notes are self-authored |
| Note `.note__action` `" logged: "` / `" noted: "` | static `" noted: "` | Gap 5 — no action-type field |
| Note `.note__quote` | `comment.body` | |
| Note attachment chip `📎 N` | `comment.image_url !== null` | chip shows "📎 1" regardless of N |
| Note `.note__time` | `formatCommentTime(comment.created_at)` | |
| Inline compose | `noteBody`/`onPostNote`/`compose__send` | compose drawer replaced |
| What's Next section | Gap 6 — locked placeholder | ResNexus integration, out of beta scope |
| Supply Needs section | Gap 7 — locked placeholder | Supply CRUD, out of beta scope |
| CTA "Need Help" | `onNeedHelp` | |
| CTA "Wrap Shift" | `onImDone` | label change only — same handler |
| Footer debug label | **DROP** | |

### Interactive behaviors

| Artifact behavior | Component handler |
|---|---|
| ← topstrip | `Link href="/staff"` as `.icon-circle` |
| ＋ topstrip → compose | Gap 8 — DROP ＋; inline compose below Review feed |
| Supply remove / add | Gap 7 — locked placeholder; no handlers wired |
| Need Help | `onNeedHelp` |
| Wrap Shift | `onImDone` (label-only change) |
| Pause / Resume | Retained above shell |

---

## Step 4 — Gap List

### Gap 1 — Greet loc: "9 rooms turned"

No rooms-turned count anywhere in the component. Closest proxy is `summary.tasks_done_count` (tasks done today, not rooms). `task.location_label` might carry operational context.

**Recommendation:** Layered fallback — if `summary.tasks_done_count` is set, show `"{count} tasks done"`; else if `task.location_label` is set, show that; else static `"End of Day"`. This is honest about the data available without inventing a rooms count.

### Gap 2 — Greet h1: "You crushed it, Angie."

`displayName` is available (e.g. "Angie Lopez"). First name = `displayName.split(" ")[0]`.

**Recommendation:**
```ts
const firstName = displayName?.trim().split(/\s+/)[0] ?? null;
const greetLine = firstName ? `You crushed it, ${firstName}.` : "You crushed it.";
```

### Gap 3 — Greet date: "Tue Apr 30 · 6 hr shift · 1 deep clean"

Three components:
- **Date**: `formatTodayDate()` (same helper as DailysCard) → "Tue Apr 30"
- **"6 hr shift"**: shift duration — `task.started_at` is available in `TaskCard` but computing elapsed hours from start to now requires runtime clock, fragile, and the count only makes sense at shift-end
- **"1 deep clean"**: task-type count — no task-type breakdown in component props

**Recommendation:** Use `formatTodayDate()` only; omit shift duration and deep clean count. If `summary.handoff_notes` is a short string (≤ 40 chars), append it as a contextual sub. Otherwise date line is just the date. Keeps the line truthful without inventing counts.

```ts
const dateLine = summary?.handoff_notes && summary.handoff_notes.length <= 40
  ? `${formatTodayDate()} · ${summary.handoff_notes}`
  : formatTodayDate();
```

### Gap 4 — Team Updates: locked placeholder

No team roster data. Same Da-430 pattern.

**Recommendation:** `.section` header "Team Updates" + "Coming soon"; faded empty `.team` card with `aria-hidden`, `opacity: 0.55`, `minHeight: "52px"`.

### Gap 5 — Review/Notes section: first-person format and comment source

The artifact's Review section uses first-person notes: name is always "You", action alternates " logged: " / " noted: ". These map to the same `comments` (`CommentRow[]`) prop used by A-430 and Da-430.

Key differences from A-430 pattern:
1. `.note__name` → always static `"You"` (not `comment.author_display_name`)
2. `.note__action` → static `" noted: "` for all (no note-type field to distinguish "logged" vs "noted")
3. Section label → `"Review"` (not "Notes")
4. Count label → `"{n} from today"` (not "left for you")
5. Compose placeholder → `"Note for the wrap…"` (not "Leave a note for the team…")

Everything else (`.note__quote`, attachment chip, `.note__time`) follows A-430 exactly.

**Recommendation:** Apply A-430 pattern with these overrides. The Review section is the natural home for the existing `noteBody`/`onPostNote` inline compose. `formatCommentTime()` needed (same as A-430/Da-430).

### Gap 6 — What's Next section: no next-shift data

The What's Next `.brief` card requires next-shift date/time, a headline ("Light morning — ..."), and a 2×2 breakdown of Arrivals/Departures/Stayovers/Events with counts and sub-labels. This is ResNexus data — explicitly post-beta per CLAUDE.md.

**Recommendation:** Locked placeholder — `.section` header "What's Next" + "Coming soon" count + faded empty container with `aria-hidden`, `opacity: 0.55`, `minHeight: "52px"`.

### Gap 7 — Supply Needs section: no supply data or handlers

Interactive supply list with remove/add requires:
- Supply items data (name + qty)
- Remove handler (Supabase delete or array mutation)
- Add handler (parse input, Supabase insert or array push)

None of these exist in the component. Out of beta scope.

**Recommendation:** Locked placeholder — same pattern. `.section` header "Supply Needs" + "Coming soon".

### Gap 8 — Topstrip ＋ / compose drawer

Compose drawer is for review notes ("New review note · End of Day"). Per established pattern: drop ＋, place inline compose at bottom of Review section. `compose__send` is the correct class (E-430 compose uses `compose__send`, same as A-430/Da-430).

### Gap 9 — `heroMeta` / old hero strip becomes unused

The current component computes `heroMeta = "LOOK AT ALL YOU DID · {NAME}"` for the old salmon header strip. The E-430 artifact has no hero strip — it uses `.greet` instead. `heroMeta` is unused in new JSX and can be removed from derived values.

### Gap 10 — `inlineError` placement

Current component renders `inlineError` after the TEAM STATUS panel. In the new layout, it renders above the Review section (where note-posting errors would surface). No logic change needed.

### Component features not in artifact — retained

| Feature | Action |
|---|---|
| Pause/Resume toolbar | Retain above `.shell` inside `.page` column |
| `inlineError` | Render above Review section |
| `summary.tasks_done_count` | Used for greet loc fallback (Gap 1) |
| `summary.handoff_notes` | Used for greet date line optional suffix (Gap 3) |
| Note compose | Retained in Review section via inline form |
| `checklist: _checklist`, `onToggleItem: _onToggleItem` | Already unused/prefixed — no change |
