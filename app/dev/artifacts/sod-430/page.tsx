import type { Metadata } from "next";

export const metadata: Metadata = { title: "Preview: SOD-430 · Start of Day" };

const html = `
<div class="page">
  <div class="shell">

    <div class="topstrip">
      <button class="icon-circle" aria-label="Back to tasks">←</button>
      <button class="icon-circle" aria-label="Add a note">＋</button>
    </div>

    <header class="greet">
      <div class="greet__label">
        <span class="greet__chip">Start of Day</span>
        <span class="greet__loc">Tue Apr 30</span>
      </div>
      <h1 class="greet__hello">Hi, Courtney</h1>
      <div class="greet__date">1st day of spring</div>
    </header>

    <section class="brief">
      <div class="brief__head"><span class="brief__head-label">Daily Brief</span></div>
      <div class="brief__top">High turnover today — 5 check-ins later.</div>
      <div class="brief__grid">
        <div class="cell">
          <div class="cell__label">Weather</div>
          <div class="cell__value">High 64° / Low 41°</div>
          <div class="cell__sub">Clear · 8 mph SW</div>
        </div>
        <div class="cell cell--tr">
          <div class="cell__label">Events</div>
          <div class="cell__value">Farmer&apos;s Market</div>
          <div class="cell__sub">Main St · 9 – 1</div>
          <a class="cell__link" href="#" role="button">See all events ›</a>
        </div>
        <div class="cell cell--bl">
          <div class="cell__label">Status</div>
          <div class="cell__value cell__value--big">
            3 <em>arr</em><span class="sep">·</span>
            2 <em>dep</em><span class="sep">·</span>
            4 <em>stays</em>
          </div>
        </div>
        <div class="cell cell--br">
          <div class="cell__label">Team</div>
          <a class="cell__value-link" href="#" role="button">3 on shift ›</a>
          <div class="cell__sub">Angie · Lizzie · Mark</div>
        </div>
      </div>
    </section>

    <section class="updates">
      <header class="updates__head">
        <span class="updates__label">Updates</span>
        <span class="updates__from">Since your Mon shift</span>
      </header>
      <div class="updates__body">
        <p class="updates__text">Front desk hours moved to 7 AM – 8 PM starting Monday. Angie Lopez joined Tuesday — running departures. VIP fridges now stocked w/ sparkling water by default. Linen vendor switching to Wed pickups, label two carts before noon.</p>
      </div>
    </section>

    <section class="section">
      <header class="section__head">
        <span class="section__label">Notes</span>
        <span class="section__count">3 left for you</span>
      </header>
      <div class="notes">
        <button class="note" type="button">
          <div class="note__head">
            <span class="note__dot"></span>
            <div class="note__body">
              <div class="note__line">
                <span class="note__name">Jen</span>
                <span class="note__action"> left a note: </span>
                <span class="note__quote">&ldquo;Front desk closing 8 PM tonight — late check-ins have keys at concierge.&rdquo;</span>
              </div>
              <div class="note__chips"><span class="note__chip">📎 1</span><span class="note__chip note__chip--mention">@ Lizzie</span></div>
            </div>
            <span class="note__time">7:32 AM</span>
          </div>
        </button>
        <button class="note" type="button">
          <div class="note__head">
            <span class="note__dot"></span>
            <div class="note__body">
              <div class="note__line">
                <span class="note__name">Jen</span>
                <span class="note__action"> left a note: </span>
                <span class="note__quote">&ldquo;Fresh sheets on RM 14 priority — guest allergies flagged on booking.&rdquo;</span>
              </div>
              <div class="note__chips"><span class="note__chip note__chip--mention">@ Angie</span></div>
            </div>
            <span class="note__time">6:55 AM</span>
          </div>
        </button>
        <button class="note" type="button">
          <div class="note__head">
            <span class="note__dot"></span>
            <div class="note__body">
              <div class="note__line">
                <span class="note__name">Jen</span>
                <span class="note__action"> left a note: </span>
                <span class="note__quote">&ldquo;Dog in 12, friendly — skip second cleaning round if guest is in.&rdquo;</span>
              </div>
              <div class="note__chips"><span class="note__chip">📎 1</span></div>
            </div>
            <span class="note__time">5:30 AM</span>
          </div>
        </button>
      </div>
    </section>

    <section class="section">
      <header class="section__head">
        <span class="section__label">Today&apos;s Tasks</span>
        <span class="section__count">6 to start</span>
      </header>
      <div class="tasks">
        <button class="task" type="button"><div class="task__title">Prep Mop</div><div class="task__sub">Laundry Rm · New Cleaner</div><div class="task__row"><span class="task__pill">Complete</span><a class="task__link" href="#">Details ›</a></div></button>
        <button class="task" type="button"><div class="task__title">Collect Rags</div><div class="task__sub">Laundry Rm · 2 from Yest.</div><div class="task__row"><span class="task__pill">Complete</span><a class="task__link" href="#">Details ›</a></div></button>
        <button class="task" type="button"><div class="task__title">Cups on Carts</div><div class="task__sub">Supply Rm</div><div class="task__row"><span class="task__pill">Complete</span><a class="task__link" href="#">Details ›</a></div></button>
        <button class="task" type="button"><div class="task__title">Distribute Cart</div><div class="task__sub">Laundry Rm</div><div class="task__row"><span class="task__pill">Complete</span><a class="task__link" href="#">Details ›</a></div></button>
        <button class="task" type="button"><div class="task__title">Daily Pow-Wow</div><div class="task__sub">Office · New Teammates</div><div class="task__row"><span class="task__pill">Complete</span><a class="task__link" href="#">Details ›</a></div></button>
        <button class="task" type="button"><div class="task__title">Distribute Cart</div><div class="task__sub">Hallway</div><div class="task__row"><span class="task__pill">Complete</span><a class="task__link" href="#">Details ›</a></div></button>
      </div>
    </section>

    <div class="cta">
      <button class="cta__secondary" type="button">Need Help</button>
      <button class="cta__primary" type="button">Start Shift</button>
    </div>

    <div class="foot">SOD-430 · Start of Day · Neon Yellow</div>
  </div>
</div>
`;

export default function PreviewSod430() {
  return (
    <div
      className="preview-sod-430"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
