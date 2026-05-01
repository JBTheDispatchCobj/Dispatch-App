import type { Metadata } from "next";

export const metadata: Metadata = { title: "Preview: S-430 · Stayovers" };

const html = `
<div class="page">
  <div class="shell">
    <div class="topstrip">
      <button class="icon-circle" aria-label="Back to tasks">←</button>
      <button class="icon-circle" aria-label="Add a note">＋</button>
    </div>
    <header class="greet">
      <div class="greet__label">
        <span class="greet__chip">Stayover</span>
        <span class="greet__loc">Room 20</span>
      </div>
      <h1 class="greet__hello">Refresh for David Adams</h1>
      <div class="greet__date">Night 2 of 3 · Sheet change</div>
    </header>
    <section class="statcard">
      <div class="statcard__head"><span>Status</span><span class="statcard__sub">System set · 2 active</span></div>
      <div class="statcard__pills">
        <span class="status-pill">Do Not Disturb</span>
        <span class="status-pill status-pill--active">Guest OK</span>
        <span class="status-pill status-pill--active">Desk OK</span>
        <span class="status-pill">Sheet Change</span>
        <span class="status-pill">Done</span>
      </div>
    </section>
    <section class="brief">
      <div class="briefrow"><span class="briefrow__label">Guest</span><span class="briefrow__value">David Adams · King Suite</span></div>
      <div class="briefrow"><span class="briefrow__label">Night</span><span class="briefrow__value">2 of 3</span></div>
      <div class="briefrow"><span class="briefrow__label">Type</span><span class="briefrow__value">Sheet change</span></div>
      <div class="briefrow"><span class="briefrow__label">Notes</span><span class="briefrow__value">Extra towels · only grey duvet</span></div>
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
    <section class="section">
      <header class="section__head"><span class="section__label">Maintenance</span><span class="section__count">2 open</span></header>
      <div class="exrow" data-open="false">
        <button class="exrow__head" type="button">
          <span class="exrow__icon">MX</span>
          <div class="exrow__text"><div class="exrow__title">Maintenance</div><div class="exrow__sub">2 open · 1 normal · 1 low</div></div>
          <span class="exrow__count">2</span><span class="exrow__chev">›</span>
        </button>
        <div class="exrow__expand"><div class="exrow__expand-inner"><div class="exrow__expand-pad">
          <div class="issues">
            <button class="issue" type="button"><span class="issue__sev issue__sev--normal"></span><div class="issue__main"><div class="issue__title">Curtains · Loose</div><div class="issue__loc">Linens · Room 20</div></div><div class="issue__right"><span class="issue__status issue__status--open">Open</span><span class="issue__time">11:50 AM</span></div></button>
            <button class="issue" type="button"><span class="issue__sev issue__sev--low"></span><div class="issue__main"><div class="issue__title">Lamp · Faded</div><div class="issue__loc">Decor · Room 20</div></div><div class="issue__right"><span class="issue__status issue__status--open">Open</span><span class="issue__time">10:22 AM</span></div></button>
          </div>
          <button class="issue-add" type="button">＋ Log new issue</button>
        </div></div></div>
      </div>
    </section>
    <div class="cta">
      <button class="cta__secondary" type="button">Need Help</button>
      <button class="cta__primary" type="button">I&apos;m Done</button>
    </div>
    <div class="foot">S-430 · Stayovers · Hot Coral</div>
  </div>
</div>
`;

export default function PreviewS430() {
  return (
    <div
      className="preview-s-430"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
