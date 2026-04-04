# Business and Product Rules

## Roles
### Admin
- full system access
- can manage users
- can see all operational data
- can create and edit all card types

### Manager
- full property operational access
- can create cards
- can assign cards
- can edit Dispatch
- can review staff and Admin Cards

### Ops
- sees only assigned or relevant work
- can interact with assigned cards
- can submit new issue cards upward

### Vendor
- limited access to assigned work only

## Dispatch Rules
- Dispatch is context, not execution
- Daily Brief and Watchlist belong here
- Dispatch should stay simple and readable
- Management controls Dispatch content

## Task / Card Rules
- cards can be created by Admin and Manager
- Ops card creation upward is simple and limited
- every card should have a state
- cards may be saved as Draft if unassigned
- cards may be Published once assigned
- one assignee only in MVP

## Card States
- New
- In Progress
- Waiting
- Done
- Escalated

## Checklist Rules
- checklists can be optional or required
- required checklist items must be completed before card completion
- checklist enforcement is a core part of product quality

## Activity Rules
- activity is signal, not chat
- show only the most recent relevant changes
- activity should stay lightweight and readable

## Staff Rules
- staff records are lightweight, not HR profiles
- each staff member has:
  - name
  - role
  - status
  - notes
  - outcomes feed
- outcomes are tied to work history and manager notes

## Admin Card Rules
- Admin Cards are generated from operational conditions, not written as reports
- Admin Cards exist to tell management what to do next
- examples:
  - overdue work
  - repeated blockers
  - recurring room issues
  - missed completion patterns

## UI Rules
- mobile first
- no Kanban board in MVP
- use list views and bottom sheets where appropriate
- Dispatch and Tasks should not look identical
- Dispatch is read/interpret
- Tasks are open/do

## Data Rules
- store operational history cleanly
- preserve event history for:
  - card state changes
  - checklist progress
  - comments
  - blockers
  - outcomes
- build so future intelligence is possible, but do not build AI into MVP
