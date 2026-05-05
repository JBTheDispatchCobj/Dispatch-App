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

## Severity classification (Day 29 III.D)

The III.D activity feed assigns a severity to each event for ordering / filter purposes. Severity is derived in `lib/activity-feed.ts` (Phase 2), not stored on the row. Defaults:
- `critical`: `needs_help`.
- `warn`: `assignment_cross_hall_override`, `assignment_above_standard_load`, `status_changed` where `to: blocked`.
- `info`: everything else, including `reshuffle_tier_changed` (chatty by design — one per tier change per pass).

## Human-readable Activity

`activity_events` is **not** governed by this contract. Prefer deriving admin narratives from `task_events` over time. (Day 28 audit found `lib/activity-log.ts` and 4 callers still write to `activity_events`; nothing reads from it. Disposition deferred to III.D Phase 6.)
