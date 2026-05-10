"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchProfile, type ProfileFetchFailure } from "@/lib/profile";
import {
  resolveAuthUser,
  redirectToLoginUnlessLocalDevBypass,
} from "@/lib/dev-auth-bypass";
import {
  MAINTENANCE_LOCATIONS,
  MAINTENANCE_TYPES,
} from "@/lib/maintenance";
import ProfileLoadError from "../../../profile-load-error";
// Import parent's CSS module — Day 51 chase #6 design choice. Resolved view
// mirrors the master-table look exactly; sharing the module keeps the two
// surfaces visually identical without duplication. CSS Modules support
// cross-file imports via relative path under Next.js.
import styles from "../page.module.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type MaintSeverity = "Low" | "Normal" | "High";

type MaintIssueLite = {
  id: string;
  location: string;
  item: string;
  type: string;
  severity: string;
  body: string | null;
  room_number: string | null;
  resolved_at: string;
};

const SEV_RANK: Record<string, number> = { High: 0, Normal: 1, Low: 2 };

const ALL_FILTER = "All" as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function excerpt(s: string | null | undefined, max = 70): string {
  if (!s) return "";
  const trimmed = s.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function normalizeSeverity(s: string): MaintSeverity {
  if (s === "Low" || s === "Normal" || s === "High") return s;
  return "Normal";
}

function formatRowDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-US", {
      month:    "short",
      day:      "numeric",
      timeZone: "America/Chicago",
    })
    .toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Page — /admin/maintenance/resolved                                  */
/* Mirrors /admin/maintenance master-table shape with resolved_at      */
/* IS NOT NULL filter and resolved_at desc ordering. Day 51 chase #6   */
/* closes the standing-tabled "no recently-resolved index" item.       */
/* ------------------------------------------------------------------ */

export default function AdminMaintenanceResolvedPage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);

  const [locationFilter, setLocationFilter] = useState<string>(ALL_FILTER);
  const [typeFilter,     setTypeFilter]     = useState<string>(ALL_FILTER);

  const [rows, setRows]     = useState<MaintIssueLite[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Auth gate — clones the [id]/page.tsx + page.tsx pattern.
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

  /**
   * Load (or reload) RESOLVED issues filtered by location/type. Always
   * `.not("resolved_at", "is", null)` per Day 51 chase #6 spec — flip of
   * the master-table page's open-only filter. Order desc by resolved_at
   * so the most-recently-resolved surface first. No index alignment for
   * resolved_at desc today (the existing partial open_idx is for the
   * inverse case); for beta scale this is fine since the resolved set
   * is naturally bounded.
   */
  const loadRows = useCallback(async () => {
    setLoaded(false);
    setError(null);

    let query = supabase
      .from("maintenance_issues")
      .select(
        "id, location, item, type, severity, body, room_number, resolved_at",
      )
      .not("resolved_at", "is", null)
      .order("resolved_at", { ascending: false })
      .limit(100);

    if (locationFilter !== ALL_FILTER) {
      query = query.eq("location", locationFilter);
    }
    if (typeFilter !== ALL_FILTER) {
      query = query.eq("type", typeFilter);
    }

    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
      setRows([]);
      setLoaded(true);
      return;
    }
    const live = (data ?? []) as unknown as MaintIssueLite[];
    // Severity desc client-side; resolved_at desc tiebreak preserved.
    const sorted = [...live].sort(
      (a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9),
    );
    setRows(sorted);
    setLoaded(true);
  }, [locationFilter, typeFilter]);

  useEffect(() => {
    if (!ready) return;
    void loadRows();
  }, [ready, loadRows]);

  if (profileFailure) return <ProfileLoadError failure={profileFailure} />;
  if (!ready) return null;

  const filtered =
    locationFilter !== ALL_FILTER || typeFilter !== ALL_FILTER;
  const emptyMsg = filtered
    ? "No resolved issues match this filter."
    : "No resolved maintenance issues yet.";

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Top bar — back arrow returns to /admin/maintenance (open list) */}
        <div className={styles.topbar}>
          <Link href="/admin/maintenance" className={styles.navBtn} aria-label="Back to open issues">
            &lsaquo;
          </Link>
          <div className={styles.pageHead}>
            <div className={styles.pageTitle}>Maintenance</div>
            <div className={styles.pageSub}>RESOLVED ISSUES</div>
          </div>
          <span className={styles.navBtnSpacer} aria-hidden="true" />
        </div>

        {/* Hero strip — sage, count + dimensions */}
        <div className={styles.heroCard}>
          <div className={styles.heroStrip}>
            <span>
              <span className={styles.heroBadge}>RESOLVED</span>
              {" "}
              {loaded ? rows.length : "—"}
            </span>
            <span>BY LOCATION · BY TYPE</span>
          </div>
        </div>

        {/* Filter panel — same shape as open-list page */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span>FILTERS</span>
            {loaded && filtered && (
              <button
                className={styles.clearBtn}
                onClick={() => {
                  setLocationFilter(ALL_FILTER);
                  setTypeFilter(ALL_FILTER);
                }}
              >
                CLEAR
              </button>
            )}
          </div>
          <div className={styles.filters}>
            <label className={styles.filterLabel}>
              <span className={styles.filterLabelText}>LOCATION</span>
              <select
                className={styles.filterSelect}
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                <option value={ALL_FILTER}>All locations</option>
                {MAINTENANCE_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </label>
            <label className={styles.filterLabel}>
              <span className={styles.filterLabelText}>TYPE</span>
              <select
                className={styles.filterSelect}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value={ALL_FILTER}>All types</option>
                {MAINTENANCE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && (
          <div className="error" style={{ margin: "0 0 12px" }}>{error}</div>
        )}

        {/* Row list */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span>RESOLVED ISSUES</span>
            <span className={styles.panelHeadRight}>
              {loaded ? `${rows.length} SHOWN` : "LOADING…"}
            </span>
          </div>
          <div className={styles.rowList}>
            {!loaded && (
              <div className={styles.empty}>Loading…</div>
            )}
            {loaded && rows.length === 0 && (
              <div className={styles.empty}>{emptyMsg}</div>
            )}
            {loaded &&
              rows.map((r) => {
                const sev = normalizeSeverity(r.severity);
                const meta = [
                  r.type,
                  r.room_number ? `RM ${r.room_number}` : null,
                  `RESOLVED ${formatRowDate(r.resolved_at)}`,
                ]
                  .filter(Boolean)
                  .join(" · ");
                const body = excerpt(r.body);
                return (
                  <Link
                    key={r.id}
                    href={`/admin/maintenance/${r.id}`}
                    className={styles.rowLink}
                  >
                    <div className={styles.row}>
                      <div className={styles.rowMain}>
                        <div className={styles.rowTitle}>
                          {r.location} — {r.item}
                        </div>
                        <div className={styles.rowMeta}>{meta}</div>
                        {body && (
                          <div className={styles.rowBody}>{body}</div>
                        )}
                      </div>
                      <span
                        className={[
                          styles.rowChip,
                          sev === "High"   ? styles.rowChipHigh   : null,
                          sev === "Normal" ? styles.rowChipNormal : null,
                          sev === "Low"    ? styles.rowChipLow    : null,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {sev.toUpperCase()}
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>

        <div className={styles.footnote}>
          THE DISPATCH CO &middot; ADMIN &middot; MAINTENANCE &middot; RESOLVED
        </div>
      </div>
    </div>
  );
}
