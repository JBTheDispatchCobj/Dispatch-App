"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  STAFF,
  AVATAR_LIZZIE,
  AVATAR_MARK,
  AVATAR_ANGIE,
} from "./staff/data";
import { fetchProfile, type ProfileFetchFailure } from "@/lib/profile";
import {
  resolveAuthUser,
  redirectToLoginUnlessLocalDevBypass,
} from "@/lib/dev-auth-bypass";
import ProfileLoadError from "../profile-load-error";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type DotColor = "green" | "amber" | "red" | "blue" | "mute";
type FeedTagType = "done" | "open" | "over";

type LaneItem = { id: string; title: string; body: string; chip: string };

type BriefStat = {
  label: string;
  value: string;
  unit: string;
  compact?: boolean;
};

type FeedItem = {
  name: string;
  avatarSrc: string;
  textBefore: string;
  linkText: string;
  textAfter: string;
  actionPill?: string;
  tag: FeedTagType;
  tagLabel: string;
  time: string;
};

/* ------------------------------------------------------------------ */
/* Inline placeholder data — replace with Supabase queries post-beta  */
/* ------------------------------------------------------------------ */

const BRIEF_STATS: BriefStat[] = [
  { label: "OCCUPANCY", value: "87", unit: "%" },
  { label: "ON SHIFT", value: "4", unit: " staff" },
  { label: "EVENT", value: "Dueling Pianos · Balsam", unit: "", compact: true },
];

// TODO post-beta: wire to real watchlist table
const WATCHLIST_ITEMS: LaneItem[] = [
  { id: "wl1", title: "AC compressor — Room 14", body: "Waiting on parts (ETA 5/3)", chip: "MAINTENANCE" },
  { id: "wl2", title: "Pool pump cycling loud", body: "Vendor scheduled 5/1", chip: "MAINTENANCE" },
];

// TODO post-beta: wire to real scheduling table
const SCHEDULING_ITEMS: LaneItem[] = [
  { id: "sch1", title: "Courtney — on-call", body: "Until 10pm Sat", chip: "ON-CALL" },
  { id: "sch2", title: "Lizzie — off Sun", body: "Returning Mon AM", chip: "OFF" },
  { id: "sch3", title: "Mark — late shift swap", body: "Covering for Angie Fri", chip: "SWAP" },
];

// TODO post-beta: wire to real critical table
const CRITICAL_ITEMS: LaneItem[] = [
  { id: "crit1", title: "Front desk understaffed late shift", body: "Hire ASAP — coverage gap weekends", chip: "HIRING" },
];

// TODO post-beta: wire to real notes table
const NOTES_ITEMS: LaneItem[] = [
  { id: "n1", title: "Customer feedback — Mary in 14", body: "AC noise complaint, follow up after repair", chip: "FEEDBACK" },
  { id: "n2", title: "Halloween plan", body: "Finalize decor budget by 10/15", chip: "EVENT" },
  { id: "n3", title: "Front desk SOP refresh", body: "Update check-in script for new ResNexus integration", chip: "SOP" },
];

const FEED_ITEMS: FeedItem[] = [
  {
    name: "Lizzie Larson",
    avatarSrc: AVATAR_LIZZIE,
    textBefore: "Completed: “",
    linkText: "Turn over 33 for 4pm check-in",
    textAfter: "” assigned 12:15pm by Courtney.",
    tag: "done",
    tagLabel: "COMPLETED",
    time: "1:20 PM",
  },
  {
    name: "Mark Parry",
    avatarSrc: AVATAR_MARK,
    textBefore: "Opened: “",
    linkText: "Replace siding on west side of the property",
    textAfter: "” with a note attached.",
    actionPill: "OPEN NOTE",
    tag: "open",
    tagLabel: "OPENED",
    time: "1:20 PM",
  },
  {
    name: "Angie Lopez",
    avatarSrc: AVATAR_ANGIE,
    textBefore: "Assigned task “",
    linkText: "Restock retail snacks after breakfast rush",
    textAfter: "” is now overdue.",
    actionPill: "SEND REMINDER",
    tag: "over",
    tagLabel: "OVERDUE",
    time: "1:20 PM",
  },
];

/* ------------------------------------------------------------------ */
/* Lookup maps                                                         */
/* ------------------------------------------------------------------ */

const SDOT_CLASS: Record<DotColor, string> = {
  green: styles.sdotGreen,
  amber: styles.sdotAmber,
  red:   styles.sdotRed,
  blue:  styles.sdotBlue,
  mute:  styles.sdotMute,
};

