"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchProfile, type ProfileFetchFailure } from "@/lib/profile";
import {
  resolveAuthUser,
  redirectToLoginUnlessLocalDevBypass,
} from "@/lib/dev-auth-bypass";
import ProfileLoadError from "../../../profile-load-error";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/**
 * Severity values mirror public.maintenance_severities seed in
 * docs/supabase/taxonomy_tables.sql. The DB column has a default of
 * 'Normal'. The mock UI's "Critical" 4th value was dropped — there is
 * no schema home for it. High is the top of the live ladder.
 */
type MaintSeverity = "Low" | "Normal" | "High";

const SEVERITIES: { key: MaintSeverity; label: string }[] = [
  { key: "Low",    label: "Low"    },
  { key: "Normal", label: "Normal" },
  { key: "High",   label: "High"   },
];

const SEVERITY_STRIP_LABEL: Record<MaintSeverity, string> = {
  Low:    "LOW SEVERITY",
  Normal: "NORMAL",
  High:   "HIGH SEVERITY",
};

/**
 * Live shape from public.maintenance_issues row. Mirrors lib/maintenance.ts
 * MaintenanceIssueRow but kept local since this page also reads
 * resolved_by_user_id (omitted from the helper's projection — admin-only
 * write-side column) and uses the raw author_user_id.
 */
