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

## Human-readable Activity

`activity_events` is **not** governed by this contract. Prefer deriving admin narratives from `task_events` over time.
