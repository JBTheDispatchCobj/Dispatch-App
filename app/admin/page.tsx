"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { STAFF } from "./staff/data";
import { fetchProfile, shouldUseManagerHome, type ProfileFetchFailure } from "@/lib/profile";
import {
  resolveAuthUser,
  redirectToLoginUnlessLocalDevBypass,
} from "@/lib/dev-auth-bypass";
import ProfileLoadError from "../profile-load-error";
import AddTaskModal from "@/components/admin/AddTaskModal";
import NotificationCenter from "@/components/admin/NotificationCenter";
import RolloverQuickAction from "@/components/admin/RolloverQuickAction";
import {
  getCurrentWeather,
  getOnShiftCount,
  getTownEventsToday,
  type EventBrief,
  type WeatherBrief,
} from "@/lib/admin-brief";
import { getTodaysReservationCounts } from "@/lib/reservations";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/*                                                                      */
/* NC Region 3 (Day 55): the Watchlist / Scheduling / Critical / Notes  */
/* lanes + the Activity Feed were retired — the Notification Center now  */
/* sits under the Daily Brief and carries all of that. The only surviving*/
/* lane fetcher is the watchlist count, still used by the Maintenance    */
/* OVERVIEW nav lane subtitle.                                           */
/* ------------------------------------------------------------------ */

/** Open (unresolved) maintenance issue count for the Maintenance nav lane. */
async function fetchOpenMaintenanceCount(): Promise<number> {
  const { count, error } = await supabase
    .from("maintenance_issues")
    .select("id", { count: "exact", head: true })
    .is("resolved_at", null);
  if (error) {
    console.warn("[admin-home] open maintenance count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminHomePage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [staffExpanded, setStaffExpanded] = useState(false);

  // Maintenance nav lane count.
  const [openMaintCount, setOpenMaintCount] = useState<number>(0);

  // Day 54 chase #6 — Daily Brief 2x3 grid state.
  const [briefArrivals, setBriefArrivals]     = useState<number>(0);
  const [briefDepartures, setBriefDepartures] = useState<number>(0);
  const [briefOnShift, setBriefOnShift]       = useState<number>(0);
  const [briefWeather, setBriefWeather]       = useState<WeatherBrief | null>(null);
  const [briefEvents, setBriefEvents]         = useState<EventBrief | null>(null);

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
      // Accept manager-likes (admin OR manager), not admin-only. The "/" router
      // sends manager-likes here; rejecting non-admins used to bounce them back
      // to "/", which re-sent them here — the first-login blink loop. Staff are
      // still sent home to /staff.
      if (!shouldUseManagerHome(profileResult.profile)) {
        window.location.replace("/");
        return;
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Daily Brief + Maintenance count fetches once auth resolves.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void (async () => {
      const [maintCount, reservations, onShift, weather, events] = await Promise.all([
        fetchOpenMaintenanceCount(),
        getTodaysReservationCounts().catch((err) => {
          console.warn("[admin-home] reservation counts fetch failed:", err);
          return { arrivals: 0, departures: 0, stayovers: 0 };
        }),
        getOnShiftCount(supabase),
        getCurrentWeather(),
        getTownEventsToday(),
      ]);
      if (cancelled) return;
      setOpenMaintCount(maintCount);
      setBriefArrivals(reservations.arrivals);
      setBriefDepartures(reservations.departures);
      setBriefOnShift(onShift);
      setBriefWeather(weather);
      setBriefEvents(events);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

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
          <button className={styles.addBtn} aria-label="Add task" onClick={() => setModalOpen(true)}>+</button>
        </div>

        {/* Daily Brief — Day 54 chase #6: 2x3 grid replacing the old
            headline + 3-stat row. Top row sourced from ResNexus + clock-in;
            bottom row from Google stubs (weather, events) + a Table tile
            that navigates to a placeholder /admin/table route. */}
        <div className={styles.brief}>
          <div className={styles.briefHead}>
            <span>DAILY BRIEF</span>
            <span>PROPERTY</span>
          </div>
          <div className={styles.briefGrid}>
            {/* Row 1 — Arrivals / Departures / On Shift */}
            <div className={styles.briefCell}>
              <div className={styles.statLabel}>ARRIVALS</div>
              <div className={styles.statVal}>{briefArrivals}</div>
            </div>
            <div className={styles.briefCell}>
              <div className={styles.statLabel}>DEPARTURES</div>
              <div className={styles.statVal}>{briefDepartures}</div>
            </div>
            <div className={styles.briefCell}>
              <div className={styles.statLabel}>ON SHIFT</div>
              <div className={styles.statVal}>{briefOnShift}</div>
            </div>

            <div className={styles.briefRowSep} />

            {/* Row 2 — Weather / Events / Table */}
            <div className={styles.briefCell}>
              <div className={styles.statLabel}>WEATHER</div>
              <div className={styles.briefCellText}>
                {briefWeather?.temp_f !== null && briefWeather?.temp_f !== undefined ? (
                  <>
                    {briefWeather.temp_f}&deg;F
                    {briefWeather.condition && (
                      <>
                        <br />
                        {briefWeather.condition}
                      </>
                    )}
                  </>
                ) : (
                  <span className={styles.briefCellMuted}>&mdash;</span>
                )}
              </div>
            </div>
            <div className={styles.briefCell}>
              <div className={styles.statLabel}>EVENTS</div>
              <div className={styles.briefCellText}>
                {briefEvents?.headline ? (
                  <>
                    {briefEvents.headline}
                    {briefEvents.venue && (
                      <>
                        <br />
                        {briefEvents.venue}
                      </>
                    )}
                  </>
                ) : (
                  <span className={styles.briefCellMuted}>No events</span>
                )}
              </div>
            </div>
            <Link href="/admin/table" className={`${styles.briefCell} ${styles.briefCellTap}`}>
              <div className={styles.statLabel}>TABLE</div>
              <svg
                className={styles.briefTileIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Rollover quick action — Day 57 (Jennifer QA §3 #31). Lists today's
            open departures; rolling one hides it from Angie's staff list. */}
        <RolloverQuickAction />

        {/* Notification Center — Day 55, NC Region 3. Lifted directly under the
            Daily Brief; replaces the retired Watchlist / Scheduling / Critical /
            Notes lanes + Activity Feed (see design/admin-home-locked.html). */}
        <NotificationCenter />

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

        <Link href="/admin/maintenance" className={styles.lane}>
          <div className={`${styles.laneIcon} ${styles.laneIconMaint}`}>&#9672;</div>
          <div>
            <div className={styles.laneTitle}>Maintenance</div>
            <div className={styles.laneSub}>
              <span className={styles.sdotAmber} />
              {openMaintCount} open
            </div>
          </div>
          <div className={styles.chev}>&rsaquo;</div>
        </Link>

        <div className={styles.footnote}>THE DISPATCH CO &middot; ADMIN</div>
      </div>
      <AddTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setModalOpen(false)}
      />
    </div>
  );
}