const TAG_CLASS: Record<FeedTagType, string> = {
  done: `${styles.feedTag} ${styles.feedTagDone}`,
  open: `${styles.feedTag} ${styles.feedTagOpen}`,
  over: `${styles.feedTag} ${styles.feedTagOver}`,
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminHomePage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);
  const [staffExpanded, setStaffExpanded] = useState(false);
  const [watchlistExpanded, setWatchlistExpanded] = useState(false);
  const [schedulingExpanded, setSchedulingExpanded] = useState(false);
  const [criticalExpanded, setCriticalExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const user = resolveAuthUser(session);
      if (!user) {
        redirectToLoginUnlessLocalDevBypass();
        return;
      }
      const profileResult = await fetchProfile(supabase, user);
      if (cancelled) return;
      if (!profileResult.ok) {
        setProfileFailure(profileResult.failure);
        return;
      }
      if (profileResult.profile.role !== "admin") {
        window.location.replace("/");
        return;
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (profileFailure) return <ProfileLoadError failure={profileFailure} />;
  if (!ready) return null;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Top bar */}
        <div className={styles.topbar}>
          <div>
            <div className={styles.greet}>Hi, Courtney</div>
            <div className={styles.greetDate}>SAT &middot; MAR 21, 2026</div>
          </div>
          <button className={styles.addBtn} aria-label="Add">+</button>
        </div>

        {/* Daily Brief */}
        <div className={styles.brief}>
          <div className={styles.briefHead}>
            <span>DAILY BRIEF</span>
            <span>PROPERTY</span>
          </div>
          <div className={styles.briefTitle}>
            High turnover today &mdash; 5 check-ins later.
          </div>
          <div className={styles.briefStat}>
            {BRIEF_STATS.map((s) => (
              <div key={s.label}>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={`${styles.statVal}${s.compact ? ` ${styles.statValCompact}` : ""}`}>
                  {s.value}
                  {s.unit && <small className={styles.statValUnit}>{s.unit}</small>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Watchlist lane */}
        {watchlistExpanded ? (
          <>
            <div
              className={`${styles.sectionLabel} ${styles.sectionLabelExpanded}`}
              onClick={() => setWatchlistExpanded(false)}
              role="button"
              tabIndex={0}
            >
              <span>WATCHLIST &middot; {WATCHLIST_ITEMS.length} ITEMS</span>
              <span className={styles.collapseHint}>
                TAP TO COLLAPSE
                <span className={styles.chevDown}>&#9662;</span>
              </span>
            </div>
            <div
              className={styles.laneItemGrid}
              style={{ "--lchip-bg": "rgba(217,168,44,0.18)", "--lchip-text": "#8A6A1C" } as React.CSSProperties}
            >
              {WATCHLIST_ITEMS.slice(0, 5).map((item) => (
                // TODO post-beta: wire to watchlist item detail
                <div key={item.id} className={styles.laneItem}>
                  <div className={styles.laneItemHead}>
                    <div className={styles.laneItemTitle}>{item.title}</div>
                    <span className={styles.laneItemChip}>{item.chip}</span>
                  </div>
                  <div className={styles.laneItemBody}>{item.body}</div>
                </div>
              ))}
              {WATCHLIST_ITEMS.length > 5 && (
                <div className={styles.laneItemMore}>+{WATCHLIST_ITEMS.length - 5} more</div>
              )}
            </div>
          </>
        ) : (
          <div
            className={styles.lane}
            onClick={() => setWatchlistExpanded(true)}
            role="button"
            tabIndex={0}
          >
            <div className={`${styles.laneIcon} ${styles.laneIconWatchlist}`}>&#9651;</div>
            <div>
              <div className={styles.laneTitle}>Watchlist</div>
              <div className={styles.laneSub}>
                <span className={styles.sdotAmber} />
                {WATCHLIST_ITEMS.length} items
              </div>
            </div>
            <div className={styles.chev}>&rsaquo;</div>
          </div>
        )}

        {/* Scheduling lane */}
        {schedulingExpanded ? (
          <>
            <div
              className={`${styles.sectionLabel} ${styles.sectionLabelExpanded}`}
              onClick={() => setSchedulingExpanded(false)}
              role="button"
              tabIndex={0}
            >
              <span>SCHEDULING &middot; {SCHEDULING_ITEMS.length} ITEMS</span>
              <span className={styles.collapseHint}>
                TAP TO COLLAPSE
                <span className={styles.chevDown}>&#9662;</span>
              </span>
            </div>
            <div
              className={styles.laneItemGrid}
              style={{ "--lchip-bg": "rgba(46,123,84,0.16)", "--lchip-text": "#1F5C3C" } as React.CSSProperties}
            >
              {SCHEDULING_ITEMS.slice(0, 5).map((item) => (
                // TODO post-beta: wire to scheduling item detail
                <div key={item.id} className={styles.laneItem}>
                  <div className={styles.laneItemHead}>
                    <div className={styles.laneItemTitle}>{item.title}</div>
                    <span className={styles.laneItemChip}>{item.chip}</span>
                  </div>
                  <div className={styles.laneItemBody}>{item.body}</div>
                </div>
              ))}
              {SCHEDULING_ITEMS.length > 5 && (
                <div className={styles.laneItemMore}>+{SCHEDULING_ITEMS.length - 5} more</div>
              )}
            </div>
          </>
        ) : (
          <div
            className={styles.lane}
            onClick={() => setSchedulingExpanded(true)}
            role="button"
            tabIndex={0}
          >
            <div className={`${styles.laneIcon} ${styles.laneIconScheduling}`}>&#9681;</div>
            <div>
              <div className={styles.laneTitle}>Scheduling</div>
              <div className={styles.laneSub}>
                <span className={styles.sdotGreen} />
                {SCHEDULING_ITEMS.length} on roster
              </div>
            </div>
            <div className={styles.chev}>&rsaquo;</div>
          </div>
        )}

        {/* Critical lane */}
        {criticalExpanded ? (
          <>
            <div
              className={`${styles.sectionLabel} ${styles.sectionLabelExpanded}`}
              onClick={() => setCriticalExpanded(false)}
              role="button"
              tabIndex={0}
            >
              <span>CRITICAL &middot; {CRITICAL_ITEMS.length} ITEMS</span>
              <span className={styles.collapseHint}>
                TAP TO COLLAPSE
                <span className={styles.chevDown}>&#9662;</span>
              </span>
            </div>
            <div
              className={styles.laneItemGrid}
              style={{ "--lchip-bg": "rgba(199,95,95,0.18)", "--lchip-text": "#8A3A3A" } as React.CSSProperties}
            >
              {CRITICAL_ITEMS.slice(0, 5).map((item) => (
                // TODO post-beta: wire to critical item detail
                <div key={item.id} className={styles.laneItem}>
                  <div className={styles.laneItemHead}>
                    <div className={styles.laneItemTitle}>{item.title}</div>
                    <span className={styles.laneItemChip}>{item.chip}</span>
                  </div>
                  <div className={styles.laneItemBody}>{item.body}</div>
                </div>
              ))}
              {CRITICAL_ITEMS.length > 5 && (
                <div className={styles.laneItemMore}>+{CRITICAL_ITEMS.length - 5} more</div>
              )}
            </div>
          </>
        ) : (
          <div
            className={styles.lane}
            onClick={() => setCriticalExpanded(true)}
            role="button"
            tabIndex={0}
          >
            <div className={`${styles.laneIcon} ${styles.laneIconCritical}`}>&#9650;</div>
            <div>
              <div className={styles.laneTitle}>Critical</div>
              <div className={styles.laneSub}>
                <span className={styles.sdotRed} />
                {CRITICAL_ITEMS.length} active
              </div>
            </div>
            <div className={styles.chev}>&rsaquo;</div>
          </div>
        )}

        {/* Notes lane */}
        {notesExpanded ? (
          <>
            <div
              className={`${styles.sectionLabel} ${styles.sectionLabelExpanded}`}
              onClick={() => setNotesExpanded(false)}
              role="button"
              tabIndex={0}
            >
              <span>NOTES &middot; {NOTES_ITEMS.length} ITEMS</span>
              <span className={styles.collapseHint}>
                TAP TO COLLAPSE
                <span className={styles.chevDown}>&#9662;</span>
              </span>
            </div>
            <div
              className={styles.laneItemGrid}
              style={{ "--lchip-bg": "rgba(74,127,168,0.18)", "--lchip-text": "#2B6C8A" } as React.CSSProperties}
            >
              {NOTES_ITEMS.slice(0, 5).map((item) => (
                // TODO post-beta: wire to notes item detail
                <div key={item.id} className={styles.laneItem}>
                  <div className={styles.laneItemHead}>
                    <div className={styles.laneItemTitle}>{item.title}</div>
                    <span className={styles.laneItemChip}>{item.chip}</span>
                  </div>
                  <div className={styles.laneItemBody}>{item.body}</div>
                </div>
              ))}
              {NOTES_ITEMS.length > 5 && (
                <div className={styles.laneItemMore}>+{NOTES_ITEMS.length - 5} more</div>
              )}
            </div>
          </>
        ) : (
          <div
            className={styles.lane}
            onClick={() => setNotesExpanded(true)}
            role="button"
            tabIndex={0}
          >
            <div className={`${styles.laneIcon} ${styles.laneIconNotes}`}>&#9678;</div>
            <div>
              <div className={styles.laneTitle}>Notes</div>
              <div className={styles.laneSub}>
                <span className={styles.sdotBlue} />
                {NOTES_ITEMS.length} items
              </div>
            </div>
            <div className={styles.chev}>&rsaquo;</div>
          </div>
        )}

        {/* Activity feed */}
        <div className={styles.sectionLabel}>
          <span>ACTIVITY</span>
          <span>LIVE</span>
        </div>
        <div className={styles.feed}>
          {FEED_ITEMS.map((item, i) => (
            <div key={i} className={styles.feedItem}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.feedAvatar}
                src={item.avatarSrc}
                alt={item.name}
                width={34}
                height={34}
              />
              <div className={styles.feedBody}>
                <div className={styles.feedName}>{item.name}</div>
                <div className={styles.feedText}>
                  {item.textBefore}
                  <a href="#">{item.linkText}</a>
                  {item.textAfter}
                </div>
                {item.actionPill && (
                  <button className={styles.actionPill}>{item.actionPill}</button>
                )}
                <div className={`${styles.feedFoot}${item.actionPill ? ` ${styles.feedFootSpaced}` : ""}`}>
                  <span className={SDOT_CLASS[item.tag === "done" ? "green" : item.tag === "open" ? "amber" : "red"]} />
                  <span className={TAG_CLASS[item.tag]}>{item.tagLabel}</span>
                  <span className={styles.feedTime}>{item.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Staff — expanded inline or minimized lane */}
        {staffExpanded && (
          <>
            <div
              className={`${styles.sectionLabel} ${styles.sectionLabelExpanded}`}
              onClick={() => setStaffExpanded(false)}
              role="button"
              tabIndex={0}
            >
              <span>STAFF &middot; {STAFF.filter((s) => !s.off).length} ACTIVE</span>
              <span className={styles.collapseHint}>
                TAP TO COLLAPSE
                <span className={styles.chevDown}>&#9662;</span>
              </span>
            </div>
            <div className={styles.staffGrid}>
              {STAFF.map((member) => (
                <Link
                  key={member.slug}
                  href={`/admin/staff/${member.slug}`}
                  className={[
                    styles.staffCard,
                    member.off ? styles.staffCardOff : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className={styles.staffCardStrip}>
                    <span>{member.roleStrip}</span>
                    <span className={styles.staffOnlineDot} />
                  </div>
                  <div className={styles.staffCardBody}>
                    <div className={styles.staffIdRow}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className={styles.staffAvatar}
                        src={member.avatarSrc}
                        alt={`${member.firstName} ${member.lastName}`}
                        width={38}
                        height={38}
                      />
                      <div className={styles.staffName}>
                        {member.firstName}
                        <br />
                        {member.lastName}
                      </div>
                    </div>
                    <div className={styles.staffRole}>{member.shiftLabel}</div>
                    <div className={styles.staffBottomRow}>
                      {member.metrics.map((m, i) => (
                        <div key={i} className={styles.staffMetric}>
                          <div className={styles.staffMetricVal}>{m.value}</div>
                          <div className={styles.staffMetricLbl}>{m.label}</div>
                        </div>
                      ))}
                      <div className={styles.staffDrillBtn} aria-hidden="true">
                        &rsaquo;
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Overview lanes */}
        <div className={styles.sectionLabel}>
          <span>OVERVIEW</span>
          <span>TAP TO EXPAND</span>
        </div>

        {!staffExpanded && (
          <div
            className={styles.lane}
            onClick={() => setStaffExpanded(true)}
            role="button"
            tabIndex={0}
          >
            <div className={`${styles.laneIcon} ${styles.laneIconStaff}`}>&#9673;</div>
            <div>
              <div className={styles.laneTitle}>Staff</div>
              <div className={styles.laneSub}>
                <span className={styles.sdotGreen} />
                4 on shift
                <span className={styles.laneSep}>&middot;</span>
                <span className={styles.sdotRed} />
                2 overdue
              </div>
            </div>
            <div className={styles.chev}>&rsaquo;</div>
          </div>
        )}

        <Link href="/admin/tasks" className={styles.lane}>
          <div className={`${styles.laneIcon} ${styles.laneIconTasks}`}>&#9776;</div>
          <div>
            <div className={styles.laneTitle}>Tasks</div>
            <div className={styles.laneSub}>Housekeeping &middot; Admin &middot; Maint</div>
          </div>
          <div className={styles.chev}>&rsaquo;</div>
        </Link>

        <Link href="/admin/tasks#maintenance" className={styles.lane}>
          <div className={`${styles.laneIcon} ${styles.laneIconMaint}`}>&#9672;</div>
          <div>
            <div className={styles.laneTitle}>Maintenance</div>
            <div className={styles.laneSub}>
              <span className={styles.sdotAmber} />
              3 open
              <span className={styles.laneSep}>&middot;</span>
              <span className={styles.sdotRed} />
              1 overdue
            </div>
          </div>
          <div className={styles.chev}>&rsaquo;</div>
        </Link>

        <div className={styles.footnote}>THE DISPATCH CO &middot; ADMIN</div>
      </div>
    </div>
  );
}
