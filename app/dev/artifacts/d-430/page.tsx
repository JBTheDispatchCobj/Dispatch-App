import type { Metadata } from "next";

export const metadata: Metadata = { title: "Preview: D-430 · Departures" };

const html = `
<div class="page">
  <div class="shell">

    <div class="topstrip">
      <button class="icon-circle" aria-label="Back to tasks">←</button>
      <button class="icon-circle" aria-label="Add a note">＋</button>
    </div>

    <header class="greet">
      <div class="greet__label">
        <span class="greet__chip">Departure</span>
        <span class="greet__loc">Room 33</span>
      </div>
      <h1 class="greet__hello">Turn over 33 for 4 PM check-in</h1>
      <div class="greet__date">Created 10:15 AM by Courtney · Due 3:30 PM</div>
    </header>

    <section class="brief">
      <div class="cols">
        <div class="col">
          <h3 class="col__heading">Outgoing</h3>
          <div class="col__row"><span class="col__label">Guests</span><span class="col__value">4</span></div>
          <div class="col__row"><span class="col__label">Nights</span><span class="col__value">3</span></div>
          <div class="col__row"><span class="col__label">Clean</span><span class="col__value">Standard</span></div>
        </div>
        <div class="col col--right">
          <h3 class="col__heading">Incoming</h3>
          <div class="col__row"><span class="col__label">Party</span><span class="col__value">Smith, 2</span></div>
          <div class="col__row"><span class="col__label">Nights</span><span class="col__value">2</span></div>
          <div class="col__row"><span class="col__label">Notes</span><span class="col__value col__value--small">VIP — allergies</span></div>
        </div>
      </div>
    </section>

    <section class="setstat">
      <div class="setstat__row">
        <div class="setstat__label">Setup</div>
        <textarea class="setstat__input" placeholder="Add setup notes…">Foam pillows swapped per VIP request. Fridge stocked w/ sparkling water.</textarea>
      </div>
      <div class="setstat__row">
        <div class="setstat__label">Notes</div>
        <textarea class="setstat__input" placeholder="Add notes for this turnover…">Linens delivered 1:30, two sets short — laundry restock by 2 PM.</textarea>
      </div>
      <div class="setstat__row setstat__row--status">
        <div class="setstat__label">Status</div>
        <div class="setstat__pills">
          <span class="status-pill status-pill--active">Open</span>
          <span class="status-pill status-pill--active">Sheets</span>
          <span class="status-pill">Stripped</span>
          <span class="status-pill">Done</span>
        </div>
      </div>
    </section>

    <section class="section">
      <header class="section__head">
        <span class="section__label">Checklist</span>
        <span class="section__count">3 of 6 done</span>
      </header>
      <div class="bucketcard">
        <div class="brow" data-checked="true"><div class="brow__head"><span class="brow__label"><span class="brow__num">1</span>Open / Strip</span><span class="brow__right"><span class="brow__meta">Done · 1:18 PM</span><span class="brow__sep">·</span><a class="brow__details" href="#">Details ›</a></span></div><div class="bar"><div class="bar__fill" style="right:0"></div></div></div>
        <div class="brow" data-checked="true"><div class="brow__head"><span class="brow__label"><span class="brow__num">2</span>Report / Doc</span><span class="brow__right"><span class="brow__meta">Done · 1:38 PM</span><span class="brow__sep">·</span><a class="brow__details" href="#">Details ›</a></span></div><div class="bar"><div class="bar__fill" style="right:0"></div></div></div>
        <div class="brow" data-checked="true"><div class="brow__head"><span class="brow__label"><span class="brow__num">3</span>Clean</span><span class="brow__right"><span class="brow__meta">Done · 1:54 PM</span><span class="brow__sep">·</span><a class="brow__details" href="#">Details ›</a></span></div><div class="bar"><div class="bar__fill" style="right:0"></div></div></div>
        <div class="brow" data-checked="false"><div class="brow__head"><span class="brow__label"><span class="brow__num">4</span>Restock</span><span class="brow__right"><span class="brow__meta">Pending</span><span class="brow__sep">·</span><a class="brow__details" href="#">Details ›</a></span></div><div class="bar"><div class="bar__fill"></div></div></div>
        <div class="brow" data-checked="false"><div class="brow__head"><span class="brow__label"><span class="brow__num">5</span>Prep</span><span class="brow__right"><span class="brow__meta">Pending</span><span class="brow__sep">·</span><a class="brow__details" href="#">Details ›</a></span></div><div class="bar"><div class="bar__fill"></div></div></div>
        <div class="brow" data-checked="false"><div class="brow__head"><span class="brow__label"><span class="brow__num">6</span>Close Out</span><span class="brow__right"><span class="brow__meta">Pending</span><span class="brow__sep">·</span><a class="brow__details" href="#">Details ›</a></span></div><div class="bar"><div class="bar__fill"></div></div></div>
      </div>
    </section>

    <section class="section">
      <header class="section__head">
        <span class="section__label">Per-room work</span>
        <span class="section__count">Deep Clean · Maintenance</span>
      </header>
      <div class="exrow" data-open="true">
        <button class="exrow__head" type="button">
          <span class="exrow__icon">DC</span>
          <div class="exrow__text"><div class="exrow__title">Deep Clean</div><div class="exrow__sub">0 of 7 done</div></div>
          <span class="exrow__count">7</span><span class="exrow__chev">›</span>
        </button>
        <div class="exrow__expand"><div class="exrow__expand-inner"><div class="exrow__expand-pad">
          <div class="dctiles">
            <div class="dctile" data-done="false"><div class="dctile__check">✓</div><div class="dctile__title">AC Unit</div><div class="dctile__last">Lizzie · Apr 15</div><div class="dctile__row"><a class="dctile__details" href="#">Details ›</a></div></div>
            <div class="dctile" data-done="false"><div class="dctile__check">✓</div><div class="dctile__title">Bedding</div><div class="dctile__last">Angie · Apr 24</div><div class="dctile__row"><a class="dctile__details" href="#">Details ›</a></div></div>
            <div class="dctile" data-done="false"><div class="dctile__check">✓</div><div class="dctile__title">Bed</div><div class="dctile__last">Mark · Mar 12</div><div class="dctile__row"><a class="dctile__details" href="#">Details ›</a></div></div>
            <div class="dctile" data-done="false"><div class="dctile__check">✓</div><div class="dctile__title">Walls</div><div class="dctile__last">Lizzie · Apr 02</div><div class="dctile__row"><a class="dctile__details" href="#">Details ›</a></div></div>
            <div class="dctile" data-done="false"><div class="dctile__check">✓</div><div class="dctile__title">Bathroom</div><div class="dctile__last">Angie · Apr 28</div><div class="dctile__row"><a class="dctile__details" href="#">Details ›</a></div></div>
            <div class="dctile" data-done="false"><div class="dctile__check">✓</div><div class="dctile__title">Shower / Sink</div><div class="dctile__last">Lizzie · Apr 22</div><div class="dctile__row"><a class="dctile__details" href="#">Details ›</a></div></div>
            <div class="dctile" data-done="false"><div class="dctile__check">✓</div><div class="dctile__title">Defrost Fridge / Freezer</div><div class="dctile__last">Mark · Feb 18</div><div class="dctile__row"><a class="dctile__details" href="#">Details ›</a></div></div>
          </div>
        </div></div></div>
      </div>
      <div class="exrow" data-open="false">
        <button class="exrow__head" type="button">
          <span class="exrow__icon">MX</span>
          <div class="exrow__text"><div class="exrow__title">Maintenance</div><div class="exrow__sub">3 open · 1 high · 1 normal · 1 low</div></div>
          <span class="exrow__count">3</span><span class="exrow__chev">›</span>
        </button>
        <div class="exrow__expand"><div class="exrow__expand-inner"><div class="exrow__expand-pad">
          <div class="issues">
            <button class="issue" type="button"><span class="issue__sev issue__sev--high"></span><div class="issue__main"><div class="issue__title">Bed · Stained</div><div class="issue__loc">Furniture · Room 33</div></div><div class="issue__right"><span class="issue__status issue__status--open">Open</span><span class="issue__time">2:14 PM</span></div></button>
            <button class="issue" type="button"><span class="issue__sev issue__sev--normal"></span><div class="issue__main"><div class="issue__title">Sink · Loose</div><div class="issue__loc">Plumbing · Room 33</div></div><div class="issue__right"><span class="issue__status issue__status--prog">In Prog</span><span class="issue__time">1:45 PM</span></div></button>
            <button class="issue" type="button"><span class="issue__sev issue__sev--low"></span><div class="issue__main"><div class="issue__title">Mirror · Scratched</div><div class="issue__loc">Decor · Room 33</div></div><div class="issue__right"><span class="issue__status issue__status--open">Open</span><span class="issue__time">12:30 PM</span></div></button>
          </div>
        </div></div></div>
      </div>
    </section>

    <div class="cta">
      <button class="cta__secondary" type="button">Need Help</button>
      <button class="cta__primary" type="button">I&apos;m Done</button>
    </div>
    <div class="foot">D-430 · Departures · Neon Teal</div>
  </div>
</div>
`;

export default function PreviewD430() {
  return (
    <div
      className="preview-d-430"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
