"use client";

/**
 * Notification Center — ported from design/admin-notification-center-v2.html
 * (locked Day 54 chase #7). REGION 1: faithful visual/interactive port with
 * PLACEHOLDER data, mounted below the Activity Feed on /admin. No live data and
 * no removal of existing lanes yet — that is Region 2 (field-by-field mapping)
 * and Region 3 (retire lanes + lift NC under the Daily Brief).
 *
 * The placeholder data is shaped per master so Region 2 can swap each item[]
 * array for real query results without touching render code:
 *   incoming    -> public.notes (Admin / Guest / Supply via note taxonomies)
 *   system      -> staff clock events / schedule / facility (source TBD)
 *   outgoing    -> sent + scheduled deployments (no table yet — gap to cull)
 *   maintenance -> maintenance_issues (Incoming = reported, Outgoing = dispatched)
 *
 * "Assign" is intentionally inert in Region 1 (wired to the reassign / AddTask
 * flow later). "Seen" toggles local state only — persistence needs a backend
 * column, which is a Region 2+ decision.
 */

import { useState } from "react";
import styles from "./NotificationCenter.module.css";

type MasterKey = "incoming" | "system" | "outgoing" | "maintenance";

type NcItem = {
  id: string;
  title: string;
  authorName?: string;
  source?: string;
  noteBody?: string;
  metaCategory?: string;
  timeAgo?: string;
  hasImage?: boolean;
};

type SubDef = { key: string; label: string };

type MasterDef = {
  key: MasterKey;
  label: string;
  subTiles: SubDef[];
  items: Record<string, NcItem[]>;
};

const NC_DATA: MasterDef[] = [
  {
    key: "incoming",
    label: "Incoming",
    subTiles: [
      { key: "admin", label: "Admin" },
      { key: "guest", label: "Guest" },
      { key: "supply", label: "Supply" },
    ],
    items: {
      admin: [
        {
          id: "inc-admin-1",
          title: "Front desk drawer short — needs sign-off",
          authorName: "Courtney Mills",
          source: "Front Desk",
          noteBody:
            "Drawer came up $40 short on close last night. Needs a manager to verify and re-count before the AM float is set.",
          metaCategory: "Admin · Front Desk",
          timeAgo: "1 hr ago",
        },
      ],
      guest: [
        {
          id: "inc-guest-1",
          title: "Late checkout request — Room 12",
          authorName: "Front Desk",
          source: "Departures - R12",
          noteBody:
            "Guest in R12 asked for a 1 PM checkout. Housekeeping can flip the room after if that works for the board.",
          metaCategory: "Front Desk · Guest",
          timeAgo: "32 min ago",
        },
        {
          id: "inc-guest-2",
          title: "Pet allergy — incoming R28",
          authorName: "Lizzie Larson",
          source: "Arrivals - R28",
          noteBody:
            "Guest called ahead — has cat allergy. Last guest in R28 had a service animal. Needs hypoallergenic linens swap + full Pet Clean turnover before 2 PM check-in. Vendor allergy spray in supply closet (3rd shelf).",
          metaCategory: "Concierge · Guest",
          timeAgo: "14 min ago",
          hasImage: true,
        },
      ],
      supply: [
        {
          id: "inc-supply-1",
          title: "Low on bath towels — 2nd floor cart",
          authorName: "Angie Lutz",
          source: "Supply",
          noteBody:
            "Down to about 6 bath towels on the 2nd floor cart. Linen order isn't due until Thursday — may need to pull from the 1st floor.",
          metaCategory: "Supply · Housekeeping",
          timeAgo: "2 hr ago",
        },
      ],
    },
  },
  {
    key: "system",
    label: "System",
    subTiles: [
      { key: "employee", label: "Employee" },
      { key: "schedule", label: "Schedule" },
      { key: "today", label: "Today" },
    ],
    items: {
      employee: [
        {
          id: "sys-emp-1",
          title: "Lizzie clocked in",
          source: "Clock-in",
          noteBody: "Shift started 7:58 AM. First card up: Start of Day.",
          metaCategory: "System · Employee",
          timeAgo: "1 hr ago",
        },
      ],
      schedule: [],
      today: [
        {
          id: "sys-today-1",
          title: "Quiet hours begin 10 PM",
          source: "Facility",
          noteBody:
            "Property quiet hours tonight 10 PM – 7 AM. Hold any loud hallway or maintenance work until morning.",
          metaCategory: "System · Today",
          timeAgo: "Today",
        },
      ],
    },
  },
  {
    key: "outgoing",
    label: "Outgoing",
    subTiles: [
      { key: "history", label: "History" },
      { key: "scheduled", label: "Scheduled" },
    ],
    items: {
      history: [
        {
          id: "out-hist-1",
          title: "Deployed: Stayover refresh — R14",
          source: "Sent",
          noteBody: "Pushed to Angie at 9:12 AM. Marked done 10:05 AM.",
          metaCategory: "Outgoing · History",
          timeAgo: "Today",
        },
      ],
      scheduled: [
        {
          id: "out-sched-1",
          title: "Scheduled: EOD checklist — all staff",
          source: "Scheduled",
          noteBody: "Auto-deploys at 4:00 PM today.",
          metaCategory: "Outgoing · Scheduled",
          timeAgo: "in 6 hr",
        },
        {
          id: "out-sched-2",
          title: "Scheduled: Deep clean — R30",
          source: "Scheduled",
          noteBody: "Queued for tomorrow's Start of Day.",
          metaCategory: "Outgoing · Scheduled",
          timeAgo: "Tomorrow",
        },
      ],
    },
  },
  {
    key: "maintenance",
    label: "Maint",
    subTiles: [
      { key: "outgoing", label: "Outgoing" },
      { key: "incoming", label: "Incoming" },
    ],
    items: {
      outgoing: [
        {
          id: "mnt-out-1",
          title: "Dispatched: HVAC filter — R22",
          source: "Maintenance · Sent",
          noteBody: "Assigned to maintenance. Awaiting confirmation.",
          metaCategory: "Maint · Outgoing",
          timeAgo: "45 min ago",
        },
        {
          id: "mnt-out-2",
          title: "Dispatched: Leaky faucet — Lobby restroom",
          source: "Maintenance · Sent",
          noteBody: "Work order WO-3F2A1B sent to maintenance.",
          metaCategory: "Maint · Outgoing",
          timeAgo: "3 hr ago",
        },
      ],
      incoming: [
        {
          id: "mnt-inc-1",
          title: "Reported: Cracked tile — Pool deck",
          authorName: "Front Desk",
          source: "Maintenance · Reported",
          noteBody:
            "Guest flagged a cracked tile near the pool steps. Trip hazard — flag it high.",
          metaCategory: "Maint · Incoming · High",
          timeAgo: "20 min ago",
        },
        {
          id: "mnt-inc-2",
          title: "Reported: TV won't power on — R18",
          authorName: "Lizzie Larson",
          source: "Maintenance · Reported",
          noteBody:
            "Guest says the TV in R18 is dead. Checked the outlet, still nothing.",
          metaCategory: "Maint · Incoming",
          timeAgo: "1 hr ago",
          hasImage: true,
        },
        {
          id: "mnt-inc-3",
          title: "Reported: Slow drain — R09 shower",
          authorName: "Angie Lutz",
          source: "Maintenance · Reported",
          noteBody: "Shower drains slowly in R09. Not urgent.",
          metaCategory: "Maint · Incoming · Low",
          timeAgo: "Yesterday",
        },
      ],
    },
  },
];

