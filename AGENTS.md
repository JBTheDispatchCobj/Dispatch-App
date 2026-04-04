# AGENTS.md

## Product
This repository contains the MVP for **The Dispatch Company**.

The Dispatch Company is a mobile-first hotel operations system for boutique, independent, repositioned, and operator-led properties. It is designed to reduce chaos, replace reactive management, and turn daily operations into structured execution.

## MVP Purpose
Build a usable MVP for one property first, with Jennifer as the beta operator.

The MVP should help:
- Admin/Manager set the day
- Staff understand what matters today
- Work get assigned and completed with accountability
- Important issues surface without needing reports
- Institutional knowledge stay in the system

## Primary Sections
- Dispatch
- Tasks / Cards
- Templates
- Checklist enforcement
- Activity
- Staff
- Admin Cards

## User Roles
- Admin
- Manager
- Ops
- Vendor

## Core UX Rules
- Mobile first
- Calm interface, not noisy
- Lists over Kanban boards
- Bottom sheets for detail views where helpful
- Dispatch is context
- Tasks are execution
- Activity is signal
- Admin Cards are system-generated management actions

## Build Rules
- Build the smallest working version first
- Do not add features outside MVP unless explicitly requested
- Do not refactor unrelated files
- Prefer clear, readable code over clever code
- Always explain what changed
- Always include how to test
- One feature at a time
- Every day should end with something clickable or testable

## MVP In Scope
- Auth
- Dispatch
- Task/Card creation
- Draft vs publish logic
- Templates
- Checklist enforcement
- Activity feed
- Staff list and staff detail
- Staff notes and outcomes
- Card engagement tracking (stored)
- Admin Cards
- Staff issue submission upward

## MVP Out of Scope
- Chat
- Deep ResNexus integration
- AI automation
- Reporting dashboards
- Scheduling system
- HR/recruiting suite
- Payroll/timekeeping
- Geo tracking
- Full native mobile app

## Product Rules
- Unassigned cards can be saved as Drafts
- Assigned cards can be Published
- Checklist items can be required before completion
- Ops sees only assigned/relevant work
- Admin/Manager sees full operational view
- Admin Cards replace reports by turning signals into action
