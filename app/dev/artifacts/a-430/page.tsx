import type { Metadata } from "next";

export const metadata: Metadata = { title: "Preview: A-430 · Arrivals" };

const html = `
<div class="page">
  <div class="shell">
    <div class="topstrip">
      <button class="icon-circle" aria-label="Back to tasks">←</button>
      <button class="icon-circle" aria-label="Add a note">＋</button>
    </div>
    <header class="greet">
      <div class="greet__label">
        <span class="greet__chip">Arrival</span>
        <span class="greet__loc">Room 23</span>
      </div>
      <h1 class="greet__hello">Prepare for Katie Wilkins</h1>
      <div class="greet__date">Check-in 4 PM · 3 nights · King Suite</div>
    </header>
    <section class="brief">
      <div class="briefrow"><span class="briefrow__label">Guest</span><span class="briefrow__value">Katie Wilkins · King Suite</span></div>
      <div class="briefrow"><span class="briefrow__label">Nights</span><span class="briefrow__value">3</span></div>
      <div class="briefrow"><span class="briefrow__label">Extras</span><span class="briefrow__value">Crib · Welcome basket</span></div>
      <div class="briefrow"><span class="briefrow__label">Requests</span><span class="briefrow__value">Quiet floor · Extra pillows</span></div>
    </section>
    <section class="section">
      <header class="section__head"><span class="section__label">Notes</span><span class="section__count">3 left for you</span></header>
      <div class="notes">
        <button class="note" type="button">
          <div class="note__head">
            <span class="note__dot"></span>
            <div class="note__body">
              <div class="note__line"><span class="note__name">Courtney</span><span class="note__action"> left a note: </span><span class="note__quote">"Katie's a return guest — quiet floor preference, late riser. Avoid early knocks."</span></div>
              <div class="note__chips"><span class="note__chip note__chip--mention">@ Angie</span></div>
            </div>
            <span class="note__time">9:14 AM</span>
          </div>
        </button>
        <button class="note" type="button">
          <div class="note__head">
            <span class="note__dot"></span>
            <div class="note__body">
              <div class="note__line"><span class="note__name">Jen</span><span class="note__action"> left a note: </span><span class="note__quote">"Crib delivered this morning — placement against west wall, away from window."</span></div>
              <div class="note__chips"><span class="note__chip">📎 1</span></div>
            </div>
            <span class="note__time">8:32 AM</span>
          </div>
        </button>
        <button class="note" type="button">
          <div class="note__head">
            <span class="note__dot"></span>
            <div class="note__body">
              <div class="note__line"><span class="note__name">Lizzie</span><span class="note__action"> left a note: </span><span class="note__quote">"Late check-in confirmed — keys at concierge if Katie arrives past 7 PM."</span></div>
              <div class="note__chips"><span class="note__chip">📎 1</span><span class="note__chip note__chip--mention">@ Mark</span></div>
            </div>
            <span class="note__time">Yesterday</span>
          </div>
        </button>
      </div>
    </section>
    <section class="section">
      <header class="section__head"><span class="section__label">Checklist</span><span class="section__count">0 of 6 done</span></header>
      <div class="bucketcard">
        <div class="brow" data-checked="false"><div class="brow__head"><span class="brow__label"><span class="brow__num">1</span>Open / Strip</span><span class="brow__right"><span class="brow__meta">Pending</span><span class="brow__sep">·</span><a class="brow__details" href="#">Details ›</a></span></div><div class="bar"><div class="bar__fill"></div></div></div>
        <div class="brow" data-checked="false"><div class="brow__head"><span class="brow__label"><span class="brow__num">2</span>Report / Doc</span><span class="brow__right"><span class="brow__meta">Pending</span><span class="brow__sep">·</span><a class="brow__details" href="#">Details ›</a></span></div><div class="bar"><div class="bar__fill"></div></div></div>
        <div class="brow" data-checked="false"><div class="brow__head"><span class="brow__label"><span class="brow__num">3</span>Clean</span><span class="brow__right"><span class="brow__meta">Pending</span><span class="brow__sep">·</span><a class="brow__details" href="#">Details ›</a></span></div><div class="bar"><div class="bar__fill"></div></div></div>
        <div class="brow" data-checked="false"><div class="brow__head"><span class="brow__label"><span class="brow__num">4</span>Restock</span><span class="brow__right"><span class="brow__meta">Pending</span><span class="brow__sep">·</span><a class="brow__details" href="#">Details ›</a></span></div><div class="bar"><div class="bar__fill"></div></div></div>
        <div class="brow" data-checked="false"><div class="brow__head"><span class="brow__label"><span class="brow__num">5</span>Prep</span><span class="brow__right"><span class="brow__meta">Pending</span><span class="brow__sep">·</span><a class="brow__details" href="#">Details ›</a></span></div><div class="bar"><div class="bar__fill"></div></div></div>
        <div class="brow" data-checked="false"><div class="brow__head"><span class="brow__label"><span class="brow__num">6</span>Close Out</span><span class="brow__right"><span class="brow__meta">Pending</span><span class="brow__sep">·</span><a class="brow__details" href="#">Details ›</a></span></div><div class="bar"><div class="bar__fill"></div></div></div>
      </div>
    </section>
    <div class="cta">
      <button class="cta__secondary" type="button">Need Help</button>
      <button class="cta__primary" type="button">I&apos;m Done</button>
    </div>
    <div class="foot">A-430 · Arrivals · Pop Orange</div>
  </div>
</div>
`;

export default function PreviewA430() {
  return (
    <div
      className="preview-a-430"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
