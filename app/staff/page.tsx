"use client";

import { useState } from "react";

type BucketKey = "sod" | "d" | "s" | "a" | "da" | "e";

type Bucket = {
  key: BucketKey;
  title: string;
  context: string;
  count: number;
  nextTask: string;
  accent: string;
  ink: string;
  titleOnAccent?: string;
};

const BUCKETS: Bucket[] = [
  {
    key: "sod",
    title: "Start of Day",
    context: "Open shift",
    count: 1,
    nextTask: "Start of day prep",
    accent: "var(--sod-accent)",
    ink: "var(--sod-accent-ink)",
  },
  {
    key: "d",
    title: "Departures",
    context: "Checkout window",
    count: 2,
    nextTask: "Turn over 33 for 4 PM check-in",
    accent: "var(--departures-accent)",
    ink: "var(--departures-accent-ink)",
  },
  {
    key: "s",
    title: "Stayovers",
    context: "Service rounds",
    count: 4,
    nextTask: "Service Room 14",
    accent: "var(--stayovers-accent)",
    ink: "var(--stayovers-accent-ink)",
  },
  {
    key: "a",
    title: "Arrivals",
    context: "Check-in window",
    count: 3,
    nextTask: "Welcome Smith party · Room 33",
    accent: "var(--arrivals-accent)",
    ink: "var(--arrivals-accent-ink)",
  },
  {
    key: "da",
    title: "Dailys",
    context: "Property rounds",
    count: 2,
    nextTask: "Lobby snack restock",
    accent: "var(--dailys-accent)",
    ink: "var(--dailys-accent-ink)",
    titleOnAccent: "var(--dailys-accent-pale)",
  },
  {
    key: "e",
    title: "End of Day",
    context: "Wrap shift",
    count: 1,
    nextTask: "Close shift checklist",
    accent: "var(--eod-accent)",
    ink: "var(--eod-accent-ink)",
    titleOnAccent: "var(--eod-accent-pale)",
  },
];

const CalIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v4M16 3v4" />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="icon-check"
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth="2.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12l5 5L20 7" />
  </svg>
);

const PlusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="#1F1A12"
    strokeWidth="2.2"
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export default function StaffHomePage() {
  const [done, setDone] = useState<Set<BucketKey>>(new Set());
  const [active, setActive] = useState<BucketKey>("sod");

  const handleCardClick = (key: BucketKey) => {
    if (key === active) return;
    setDone((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setActive(key);
  };

  const handleActionClick = (e: React.MouseEvent, key: BucketKey) => {
    e.stopPropagation();
    if (key !== active) return;
    const newDone = new Set(done);
    newDone.add(key);
    setDone(newDone);
    const idx = BUCKETS.findIndex((b) => b.key === key);
    for (let i = idx + 1; i < BUCKETS.length; i++) {
      if (!newDone.has(BUCKETS[i].key)) {
        setActive(BUCKETS[i].key);
        return;
      }
    }
  };

  return (
    <main className="staff-home">
      <div className="staff-home__shell">
        <div className="staff-home__hdr">
          <div>
            <h1 className="staff-home__hello">Hi, Lizzie.</h1>
            <p className="staff-home__date">Friday · May 1</p>
          </div>
          <button className="staff-home__plus" aria-label="Quick add">
            <PlusIcon />
          </button>
        </div>

        <div className="staff-home__brief">
          <div className="staff-home__brief-head">
            <span>Daily brief</span>
            <span>Fri · May 1</span>
          </div>
          <div className="staff-home__brief-grid">
            <div>
              <div className="staff-home__brief-lbl">Arrivals</div>
              <div className="staff-home__brief-val">3</div>
            </div>
            <div>
              <div className="staff-home__brief-lbl">Departures</div>
              <div className="staff-home__brief-val">2</div>
            </div>
            <div>
              <div className="staff-home__brief-lbl">Stayovers</div>
              <div className="staff-home__brief-val">4</div>
            </div>
          </div>
        </div>

        <div className="staff-home__tasksbar">
          <span>Tasks today</span>
          <span>13 open</span>
        </div>

        <div className="deck">
          {BUCKETS.map((bucket) => {
            const isActive = active === bucket.key;
            const isDone = done.has(bucket.key);
            const classes = ["bcard"];
            if (isActive) classes.push("is-active");
            if (isDone) classes.push("is-done");
            const titleColor = bucket.titleOnAccent || bucket.ink;
            return (
              <div
                key={bucket.key}
                className={classes.join(" ")}
                data-bucket={bucket.key}
                style={
                  {
                    ["--accent" as string]: bucket.accent,
                    ["--ink" as string]: bucket.ink,
                  } as React.CSSProperties
                }
                onClick={() => handleCardClick(bucket.key)}
              >
                <div className="bcard__head">
                  <h2 className="bcard__title" style={{ color: titleColor }}>
                    {bucket.title}
                  </h2>
                  <button
                    className="bcard__action"
                    aria-label={isDone ? "Completed" : "Complete"}
                    onClick={(e) => handleActionClick(e, bucket.key)}
                  >
                    <span className="num">{bucket.count}</span>
                    <CheckIcon />
                  </button>
                </div>
                <span className="bcard__meta" style={{ color: titleColor }}>
                  <CalIcon />
                  Fri · May 1 · {bucket.context}
                </span>
                <div className="bcard__inset">
                  <div className="bcard__insetlabel">
                    <span className="bcard__insetpre">Next up</span>
                    {bucket.nextTask}
                  </div>
                  <span className="bcard__insetcta">View ›</span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="staff-home__foot">The Dispatch Co · Staff</p>
      </div>
    </main>
  );
}
