Dispatch UI rules

Product model
- Dispatch is a hospitality operations app
- Staff = execution-first
- Admin = compression-first

Do not turn this into
- a generic task app
- a checklist app
- a SaaS dashboard

Staff Home
- Start of Day uses inline mini task cards
- Departures / Arrivals / Stayovers use grouped collapsed scan rows
- Rows are lightweight and fast to scan, not heavy cards
- Contextual room tasks use a 3-state model:
  1. collapsed row
  2. preview
  3. full execution card

Staff card types
- Departure = turnover + reset
- Arrival = setup + readiness
- Stayover = active occupancy + conditional service
- Dailys = routine property work
- EOD = closure + review + handoff

Staff task detail
- /staff/task/[id] should render concrete card types, not a generic task detail
- Preserve checklist, notes, maintenance, pause/help/done behavior

Admin
- minimized by default
- expands intentionally
- summary-first, not execution-first
- uses sections/lanes, not dense dashboards

Engineering constraints
- preserve existing Supabase schema unless absolutely necessary
- preserve orchestration, auth, routing, and task behavior
- prioritize structure over visual polish first
