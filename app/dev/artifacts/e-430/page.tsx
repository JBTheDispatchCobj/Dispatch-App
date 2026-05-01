import type { Metadata } from "next";

export const metadata: Metadata = { title: "Preview: E-430 · End of Day" };

const html = `
<div class="page">
  <div class="shell">
    <div class="topstrip"><button class="icon-circle">←</button><button class="icon-circle">＋</button></div>
    <header class="greet">
      <div class="greet__label"><span class="greet__chip">End of Day</span><span class="greet__loc">9 rooms turned</span></div>
      <h1 class="greet__hello">You crushed it, Angie.</h1>
      <div class="greet__date">Tue Apr 30 · 6 hr shift · 1 deep clean</div>
    </header>
    <section class="section">
      <header class="section__head"><span class="section__label">Team Updates</span><span class="section__count">6 tasks left today</span></header>
      <div class="team">
        <div class="team__row"><span class="team__avatar team__avatar--al">AL</span><div class="team__main"><div class="team__name">Angie <span class="team__you">You</span></div><div class="team__activity">Wrapping Room 23 · welcome basket</div></div><div class="team__right"><span class="team__count team__count--alert">1</span><span class="team__suff">Left</span></div></div>
        <div class="team__row"><span class="team__avatar team__avatar--ll">LL</span><div class="team__main"><div class="team__name">Lizzie</div><div class="team__activity">Front desk · late check-ins</div></div><div class="team__right"><span class="team__count team__count--alert">2</span><span class="team__suff">Left</span></div></div>
        <div class="team__row"><span class="team__avatar team__avatar--mp">MP</span><div class="team__main"><div class="team__name">Mark</div><div class="team__activity">Maintenance · 30s hall lights</div></div><div class="team__right"><span class="team__count">3</span><span class="team__suff">Open</span></div></div>
        <div class="team__row"><span class="team__avatar team__avatar--cm">CM</span><div class="team__main"><div class="team__name">Courtney</div><div class="team__activity">On call · available till 8</div></div><div class="team__right"><span class="team__count team__count--zero">—</span><span class="team__suff">Avail</span></div></div>
      </div>
    </section>
    <section class="section">
      <header class="section__head"><span class="section__label">Review</span><span class="section__count">3 from today</span></header>
      <div class="notes">
        <button class="note" type="button"><div class="note__head"><span class="note__dot"></span><div class="note__body"><div class="note__line"><span class="note__name">You</span><span class="note__action"> logged: </span><span class="note__quote">"Bed in 33 stained — flagged as high to maintenance, photo attached."</span></div><div class="note__chips"><span class="note__chip">📎 1</span><span class="note__chip note__chip--mention">@ Mark</span></div></div><span class="note__time">2:14 PM</span></div></button>
        <button class="note" type="button"><div class="note__head"><span class="note__dot"></span><div class="note__body"><div class="note__line"><span class="note__name">You</span><span class="note__action"> noted: </span><span class="note__quote">"Sheet change Room 20 — guest preferred grey duvet, not the floral. Updating booking note."</span></div><div class="note__chips"><span class="note__chip note__chip--mention">@ Courtney</span></div></div><span class="note__time">12:48 PM</span></div></button>
        <button class="note" type="button"><div class="note__head"><span class="note__dot"></span><div class="note__body"><div class="note__line"><span class="note__name">You</span><span class="note__action"> noted: </span><span class="note__quote">"Welcome basket delivered to Room 23 by 3:45 — Katie&apos;s return guest, quiet floor honored."</span></div><div class="note__chips"><span class="note__chip">📎 2</span></div></div><span class="note__time">3:50 PM</span></div></button>
      </div>
    </section>
    <section class="section">
      <header class="section__head"><span class="section__label">What&apos;s Next</span><span class="section__count">2 days off</span></header>
      <div class="brief">
        <div class="brief__head"><span class="brief__head-label">Next Shift</span><span class="brief__head-when">Thu May 2 · 7 AM</span></div>
        <div class="brief__top">Light morning — 4 check-ins all after 3 PM. Slow start.</div>
        <div class="brief__grid">
          <div class="cell"><div class="cell__label">Arrivals</div><div class="cell__value cell__value--big">4</div><div class="cell__sub">All after 3 PM</div></div>
          <div class="cell cell--tr"><div class="cell__label">Departures</div><div class="cell__value cell__value--big">3</div><div class="cell__sub">By 11 AM</div></div>
          <div class="cell cell--bl"><div class="cell__label">Stayovers</div><div class="cell__value cell__value--big">2</div><div class="cell__sub">RM 14 · RM 28</div></div>
          <div class="cell cell--br"><div class="cell__label">Events</div><div class="cell__value">Live music</div><div class="cell__sub">Balsam · 8 PM</div></div>
        </div>
      </div>
    </section>
    <section class="section">
      <header class="section__head"><span class="section__label">Supply Needs</span><span class="section__count">4 items · sends with wrap</span></header>
      <div class="supply">
        <div class="supply__list">
          <div class="supply__item"><span class="supply__bullet"></span><span class="supply__name">Sheets · twin</span><span class="supply__qty">×4 sets</span><button class="supply__rm">×</button></div>
          <div class="supply__item"><span class="supply__bullet"></span><span class="supply__name">Trash bags · large</span><span class="supply__qty">×1 box</span><button class="supply__rm">×</button></div>
          <div class="supply__item"><span class="supply__bullet"></span><span class="supply__name">Toilet paper</span><span class="supply__qty">×24 rolls</span><button class="supply__rm">×</button></div>
          <div class="supply__item"><span class="supply__bullet"></span><span class="supply__name">Hand soap</span><span class="supply__qty">×1 case</span><button class="supply__rm">×</button></div>
        </div>
        <div class="supply__add-row"><input class="supply__input" placeholder="Add item · qty…" /><button class="supply__add" type="button">＋ Add</button></div>
      </div>
    </section>
    <div class="cta"><button class="cta__secondary" type="button">Need Help</button><button class="cta__primary" type="button">Wrap Shift</button></div>
    <div class="foot">E-430 · End of Day · Neon Red</div>
  </div>
</div>
`;

export default function PreviewE430() {
  return (
    <div
      className="preview-e-430"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