type MaintIssueLive = {
  id: string;
  task_id: string;
  author_user_id: string;
  author_display_name: string;
  body: string | null;
  image_url: string | null;
  location: string;
  item: string;
  type: string;
  severity: string;
  room_number: string | null;
  card_type: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** "MAR 18 · 10:15 PM" — matches the existing mono short-form mock. */
function formatReportedAt(iso: string): string {
  const d = new Date(iso);
  const md = d.toLocaleDateString("en-US", {
    month:    "short",
    day:      "numeric",
    timeZone: "America/Chicago",
  }).toUpperCase();
  const t = d.toLocaleTimeString("en-US", {
    hour:     "numeric",
    minute:   "2-digit",
    hour12:   true,
    timeZone: "America/Chicago",
  });
  return `${md} · ${t}`;
}

/** "Reported 3 days ago" / "Reported 4 hours ago" / "Reported just now". */
function formatRelativeReported(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = Math.max(0, now - then);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return "Reported just now";
  if (mins < 60) return `Reported ${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Reported ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Reported ${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `Reported ${months} month${months === 1 ? "" : "s"} ago`;
}

/** "MAR 18" short date for activity log row meta. */
function formatLogTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month:    "short",
    day:      "numeric",
    timeZone: "America/Chicago",
  }).toUpperCase();
}

/** Coerce free-string severity from the DB to the typed enum. Defaults
 *  to "Normal" if the row carries an out-of-vocabulary value (shouldn't
 *  happen — FK constraint guards — but keeps the chip render honest). */
function normalizeSeverity(s: string): MaintSeverity {
  if (s === "Low" || s === "Normal" || s === "High") return s;
  return "Normal";
}

/** Synthetic stable display ID derived from the row UUID. First 8 chars,
 *  uppercase. The real schema has only `id` (UUID) — this gives staff
 *  + admin a short readable handle for verbal reference without adding
 *  a new column. */
function workOrderDisplayId(uuid: string): string {
  return uuid.slice(0, 8).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminMaintenanceDetailPage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Live row state.
  const [issue, setIssue] = useState<MaintIssueLive | null>(null);
  const [issueLoaded, setIssueLoaded] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Resolver name (resolved_by_user_id → profiles.display_name lookup).
  const [resolverName, setResolverName] = useState<string | null>(null);

  // Severity writeback in-flight + error (chip click flow).
  const [severityBusy, setSeverityBusy] = useState(false);
  const [severityError, setSeverityError] = useState<string | null>(null);

  // Mark Resolved in-flight + error.
  const [resolveBusy, setResolveBusy] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  /** Fetch (or refetch) the maintenance row + resolver name. */
  const loadIssue = useCallback(async () => {
    if (!id || id === "unknown") {
      setIssueLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from("maintenance_issues")
      .select(
        "id, task_id, author_user_id, author_display_name, body, image_url, " +
        "location, item, type, severity, room_number, card_type, " +
        "created_at, resolved_at, resolved_by_user_id",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      setIssueError(error.message);
      setIssueLoaded(true);
      return;
    }
    if (!data) {
      setIssue(null);
      setIssueLoaded(true);
      return;
    }
    const live = data as unknown as MaintIssueLive;
    setIssue(live);
    setIssueLoaded(true);
    setIssueError(null);

    // Resolve the resolver's display name (resolved_by_user_id → profiles.display_name).
    if (live.resolved_by_user_id) {
      const { data: profileRow, error: profErr } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", live.resolved_by_user_id)
        .maybeSingle();
      if (profErr) {
        console.warn("[admin-maintenance] resolver profile fetch failed:", profErr.message);
        setResolverName(null);
      } else {
        const dn = profileRow && typeof profileRow === "object"
          ? (profileRow as { display_name?: string | null }).display_name
          : null;
        setResolverName(dn?.trim() || null);
      }
    } else {
      setResolverName(null);
    }
  }, [id]);

  // Auth gate + initial fetch.
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
      if (!cancelled) {
        setAuthUserId(user.id);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void loadIssue();
  }, [ready, loadIssue]);

  /** Severity chip click — write back to the row, refetch on success. */
  async function onSeverityClick(next: MaintSeverity) {
    if (!issue) return;
    if (issue.severity === next) return;
    setSeverityBusy(true);
    setSeverityError(null);
    const { error } = await supabase
      .from("maintenance_issues")
      .update({ severity: next })
      .eq("id", issue.id);
    setSeverityBusy(false);
    if (error) {
      setSeverityError(error.message);
      return;
    }
    await loadIssue();
  }

  /** Mark Resolved click — stamp resolved_at + resolved_by_user_id. */
  async function onMarkResolved() {
    if (!issue) return;
    if (issue.resolved_at) return; // idempotent guard
    if (!authUserId) return;
    setResolveBusy(true);
    setResolveError(null);
    const { error } = await supabase
      .from("maintenance_issues")
      .update({
        resolved_at:         new Date().toISOString(),
        resolved_by_user_id: authUserId,
      })
      .eq("id", issue.id);
    setResolveBusy(false);
    if (error) {
      setResolveError(error.message);
      return;
    }
    await loadIssue();
  }

  if (profileFailure) return <ProfileLoadError failure={profileFailure} />;
  if (!ready) return null;

  if (id === "unknown") {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          Work order not found.{" "}
          <Link href="/admin">Back to admin</Link>
        </div>
      </div>
    );
  }

  if (issueError) {
    return (
      <div className={styles.page}>
        <div className="error" style={{ margin: 14 }}>{issueError}</div>
      </div>
    );
  }

  if (issueLoaded && !issue) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          Work order not found.{" "}
          <Link href="/admin">Back to admin</Link>
        </div>
      </div>
    );
  }

  if (!issue) return null;

  const severity         = normalizeSeverity(issue.severity);
  const isResolved       = Boolean(issue.resolved_at);
  const heroTitle        = `${issue.item} — ${issue.location}`;
  const heroMeta         = `${issue.type} · ${formatRelativeReported(issue.created_at)}`;
  const reportedAtPretty = formatReportedAt(issue.created_at);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Top bar */}
        <div className={styles.topbar}>
          <Link href="/admin" className={styles.navBtn} aria-label="Back">
            &lsaquo;
          </Link>
          <div className={styles.pageHead}>
            <div className={styles.pageTitle}>Work Order</div>
            <div className={styles.pageSub}>MAINTENANCE</div>
          </div>
          <button className={styles.navBtn} aria-label="More">&hellip;</button>
        </div>

        {/* Hero sage card */}
        <div className={styles.heroCard}>
          <div className={styles.heroStrip}>
            <span>
              <span className={styles.heroBadge}>WORK ORDER</span>
              {" "}{workOrderDisplayId(issue.id)}
            </span>
            <span>{SEVERITY_STRIP_LABEL[severity]}</span>
          </div>
          <div className={styles.heroBody}>
            <div className={styles.heroTitle}>{heroTitle}</div>
            <div className={styles.heroMeta}>{heroMeta}</div>
            <div className={styles.heroGrid}>
              <div>
                <div className={styles.heroCellLabel}>ROOM</div>
                <div className={styles.heroCellVal}>
                  {issue.room_number ? `RM ${issue.room_number}` : "—"}
                </div>
              </div>
              <div>
                <div className={styles.heroCellLabel}>STATUS</div>
                <div className={styles.heroCellVal}>
                  <span className={isResolved ? styles.sdotGreen : styles.sdotBlue} />
                  {isResolved ? "Resolved" : "Open"}
                </div>
              </div>
              <div>
                <div className={styles.heroCellLabel}>REPORTED BY</div>
                <div className={`${styles.heroCellVal} ${styles.heroCellValSm}`}>
                  {issue.author_display_name || "—"}
                </div>
              </div>
              <div>
                <div className={styles.heroCellLabel}>REPORTED</div>
                <div className={`${styles.heroCellVal} ${styles.heroCellValMono}`}>
                  {reportedAtPretty}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Issue / description panel */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span>ISSUE</span>
            <span className={styles.panelHeadRight}>DESCRIPTION</span>
          </div>
          <div className={styles.panelBody}>
            {issue.body && issue.body.trim().length > 0
              ? issue.body
              : "No description provided."}
          </div>
        </div>

        {/* Photo panel — renders only if image_url is set (Day 40 III.E pipeline). */}
        {issue.image_url && (
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <span>PHOTO</span>
            </div>
            <div className={styles.panelBody}>
              <a
                href={issue.image_url}
                target="_blank"
                rel="noreferrer"
                className={styles.photoLink}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.photoImg}
                  src={issue.image_url}
                  alt="Maintenance issue photo"
                />
              </a>
            </div>
          </div>
        )}

        {/* Severity panel (was Priority panel — chips persist to row.severity) */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span>SEVERITY</span>
            {severityBusy && (
              <span className={styles.panelHeadSaving}>SAVING…</span>
            )}
          </div>
          <div className={styles.panelBody}>
            <div className={styles.chipRow}>
              {SEVERITIES.map(({ key, label }) => {
                const isActive = severity === key;
                const isAlert  = isActive && key === "High";
                return (
                  <button
                    key={key}
                    className={[
                      styles.chip,
                      isActive ? styles.chipActive : null,
                      isAlert  ? styles.chipAlert  : null,
                      isActive && severityBusy ? styles.chipBusy : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => void onSeverityClick(key)}
                    disabled={severityBusy || isResolved}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {severityError && (
              <div className="error" style={{ marginTop: 10 }}>{severityError}</div>
            )}
          </div>
        </div>

        {/* Activity panel — derived rows from the row itself. Richer
            task_events linkage deferred to v2 vocabulary widening per
            STATE.md standing tabled. */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span>ACTIVITY</span>
            <span className={styles.panelHeadRight}>
              {isResolved ? "2 EVENTS" : "1 EVENT"}
            </span>
          </div>
          <div className={`${styles.panelBody} ${styles.panelBodyLog}`}>
            {isResolved && issue.resolved_at && (
              <div className={styles.logRow}>
                <span className={styles.logDot} />
                <div className={styles.logText}>
                  <b>{resolverName ?? "Admin"}</b> marked resolved
                </div>
                <div className={styles.logTime}>
                  {formatLogTimestamp(issue.resolved_at)}
                </div>
              </div>
            )}
            <div className={styles.logRow}>
              <span className={styles.logDot} />
              <div className={styles.logText}>
                <b>{issue.author_display_name || "Reporter"}</b> reported issue
              </div>
              <div className={styles.logTime}>
                {formatLogTimestamp(issue.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* CTA pair — Mark Resolved is wired; Escalate is a no-op for beta
            (live admin notification per master plan III.B is post-beta;
             beta surfaces High via activity feed sort boost only). */}
        <div className={styles.ctaPair}>
          <button className={styles.btnSecondary} disabled>
            Escalate
          </button>
          <button
            className={styles.btnPrimary}
            onClick={() => void onMarkResolved()}
            disabled={resolveBusy || isResolved}
          >
            {isResolved ? "Resolved" : resolveBusy ? "Saving…" : "Mark Resolved"}
          </button>
        </div>
        {resolveError && (
          <div className="error" style={{ marginTop: 10 }}>{resolveError}</div>
        )}

        <div className={styles.footnote}>
          THE DISPATCH CO &middot; ADMIN &middot; MAINTENANCE
        </div>
      </div>
    </div>
  );
}
