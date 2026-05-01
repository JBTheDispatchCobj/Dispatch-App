import type { Metadata } from "next";

export const metadata: Metadata = { title: "Preview: Da-430 · Dailys" };

const html = `
<div class="page">
  <div class="shell">
    <div class="topstrip"><button class="icon-circle">←</button><button class="icon-circle">＋</button></div>
    <header class="greet">
      <div class="greet__label"><span class="greet__chip">Dailys</span><span class="greet__loc">Property Round</span></div>
      <h1 class="greet__hello">Property round, Angie.</h1>
      <div class="greet__date">Thu Apr 30 · 6 stops</div>
    </header>
    <section class="section">
      <header class="section__head"><span class="section__label">Team Updates</span><span class="section__count">5 tasks left today</span></header>
      <div class="team">
        <div class="team__row"><span class="team__avatar team__avatar--al">AL</span><div class="team__main"><div class="team__name">Angie <span class="team__you">You</span></div><div class="team__activity">On round · Restock cart pickup</div></div><div class="team__right"><span class="team__count team__count--alert">6</span><span class="team__suff">Stops</span></div></div>
        <div class="team__row"><span class="team__avatar team__avatar--ll">LL</span><div class="team__main"><div class="team__name">Lizzie</div><div class="team__activity">Front desk · check-in coverage</div></div><div class="team__right"><span class="team__count team__count--alert">2</span><span class="team__suff">Left</span></div></div>
        <div class="team__row"><span class="team__avatar team__avatar--mp">MP</span><div class="team__main"><div class="team__name">Mark</div><div class="team__activity">Maintenance · AC Rm 14</div></div><div class="team__right"><span class="team__count">3</span><span class="team__suff">Open</span></div></div>
        <div class="team__row"><span class="team__avatar team__avatar--cm">CM</span><div class="team__main"><div class="team__name">Courtney</div><div class="team__activity">On call · available till 8</div></div><div class="team__right"><span class="team__count team__count--zero">—</span><span class="team__suff">Avail</span></div></div>
      </div>
    </section>
    <section class="section">
      <header class="section__head"><span class="section__label">Notes</span><span class="section__count">3 left for you</span></header>
      <div class="notes">
        <button class="note" type="button"><div class="note__head"><span class="note__dot"></span><div class="note__body"><div class="note__line"><span class="note__name">Courtney</span><span class="note__action"> left a note: </span><span class="note__quote">"Public restroom paper running low — confirm restock when you swing by lobby."</span></div><div class="note__chips"><span class="note__chip note__chip--mention">@ Angie</span></div></div><span class="note__time">9:14 AM</span></div></button>
        <button class="note" type="button"><div class="note__head"><span class="note__dot"></span><div class="note__body"><div class="note__line"><span class="note__name">Jen</span><span class="note__action"> left a note: </span><span class="note__quote">"30s hall AC vents need a wipe — adding to next deep clean cycle, low priority for today."</span></div><div class="note__chips"><span class="note__chip">📎 1</span></div></div><span class="note__time">8:32 AM</span></div></button>
        <button class="note" type="button"><div class="note__head"><span class="note__dot"></span><div class="note__body"><div class="note__line"><span class="note__name">Mark</span><span class="note__action"> left a note: </span><span class="note__quote">"Vacuum filter in supply closet needs swap — marked one for you on the shelf."</span></div><div class="note__chips"><span class="note__chip note__chip--mention">@ Angie</span></div></div><span class="note__time">Yesterday</span></div></button>
      </div>
    </section>
    <section class="section">
      <header class="section__head"><span class="section__label">Property Round</span><span class="section__count">0 of 6 done</span></header>
      <div class="tasks">
        <button class="task" type="button" data-done="false"><div class="task__title">Restock Cart</div><div class="task__sub">Supply Rm · See Layout</div><div class="task__row"><span class="task__pill task__pill--pending">Complete</span><a class="task__link" href="#">Details ›</a></div></button>
        <button class="task" type="button" data-done="false"><div class="task__title">Dust Pictures</div><div class="task__sub">40s Hall</div><div class="task__row"><span class="task__pill task__pill--pending">Complete</span><a class="task__link" href="#">Details ›</a></div></button>
        <button class="task" type="button" data-done="false"><div class="task__title">Public Restrooms</div><div class="task__sub">Lobby · Check Paper</div><div class="task__row"><span class="task__pill task__pill--pending">Complete</span><a class="task__link" href="#">Details ›</a></div></button>
        <button class="task" type="button" data-done="false"><div class="task__title">Trash</div><div class="task__sub">Halls · All Floors</div><div class="task__row"><span class="task__pill task__pill--pending">Complete</span><a class="task__link" href="#">Details ›</a></div></button>
        <button class="task" type="button" data-done="false"><div class="task__title">Wash Windows</div><div class="task__sub">Lobby · Side Doors</div><div class="task__row"><span class="task__pill task__pill--pending">Complete</span><a class="task__link" href="#">Details ›</a></div></button>
        <button class="task" type="button" data-done="false"><div class="task__title">Vacuum</div><div class="task__sub">Halls · All Floors</div><div class="task__row"><span class="task__pill task__pill--pending">Complete</span><a class="task__link" href="#">Details ›</a></div></button>
      </div>
    </section>
    <div class="cta"><button class="cta__secondary" type="button">Need Help</button><button class="cta__primary" type="button">I&apos;m Done</button></div>
    <div class="foot">Da-430 · Dailys · Neon Plum</div>
  </div>
</div>
`;

export default function PreviewDa430() {
  return (
    <div
      className="preview-da-430"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