function masterCount(m: MasterDef): number {
  return m.subTiles.reduce((sum, s) => sum + (m.items[s.key]?.length ?? 0), 0);
}

function masterSubLabel(m: MasterDef): string {
  const count = masterCount(m);
  if (m.key === "system") return `${count} Action`;
  if (m.key === "maintenance") return `${count} Active`;
  if (m.key === "outgoing") return "Push";
  return "Inbox";
}

const ATTACH_ICON_PATH =
  "M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48";

export default function NotificationCenter() {
  const [activeMaster, setActiveMaster] = useState<MasterKey>("incoming");
  const [activeSub, setActiveSub] = useState<string>("admin");
  const [openId, setOpenId] = useState<string | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [attachOpenIds, setAttachOpenIds] = useState<Set<string>>(new Set());

  const activeMasterDef =
    NC_DATA.find((m) => m.key === activeMaster) ?? NC_DATA[0];
  const activeItems = activeMasterDef.items[activeSub] ?? [];

  function selectMaster(key: MasterKey) {
    const def = NC_DATA.find((m) => m.key === key) ?? NC_DATA[0];
    setActiveMaster(key);
    setActiveSub(def.subTiles[0]?.key ?? "");
    setOpenId(null);
  }

  function selectSub(key: string) {
    setActiveSub(key);
    setOpenId(null);
  }

  function toggleRow(id: string) {
    setOpenId((cur) => (cur === id ? null : id));
  }

  function toggleSeen(id: string) {
    setSeenIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAttach(id: string) {
    setAttachOpenIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function masterHasUnseen(m: MasterDef): boolean {
    return m.subTiles.some((s) =>
      (m.items[s.key] ?? []).some((it) => !seenIds.has(it.id)),
    );
  }

  return (
    <>
      <div className={styles.ncLabel}>
        <span className={styles.ncLabelTitle}>Notification Center</span>
        <span className={styles.ncLabelSub}>Flow of the Building</span>
      </div>

      <div className={styles.nc} data-active={activeMaster}>
        {/* MASTER TILES */}
        <div className={styles.masters}>
          {NC_DATA.map((m) => {
            const isActive = m.key === activeMaster;
            return (
              <div
                key={m.key}
                className={[styles.master, isActive && styles.masterActive]
                  .filter(Boolean)
                  .join(" ")}
                data-cat={m.key}
                role="button"
                tabIndex={0}
                onClick={() => selectMaster(m.key)}
              >
                {masterHasUnseen(m) && (
                  <span className={styles.masterPulse} aria-hidden />
                )}
                <div className={styles.masterCount}>{masterCount(m)}</div>
                <div className={styles.masterLbl}>{m.label}</div>
                <div className={styles.masterSub}>{masterSubLabel(m)}</div>
              </div>
            );
          })}
        </div>

        {/* SUB-TILES (active master) */}
        <div className={styles.subsWrap}>
          <div
            className={[
              styles.subs,
              activeMasterDef.subTiles.length === 3 ? styles.subs3 : styles.subs2,
            ].join(" ")}
          >
            {activeMasterDef.subTiles.map((s) => {
              const count = activeMasterDef.items[s.key]?.length ?? 0;
              const isActive = s.key === activeSub;
              return (
                <button
                  key={s.key}
                  type="button"
                  className={[styles.sub, isActive && styles.subActive]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => selectSub(s.key)}
                >
                  <span className={styles.subLbl}>{s.label}</span>
                  <span className={styles.subCount}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ITEM LIST */}
        <div className={styles.items}>
          {activeItems.length === 0 ? (
            <div className={styles.empty}>Nothing here right now.</div>
          ) : (
            activeItems.map((item, idx) => {
              const isOpen = openId === item.id;
              const isSeen = seenIds.has(item.id);
              const attachOpen = attachOpenIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={[
                    styles.row,
                    isOpen && styles.rowOpen,
                    isSeen && styles.rowSeen,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleRow(item.id)}
                >
                  <div className={styles.rowTop}>
                    <div className={styles.rowNum}>{idx + 1}</div>
                    <div className={styles.rowTitle}>{item.title}</div>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={`${styles.rowActionBtn} ${styles.rowActionBtnPrimary}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          /* Region 2+: open reassign / AddTask flow */
                        }}
                      >
                        Assign &rsaquo;
                      </button>
                      <button
                        type="button"
                        className={styles.rowActionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSeen(item.id);
                        }}
                      >
                        Seen
                      </button>
                    </div>
                  </div>
                  <div className={styles.rowBar} />

                  {isOpen && (
                    <div className={styles.rowExpanded}>
                      {(item.authorName || item.source) && (
                        <div className={styles.exAuthor}>
                          {item.authorName && (
                            <div className={styles.exAuthorName}>
                              {item.authorName}
                            </div>
                          )}
                          {item.source && (
                            <div className={styles.exAuthorSource}>
                              {item.source}
                            </div>
                          )}
                        </div>
                      )}

                      <div className={styles.exBar} aria-hidden />

                      {item.noteBody && (
                        <div className={`${styles.exPill} ${styles.exPillNote}`}>
                          <div className={styles.exPillBody}>{item.noteBody}</div>
                          <div className={styles.exPillMeta}>
                            <span>{item.metaCategory ?? ""}</span>
                            <span>{item.timeAgo ?? ""}</span>
                          </div>
                        </div>
                      )}

                      {item.hasImage && (
                        <div
                          className={[
                            styles.exAttach,
                            attachOpen && styles.exAttachOpen,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAttach(item.id);
                          }}
                        >
                          <div className={styles.exAttachHead}>
                            <svg
                              className={styles.exAttachIcon}
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path d={ATTACH_ICON_PATH} />
                            </svg>
                            <span>Image attached</span>
                            <span className={styles.exAttachCaret} aria-hidden>
                              {attachOpen ? "−" : "+"}
                            </span>
                          </div>
                          <div className={styles.exAttachThumb} aria-hidden>
                            Photo · tap for full view
                          </div>
                        </div>
                      )}

                      <div className={styles.exCta}>
                        <button
                          type="button"
                          className={styles.exCtaAssign}
                          onClick={(e) => {
                            e.stopPropagation();
                            /* Region 2+: open reassign / AddTask flow */
                          }}
                        >
                          Assign
                        </button>
                        <button
                          type="button"
                          className={styles.exCtaSeen}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSeen(item.id);
                          }}
                        >
                          Seen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
