# Dispatch — Status Handoff for Jennifer

*Co-founder briefing. End of Day 21, 2026-05-02. Beta target: your hotel, next week.*

This doc is yours. It captures where the Dispatch build stands, what's working today, what's not yet, and how your own Cowork chat fits into the workflow from here. Drop it into your chat as your first message and the chat will pick up the project context from it.

---

## What Dispatch is

A mobile-first web app that turns boutique hotel operations into structured, assignable, reviewable task cards on staff phones. Staff execute. Managers create and review. Every action leaves a trail.

A staff member's day is partitioned into six buckets, in time-arc order:

**Start of Day → Departures → Stayovers → Arrivals → Dailys → End of Day**

That's the ordering on every staff member's home screen. Tap a bucket, see your cards, tap a card, work it.

---

## Where the build is

The MVP is targeting beta-as-launch at your hotel, ~next week. Not a "version 1.0" — the smallest real thing that lets your team retire the morning printout.

### What's built and working

**Six card execution screens.** Every bucket has its own detail screen, themed in its own neon palette. Each handles:

- Room/guest/timing context at the top
- A checklist that toggles as the staff member works
- Notes (tap to read what others left, tap to add your own)
- Pause and resume
- Need Help and I'm Done CTAs

Status indicators on Stayovers (DND, Guest OK, Desk OK, Sheet Change, Done) and Departures (Open, Sheets, Stripped, Done) are display-only — those statuses are set by the system or admin, not by the staff doing the work.

**Your six room classes are mapped.** Per your "Alternatives to the standard lists" doc:

- single queen: 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41
- double: 22, 24, 28, 32, 34, 36
- ada double: 26
- jacuzzi: 38
- ada jacuzzi: 42
- suite: 43

Each room class gets the right checklist tree. Doubles include the second-bed section. ADA variants include the ADA Check section. Jacuzzi rooms include carpet, tub, robes. The suite includes kitchen, living, dining, sofa, second bedroom. Single queen is the base; everything else extends it with the deltas you specified.

**Reservations flow through.** A reservations table is in the system, currently seeded with synthetic guests in your real rooms for testing. The staff home page reads from it live to show the brief at the top of the day: "X arrivals · Y departures · Z stayovers."

**The auto-generation pipeline works end-to-end.** This was Day 21's biggest win. The system can:

1. Receive a reservation event (new arrival, departure, stayover continuing)
2. Match it against rules
3. Generate a draft task card with the right title, due time, room context, and guest details
4. Promote that draft into a real, assignable task

Verified: 3 test reservation events produced 3 valid draft cards which became 3 real tasks. Titles, buckets, and weekend-aware due times all came out correct.

### What's not done yet

**Auto-assignment.** Generated tasks currently land without a staff member assigned. Until your assignment policy is wired up (hall-balanced, primary-only-when-3-plus, etc. — from your synthesis), Bryan has to assign each generated task by hand. This is next on the build queue.

**Dailys, EOD, and Maintenance rule files are empty.** They need rules authored from your "Rules for HouseKeeping," "Note Types," and "Maintenance Dropdowns" docs. Your input on triggers and timing is the missing piece.

**Some checklist nodes still say "Detail: Text to come."** These are placeholders for the real instruction prose. Your Stayover, Arrival, and Departure Standard KB docs are the source; we just haven't pulled every node's prose in yet.

**Several sections are "coming soon" placeholders:**

- Team Updates rows on Dailys and End of Day
- Team cell on Start of Day
- What's Next and Supply Needs sections on End of Day
- Deep Clean and Maintenance sections on Departures and Stayovers

These are stubbed visually so the screens feel complete; they don't pretend to have data they don't.

**Vercel deploy hasn't happened yet.** The app runs only on Bryan's laptop right now. Before your team can use it, it deploys to a real URL.

### Post-beta — explicitly not in scope this week

- **ResNexus integration.** Real reservation data flowing in automatically from your channel manager.
- **The in-app agent.** A conversational layer that generates and deploys cards from a knowledge base, instead of needing every rule authored manually.
- **Reports, metrics, activity-feed polish.**
- **Deep-clean tracking, supply tracking, maintenance ticketing as full features.** Each is a real thing requiring its own database and UI; we're stubbing for beta.

---

## How your Cowork chat fits in

You're getting your own Cowork desktop chat. That gives you a Claude that:

- Has read access to whatever you upload (your KB docs, this doc, your synthesis docs, anything)
- Cannot see the codebase, run database queries, or deploy
- Can author and refine KB content with you
- Can answer questions about the project at the level this doc describes

### What to use it for

1. **Filling in the "Text to come" placeholders.** Upload your KB docs, work through node-by-node detail prose for each room class. Output goes back to Bryan to integrate.
2. **Authoring the missing rules.** Dailys, End of Day, Maintenance. What event triggers a card? Who's it for? When's it due? Bryan can sketch the structure; you provide the operational logic.
3. **Reviewing card layouts.** Bryan can share screenshots; you tell us what looks right, what doesn't match how your staff actually work.
4. **Anything operational.** "What does my night-shift handoff look like?" "What's a stayover-day-3 rule?" "When does deep clean fire on a single queen?" Your knowledge, structured into something the system can act on.

### What it can't do

- Anything inside the codebase, the database, or a deployed environment.
- Run tasks in the actual Dispatch app. Once it's deployed and you have a manager login, that's where you'll do that.
- Replace conversation with Bryan. It's a thinking partner, not a project manager.

If something you want to do in your chat hits a wall — tell Bryan and he'll handle it on his end.

### A starting prompt

When you open your chat, paste this doc as your first message, then add what you want to work on. If you want a one-liner to follow it:

> I'm Jennifer, the hotel operator co-founding Dispatch with Bryan. The doc above captures the current state of the build. I want to [whatever you're working on]. Let's go.

---

## Operating pattern

**Bryan** is the owner and engineering lead. He pairs with a coding-side Claude and an executor Claude in his terminal. He runs database changes, ships code, deploys.

**You** are the operations co-founder and the source of truth on hospitality. Every rule, every checklist, every workflow comes back to your judgment.

**Your Cowork chat** is your thinking partner — for content, operational logic, KB authoring. Not for shipping.

**Synchronization is via Bryan.** When you've authored or revised something in your chat, share it with Bryan. He integrates.

---

## What to expect this week

1. Bryan ships auto-assignment so generated tasks land on the right staff phone automatically.
2. The "Text to come" placeholders get replaced with your real prose — your work, in your chat.
3. Rules for Dailys, End of Day, Maintenance get authored — collaboration between you and Bryan.
4. The app deploys to a real URL.
5. Smoke test on real phones at your property.
6. Hand it to your team.

---

*Questions, feedback, corrections — to Bryan. He'll keep this doc current as the build moves.*
