# `task_events` contract (Milestone 1)

Append-only. **`detail`** MUST include **`schema_version`** (integer, currently **`1`**) for all new writes.

## Event types

| `event_type` | When | `detail` keys |
|--------------|------|----------------|
| `card_opened` | Staff/manager opens execution context | `schema_version`, `status_at_open` (`string`), optional `terminal` (`boolean` if task already `done`) |
| `card_paused` | `in_progress` → `paused` | `schema_version` only |
| `card_resumed` | `paused` → `in_progress` | `schema_version` only |
| `status_changed` | Task `status` updated | `schema_version`, `from`, `to`, optional `reason` |
| `checklist_checked` | Checklist item set done | `schema_version`, `checklist_item_id`, `title` |
| `checklist_unchecked` | Checklist item cleared | `schema_version`, `checklist_item_id`, `title` |
| `comment_added` | New `task_comments` row | `schema_version`, `body` (full text MVP), `has_image` (`boolean`), optional `checklist_item_id` |
| `needs_help` | Escalation signal | `schema_version` |
| `marked_done` | Terminal completion committed | `schema_version` |
| `assignment_cross_hall_override` | Orchestrator picker relaxed the hall-adjacency rule for this draft when every eligible candidate was locked to a different hall (master plan IV.B / R10). Emitted post-insert during the orchestrator's bulk-assign pass. | `schema_version`, `staff_id`, `staff_name`, `room_number`, `from_hall`, `to_hall` |
| `assignment_above_standard_load` | Orchestrator picker assigned this draft to a member whose per-type load count for the matched bucket exceeds `STANDARD_LOAD_PER_HOUSEKEEPER` (master plan IV.C / R11). Emitted post-insert. One event per pick that lands a member above their per-type standard. | `schema_version`, `staff_id`, `staff_name`, `room_number`, `load_key` (`departures` \| `stayovers` \| `dailys`), `count`, `threshold` |
| `reshuffle_tier_changed` | Reshuffle pass recomputed `context.priority_tier` for this task (master plan IV.D / R15 + R09 cross-cutting bumps). Emitted per-task on every tier-change pass. Severity intentionally `info` so the feed only highlights when filtered to "all events." | `schema_version`, `from_tier` (1\|2\|3\|null), `to_tier` (1\|2\|3\|null), `room_number` (nullable for non-room cards) |
| `reassigned` | Admin reassigned a task between staff (master plan III.H / Global Rules R23). Mutates `tasks.staff_id` + `assignee_name`. Emitted from `lib/orchestration/index.ts.reassignTask` after the row update lands. Dual-logging spec: detail carries both staff IDs + names so the per-staff feed query (Day 29 `getActivityForUser`) can render this row under either staff's view via `detail->>from_staff_id` / `detail->>to_staff_id` filters. | `schema_version`, `from_staff_id` (uuid \| null — null when the task was previously unassigned), `to_staff_id` (uuid \| null — null when unassigning), `from_staff_name` (string \| null), `to_staff_name` (string \| null), optional `reason` (string — Day 34 helper-only scope; discrete reassign UI with a required reason note is the next chase) |
| `deep_clean_triggered` | Orchestrator's IV.H Wed-occupancy Deep Clean trigger elevated a `housekeeping_turn` draft from Standard to Deep on a Wednesday (master plan IV.H / D-430 R26; constants in `lib/dispatch-config.ts` Section 12 `DEEP_CLEAN_AUTO_TRIGGER`). Mutates `context.outgoing_guest.clean_type` from `"Standard"` to `"Deep"` on the draft and emits this audit post-insert. One event per elevation. **Day 43 Phase A**: the occupancy-percent gate (spec cond 3) is intentionally skipped pending Jennifer's confirmation of the data source + total room count denominator — Phase B will activate it without re-opening the chase. | `schema_version`, `staff_id`, `staff_name` (nullable — empty string when assignment-policies left the draft unassigned), `room_number`, `recent_deep_items_count` (int — rows in `public.deep_clean_history` for the room within `lookback_days`), `departures_count` (int — `housekeeping_turn` drafts in this batch), `lookback_days` (int — copy of the threshold constant for traceability), `max_recent_deep_items_completed` (int — copy of the threshold constant), `max_departures` (int — copy of the threshold constant) |
| `stayover_status_overridden` | Admin set `context.stayover_status` from the manager card view (`/tasks/[id]`) via `<StayoverStatusPanel/>` (master plan I.G prerequisite, Day 46 chase). Multi-select chip array; the panel writes the merged context with the new key array preserving every other context key. Today the only writer of `stayover_status` — orchestrator pre-set is deferred and the staff-side toggle was locked display-only Day 21. The `lib/stayover-history.ts` lookup helper reads `context.stayover_status` arrays from past stayover/housekeeping_turn rows for the same room, so writing here populates the S-430 brief "Last status" row on subsequent stayover cards for that room. Severity defaults to `info` — admin overrides are routine, not warning signals. | `schema_version`, `from` (string[] — prior status keys, possibly empty), `to` (string[] — new status keys, possibly empty). Keys are drawn from `{dnd, guest_ok, desk_ok, sheet_change, done}` per `STAYOVER_STATUS_OPTIONS` in `app/staff/task/[id]/StayoversCard.tsx`. |

## Severity classification (Day 29 III.D, updated Day 34, updated Day 43)

The III.D activity feed assigns a severity to each event for ordering / filter purposes. Severity is derived in `lib/activity-feed.ts` (Phase 2), not stored on the row. Defaults:
- `critical`: `needs_help`.
- `warn`: `assignment_cross_hall_override`, `assignment_above_standard_load`, `reassigned`, `deep_clean_triggered`, `status_changed` where `to: blocked`.
- `info`: everything else, including `reshuffle_tier_changed` (chatty by design — one per tier change per pass).

## Human-readable Activity

`activity_events` is **not** governed by this contract. Prefer deriving admin narratives from `task_events` over time. (Day 28 audit found `lib/activity-log.ts` and 4 callers still write to `activity_events`; nothing reads from it. Disposition deferred to III.D Phase 6.)
