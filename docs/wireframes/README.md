# Wireframes (reference art)

Source PDFs on `main` (under `docs/` on GitHub):

- [`User main profile .pdf`](https://github.com/JBTheDispatchCobj/Dispatch-App/blob/main/docs/User%20main%20profile%20.pdf)
- [`User Card Details.pdf`](https://github.com/JBTheDispatchCobj/Dispatch-App/blob/main/docs/User%20Card%20Details.pdf)

## Staff UI PNGs (GitHub `docs/` on `main`)

These files are in the remote repo; **pull `main`** (or copy the files into local `docs/`) so Cursor can `@`-reference them by path.

| File | GitHub |
|------|--------|
| `ARRIVALS.png` | [view](https://github.com/JBTheDispatchCobj/Dispatch-App/blob/main/docs/ARRIVALS.png) |
| `DAILYS.png` | [view](https://github.com/JBTheDispatchCobj/Dispatch-App/blob/main/docs/DAILYS.png) |
| `EOD.png` | [view](https://github.com/JBTheDispatchCobj/Dispatch-App/blob/main/docs/EOD.png) |
| `START OF THE DAY FINAL.png` | [view](https://github.com/JBTheDispatchCobj/Dispatch-App/blob/main/docs/START%20OF%20THE%20DAY%20FINAL.png) |
| `STAYOVERS.png` | [view](https://github.com/JBTheDispatchCobj/Dispatch-App/blob/main/docs/STAYOVERS.png) |
| `Departure Card.png` | [view](https://github.com/JBTheDispatchCobj/Dispatch-App/blob/main/docs/Departure%20Card.png) |
| `Staff Profile .png` | [view](https://github.com/JBTheDispatchCobj/Dispatch-App/blob/main/docs/Staff%20Profile%20.png) |

**Implementation mapping (informal):** `START OF THE DAY FINAL.png` / `DAILYS.png` → staff home “Start of Day” + daily-style lists; `ARRIVALS.png` / `STAYOVERS.png` → grouped scan sections; `EOD.png` → future “end of day” bucket if you add it; `Departure Card.png` → `/staff/task/[id]` departure execution surface; `Staff Profile .png` → `/staff` header / profile strip.

Legacy optional names (if you still have them locally):

- `staff-home.png` — main profile / home
- `staff-card-detail.png` — task / card screen
