"use client";

/**
 * Notification Center — locked v2 design (design/admin-notification-center-v2.html).
 * REGION 2: live data. The 4 master tiles / sub-tiles / item list / expanded
 * D-430 pill-box view are unchanged from Region 1; the placeholder array was
 * swapped for getNotificationCenterData() (lib/notification-center.ts), which
 * buckets notes / task-event activity / staff roster / maintenance / tasks into
 * this exact shape. See that file for the signed-off lane→tile mapping.
 *
 * Still mounted BELOW the Activity Feed (Region 3 retires the old lanes and
 * lifts this under the Daily Brief). "Seen" is local-only (no DB column yet);
 * "Assign" is inert pending the reassign/AddTask wiring.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getNotificationCenterData,
  type MasterKey,
  type NcMaster,
} from "@/lib/notification-center";
import styles from "./NotificationCenter.module.css";

function masterCount(m: NcMaster): number {
  return m.subTiles.reduce((sum, s) => sum + (m.items[s.key]?.length ?? 0), 0);
}

function masterSubLabel(m: NcMaster): string {
  const count = masterCount(m);
  if (m.key === "system") return `${count} Action`;
  if (m.key === "maintenance") return `${count} Active`;
  if (m.key === "outgoing") return "Push";
  return "Inbox";
}

const ATTACH_ICON_PATH =
  "M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48";

export default function NotificationCenter() {
  const [masters, setMasters] = useState<NcMaster[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeMaster, setActiveMaster] = useState<MasterKey>("incoming");
  const [activeSub, setActiveSub] = useState<string>("admin");
  const [openId, setOpenId] = useState<string | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [attachOpenIds, setAttachOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getNotificationCenterData(supabase);
        if (!cancelled) setMasters(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load notifications.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeMasterDef =
    masters?.find((m) => m.key === activeMaster) ?? masters?.[0] ?? null;
  const activeItems = activeMasterDef?.items[activeSub] ?? [];

  function selectMaster(key: MasterKey) {
    const def = masters?.find((m) => m.key === key);
    setActiveMaster(key);
    setActiveSub(def?.subTiles[0]?.key ?? "");
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

  function masterHasUnseen(m: NcMaster): boolean {
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

      {error ? (
        <p className="error" style={{ margin: "0 4px 12px" }}>
          {error}
        </p>
      ) : null}

      {!masters ? (
        <p className="loading-line" style={{ margin: "0 4px" }}>
          Loading…
        </p>
      ) : (
        <div className={styles.nc} data-active={activeMaster}>
          {/* MASTER TILES */}
          <div className={styles.masters}>
            {masters.map((m) => {
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
                (activeMasterDef?.subTiles.length ?? 0) === 3
                  ? styles.subs3
                  : styles.subs2,
              ].join(" ")}
            >
              {(activeMasterDef?.subTiles ?? []).map((s) => {
                const count = activeMasterDef?.items[s.key]?.length ?? 0;
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
                            /* Region 3+: open reassign / AddTask flow */
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
                            <div className={styles.exPillBody}>
                              {item.noteBody}
                            </div>
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
                              /* Region 3+: open reassign / AddTask flow */
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
      )}
    </>
  );
}
